"""Fotos enviadas pela gestão (produtos e logo), guardadas no banco e servidas em /api/img/<key>."""
import base64
import binascii
import secrets

from fastapi import HTTPException
from prisma import Base64

from .db import db

MAX_BYTES = 800 * 1024  # o navegador já reduz para ~100 KB; isto é só o teto
URL_PREFIX = "/api/img/"

# Assinatura dos primeiros bytes: não confiamos no tipo que o navegador diz.
SIGNATURES = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
)


def sniff(data: bytes) -> str | None:
    for magic, kind in SIGNATURES:
        if data.startswith(magic):
            return kind
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def save_image(tenant_id: int, data_base64: str) -> dict:
    """Recebe a foto em base64 (com ou sem o prefixo data:...;base64,) e devolve o endereço dela."""
    raw = data_base64.split(",", 1)[1] if data_base64.startswith("data:") else data_base64
    try:
        data = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "Arquivo de imagem inválido.")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Foto grande demais. Use uma imagem de até 800 KB.")
    kind = sniff(data)
    if kind is None:
        raise HTTPException(400, "Envie uma foto JPG, PNG ou WebP.")
    key = secrets.token_urlsafe(12)
    await db.image.create(
        data={"key": key, "tenantId": tenant_id, "contentType": kind, "data": Base64.encode(data), "size": len(data)}
    )
    return {"url": URL_PREFIX + key}
