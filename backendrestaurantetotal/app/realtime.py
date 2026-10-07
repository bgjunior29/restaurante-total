"""Broadcast via WebSocket separado por restaurante: cada tenant tem a sua "sala".

Cada conexão aberta ocupa memória até fechar. Para um script não abrir milhares, há um teto por IP e um
teto geral. O teto por IP é folgado porque no Wi-Fi do restaurante todos os celulares saem pelo mesmo IP.
"""
import asyncio
import json
from collections import Counter, defaultdict

from fastapi import WebSocket

MAX_PER_IP = 50  # conexões abertas do mesmo IP (equipe + clientes acompanhando pedidos no Wi-Fi da casa)
MAX_TOTAL = 2000  # conexões abertas no servidor inteiro
CLOSE_LIMIT = 4429  # código de fechamento que o site entende como "espere antes de reconectar"


class Hub:
    def __init__(self) -> None:
        self.rooms: dict[int, set[WebSocket]] = defaultdict(set)
        self.per_ip: Counter = Counter()
        self.ip_of: dict[WebSocket, str] = {}

    async def connect(self, tenant_id: int, ws: WebSocket, ip: str) -> bool:
        """Aceita a conexão; passou do teto, fecha com CLOSE_LIMIT e devolve False."""
        await ws.accept()
        if self.per_ip[ip] >= MAX_PER_IP or len(self.ip_of) >= MAX_TOTAL:
            await ws.close(code=CLOSE_LIMIT)
            return False
        self.rooms[tenant_id].add(ws)
        self.per_ip[ip] += 1
        self.ip_of[ws] = ip
        return True

    def disconnect(self, tenant_id: int, ws: WebSocket) -> None:
        room = self.rooms.get(tenant_id)
        if room is not None:
            room.discard(ws)
            if not room:
                self.rooms.pop(tenant_id, None)
        ip = self.ip_of.pop(ws, None)
        if ip is not None:
            self.per_ip[ip] -= 1
            if self.per_ip[ip] <= 0:
                del self.per_ip[ip]

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
