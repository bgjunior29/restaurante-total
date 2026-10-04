"""Controle de estoque simples por produto (ideia do InventoryManager do sistema integrado).

Produto com stockQty = None não tem controle. Com controle:
- o pedido baixa o estoque na hora (dentro da mesma transação);
- chegou a zero, o produto sai do cardápio sozinho;
- pedido cancelado devolve as quantidades.
"""
from collections import Counter

from fastapi import HTTPException


def quantities(items: list[dict]) -> Counter:
    qty: Counter = Counter()
    for i in items:
        if i.get("productId"):
            qty[i["productId"]] += i["quantity"]
    return qty


async def reserve(tx, products: dict, items: list[dict]) -> list[int]:
    """Baixa o estoque dos itens. Devolve os ids de produtos que ficaram em alerta (estoque baixo)."""
    low = []
    for pid, q in quantities(items).items():
        p = products[pid]
        if p.stockQty is None:
            continue
        # updateMany com condição garante que dois pedidos simultâneos não vendam a mesma última unidade.
        done = await tx.product.update_many(where={"id": pid, "stockQty": {"gte": q}}, data={"stockQty": {"decrement": q}})
        if done == 0:
            raise HTTPException(409, f"\"{p.name}\" acabou de esgotar ou não tem essa quantidade. Atualize o cardápio.")
        remaining = p.stockQty - q
        if remaining <= 0:
            await tx.product.update(where={"id": pid}, data={"available": False})
        if remaining <= p.lowStockAt:
            low.append(pid)
    return low


async def release(db, items) -> None:
    """Devolve ao estoque os itens de um pedido cancelado.

    Produto que tinha saído do cardápio por ter zerado volta sozinho. Produto desligado à mão pelo
    dono (com estoque sobrando) continua desligado.
    """
    qty: Counter = Counter()
    for i in items:
        if i.productId:
            qty[i.productId] += i.quantity
    for pid, q in qty.items():
        p = await db.product.find_unique(where={"id": pid})
        if p is None or p.stockQty is None:
            continue
        data: dict = {"stockQty": {"increment": q}}
        if not p.available and p.stockQty <= 0:
            data["available"] = True
        await db.product.update(where={"id": pid}, data=data)
