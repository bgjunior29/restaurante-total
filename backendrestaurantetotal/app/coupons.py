"""Cupons de desconto (regras trazidas do sistema integrado de delivery).

- Código sempre em maiúsculas, único por restaurante.
- Só contam como "uso" os pedidos não cancelados: pedido cancelado não queima o cupom.
- O desconto nunca passa do subtotal dos produtos (taxa de entrega não entra).
"""
from datetime import datetime, timezone

from fastapi import HTTPException

from .db import db


def normalize_code(code: str) -> str:
    return (code or "").strip().upper()


def discount_for(coupon, subtotal_cents: int) -> int:
    if coupon.kind == "PERCENT":
        raw = subtotal_cents * coupon.value // 100
    else:
        raw = coupon.value
    return max(0, min(subtotal_cents, raw))


async def count_uses(tenant_id: int, code: str) -> int:
    return await db.order.count(where={"tenantId": tenant_id, "couponCode": code, "status": {"not": "CANCELADO"}})


async def validate_coupon(tenant_id: int, code: str, subtotal_cents: int):
    """Devolve o cupom válido ou lança 400/404 com a mensagem certa para o cliente."""
    code = normalize_code(code)
    if not code:
        raise HTTPException(400, "Informe um cupom.")
    coupon = await db.coupon.find_first(where={"tenantId": tenant_id, "code": code})
    if coupon is None or not coupon.active:
        raise HTTPException(404, "Cupom inválido ou expirado.")
    if coupon.validUntil:
        until = coupon.validUntil if coupon.validUntil.tzinfo else coupon.validUntil.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > until:
            raise HTTPException(400, "Este cupom expirou.")
    if subtotal_cents < coupon.minOrderCents:
        reais = f"{coupon.minOrderCents / 100:.2f}".replace(".", ",")
        raise HTTPException(400, f"Este cupom exige pedido mínimo de R$ {reais}.")
    if coupon.maxUses is not None and await count_uses(tenant_id, code) >= coupon.maxUses:
        raise HTTPException(400, "Este cupom atingiu o limite de usos.")
    return coupon
