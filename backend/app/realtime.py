"""Broadcast via WebSocket separado por restaurante: cada tenant tem a sua "sala"."""
import asyncio
import json
from collections import defaultdict

from fastapi import WebSocket


class Hub:
    def __init__(self) -> None:
        self.rooms: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, tenant_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self.rooms[tenant_id].add(ws)

    def disconnect(self, tenant_id: int, ws: WebSocket) -> None:
        room = self.rooms.get(tenant_id)
        if room is not None:
            room.discard(ws)
            if not room:
                self.rooms.pop(tenant_id, None)

    async def broadcast(self, tenant_id: int, event: str, data: dict | None = None) -> None:
        message = json.dumps({"event": event, "data": data or {}})
        dead = []
        for ws in list(self.rooms.get(tenant_id, ())):
            try:
                await asyncio.wait_for(ws.send_text(message), timeout=2)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(tenant_id, ws)


hub = Hub()
