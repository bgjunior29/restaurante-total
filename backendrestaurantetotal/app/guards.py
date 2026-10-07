"""Proteções na entrada da API, antes de qualquer rota.

- OriginGuard: com ORIGIN_SECRET definido, só aceita /api/* vindo pela Vercel (que coloca o segredo no
  cabeçalho). Quem chama o Render direto poderia inventar o próprio IP e escapar dos limites de tentativas.
- BodyLimit: recusa corpo de requisição grande demais antes de ler tudo na memória.
"""
import json

from fastapi import HTTPException
from starlette.requests import HTTPConnection

from .ratelimit import from_vercel, origin_secret

MAX_BODY_BYTES = 2 * 1024 * 1024  # a maior requisição legítima é a foto (~1,2 MB em base64)
OPEN_PATHS = {"/api/health"}  # health check do Render e o ping que mantém a API acordada


async def _reject(send, status: int, detail: str) -> None:
    body = json.dumps({"detail": detail}).encode()
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
        }
    )
    await send({"type": "http.response.body", "body": body})


class OriginGuard:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and origin_secret() and scope["path"].startswith("/api/") and scope["path"] not in OPEN_PATHS:
            if not from_vercel(HTTPConnection(scope)):
                return await _reject(send, 403, "Acesse pelo site do restaurante.")
        await self.app(scope, receive, send)


class BodyLimit:
    def __init__(self, app, max_bytes: int = MAX_BODY_BYTES):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        message = f"Requisição grande demais (máximo de {self.max_bytes // (1024 * 1024)} MB)."
        length = dict(scope["headers"]).get(b"content-length")
        if length is not None:
            try:
                declared = int(length)
            except ValueError:
                return await _reject(send, 400, "Requisição inválida.")
            if declared > self.max_bytes:
                return await _reject(send, 413, message)

        # Sem Content-Length (envio em partes): conta o que chega e para ao passar do teto.
        received = 0

        async def limited():
            nonlocal received
            msg = await receive()
            if msg["type"] == "http.request":
                received += len(msg.get("body", b""))
                if received > self.max_bytes:
                    raise HTTPException(413, message)
            return msg

        await self.app(scope, limited, send)
