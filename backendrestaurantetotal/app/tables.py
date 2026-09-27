"""Trava de mesa: cada mesa tem uma chave secreta impressa no QR code.

Só quem escaneou o QR da mesa consegue pedir nela ou chamar o garçom para ela: digitar outro número
no endereço não basta. E um celular com conta aberta numa mesa só abre conta em outra depois que a
equipe fecha a primeira.
"""
import secrets

from fastapi import HTTPException

from .db import db

OPEN_SESSION = ["OPEN", "BILL_REQUESTED"]


def new_qr_key() -> str:
    return secrets.token_urlsafe(9)  # 12 caracteres: curto para o QR, impossível de adivinhar


async def ensure_qr_keys() -> None:
    """Mesas criadas antes da trava ficam sem chave: gera uma para cada (os QRs precisam ser reimpressos)."""
    for t in await db.table.find_many(where={"qrKey": ""}):
        await db.table.update(where={"id": t.id}, data={"qrKey": new_qr_key()})


async def table_from_qr(tenant_id: int, number: int | None, key: str):
    """A mesa do QR, conferindo a chave. Mesa inexistente, inativa ou chave errada = recusa."""
    table = await db.table.find_first(where={"tenantId": tenant_id, "number": number or 0})
    if table is None or not table.active:
        raise HTTPException(400, "Mesa inválida. Escaneie o QR code da sua mesa.")
    if not key or not secrets.compare_digest(key, table.qrKey):
        raise HTTPException(403, "Este QR code não vale para esta mesa. Escaneie o QR code que está na sua mesa.")
    return table


async def ensure_not_seated_elsewhere(tenant_id: int, table, session_token: str | None) -> None:
    """Celular com conta aberta em outra mesa não pede nesta até a equipe fechar a conta de lá."""
    if not session_token:
        return
    other = await db.tablesession.find_first(
        where={"token": session_token, "tenantId": tenant_id, "status": {"in": OPEN_SESSION}, "tableId": {"not": table.id}},
        include={"table": True},
    )
    if other:
        label = other.table.label if other.table else "outra mesa"
        raise HTTPException(
            409, f"Você está com a conta aberta na {label}. Para pedir em outra mesa, a conta precisa ser fechada primeiro."
        )
