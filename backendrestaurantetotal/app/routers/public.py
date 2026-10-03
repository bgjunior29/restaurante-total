"""Rotas abertas do cliente (QR code da mesa, retirada e delivery): /api/t/{slug}/..."""
import asyncio
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request

from .. import cache, ratelimit, stock
from ..bill import SESSION_INCLUDE, bill_out
from ..coupons import discount_for, normalize_code, validate_coupon
from ..db import db
from ..insights import recent_pairs
from ..realtime import hub
from ..schemas import CallIn, CouponCheckIn, OrderIn, ReviewIn
from ..serializers import option_group_out, order_out, tenant_public
from ..tables import ensure_not_seated_elsewhere, table_from_qr
from ..tenancy import active_tenant, get_tenant

router = APIRouter(prefix="/api/t/{slug}", tags=["público"])

ORDER_INCLUDE = {"items": True, "table": True, "review": True}
OPEN_SESSION = ["OPEN", "BILL_REQUESTED"]
ORDERS_PER_IP = 40  # pedidos a cada 10 min, por restaurante
CALLS_PER_IP = 30  # chamados a cada 5 min, por restaurante


@router.get("/info")
async def info(tenant=Depends(get_tenant)):
    """Identidade do restaurante. Responde mesmo suspenso, para a tela mostrar o aviso certo."""
    return tenant_public(tenant)


@router.get("/menu")
async def menu(tenant=Depends(active_tenant)):
    cached = cache.get_menu(tenant.id)
    if cached is not None:
        return cached
    # As três leituras não dependem uma da outra: vão ao banco ao mesmo tempo.
    categories, payments, pairs = await asyncio.gather(db.category.find_many(
        where={"tenantId": tenant.id},
        order={"sortOrder": "asc"},
        include={
            "products": {
                "where": {"available": True},
                "order_by": {"sortOrder": "asc"},
                "include": {"optionGroups": {"include": {"group": {"include": {"options": True}}}}},
            }
        },
    ), db.paymentmethod.find_many(
        where={"tenantId": tenant.id, "active": True}, order={"sortOrder": "asc"}
    ), recent_pairs(tenant.id))

    def product(p) -> dict:
        groups = sorted((link.group for link in p.optionGroups or []), key=lambda g: (g.sortOrder, g.id))
        return {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "imageUrl": p.imageUrl,
            "priceCents": p.priceCents,
            # Mostra "últimas unidades" sem revelar o estoque exato.
            "lastUnits": p.stockQty is not None and p.stockQty <= p.lowStockAt,
            "optionGroups": [option_group_out(g, only_available=True) for g in groups],
            "pairsWith": pairs.get(p.id, []),
        }

    return cache.put_menu(tenant.id, {
        **tenant_public(tenant),
        "pixKey": tenant.pixKey,
        "categories": [
            {"id": c.id, "name": c.name, "products": [product(p) for p in c.products or []]} for c in categories
        ],
        "paymentMethods": [{"id": m.id, "name": m.name, "kind": m.kind} for m in payments],
    })


@router.get("/table/{number}")
async def table_info(number: int, k: str = "", session: str = "", tenant=Depends(active_tenant)):
    """Confere o QR escaneado (número + chave) e diz se este celular pode pedir nesta mesa."""
    table = await table_from_qr(tenant.id, number, k)
    await ensure_not_seated_elsewhere(tenant.id, table, session or None)
    return {"number": table.number, "label": table.label}


async def build_items(tenant_id: int, body: OrderIn) -> tuple[list[dict], dict]:
    """Recalcula tudo no servidor: preço, adicionais válidos e regras de mínimo/máximo."""
    ids = list({i.productId for i in body.items})
    products = await db.product.find_many(
        where={"id": {"in": ids}, "tenantId": tenant_id},
        include={"category": True, "optionGroups": {"include": {"group": {"include": {"options": True}}}}},
    )
    found = {p.id: p for p in products}

    items = []
    for item in body.items:
        p = found.get(item.productId)
        if p is None or not p.available:
            raise HTTPException(400, "Um dos itens não está mais disponível. Atualize o cardápio.")

        groups = [link.group for link in p.optionGroups or []]
        option_index = {o.id: (g, o) for g in groups for o in g.options or []}
        chosen = []
        for oid in dict.fromkeys(item.optionIds):  # remove repetidos mantendo a ordem
            pair = option_index.get(oid)
            if pair is None or not pair[1].available:
                raise HTTPException(400, f"Uma opção de \"{p.name}\" não está mais disponível. Atualize o cardápio.")
            chosen.append(pair)

        for g in groups:
            count = sum(1 for cg, _ in chosen if cg.id == g.id)
            if count < g.minSelect:
                raise HTTPException(400, f"Escolha {g.name.lower()} para \"{p.name}\".")
            if count > g.maxSelect:
                raise HTTPException(400, f"\"{p.name}\": no máximo {g.maxSelect} em {g.name.lower()}.")

        chosen.sort(key=lambda pair: (pair[0].sortOrder, pair[0].id, pair[1].sortOrder, pair[1].id))
        items.append(
            {
                "productId": p.id,
                "name": p.name,
                "details": ", ".join(o.name for _, o in chosen),
                "station": p.category.station if p.category else "COZINHA",
                "unitPriceCents": p.priceCents + sum(o.priceCents for _, o in chosen),
                "quantity": item.quantity,
            }
        )
    return items, found


def delivery_fee(tenant, subtotal: int) -> int:
    if tenant.freeDeliveryAboveCents and subtotal >= tenant.freeDeliveryAboveCents:
        return 0
    return tenant.deliveryFeeCents


@router.post("/coupons/check")
async def check_coupon(body: CouponCheckIn, tenant=Depends(active_tenant)):
    coupon = await validate_coupon(tenant.id, body.code, body.subtotalCents)
    return {
        "code": coupon.code,
        "kind": coupon.kind,
        "value": coupon.value,
        "discountCents": discount_for(coupon, body.subtotalCents),
    }


async def open_session_for(tx, tenant_id: int, table, token: str | None):
    """Conta aberta da mesa: a deste celular, a de quem já está na mesa ou uma nova."""
    session = None
    if token:
        session = await tx.tablesession.find_first(
            where={"token": token, "tenantId": tenant_id, "tableId": table.id, "status": {"in": OPEN_SESSION}}
        )
    if session is None:
        session = await tx.tablesession.find_first(
            where={"tenantId": tenant_id, "tableId": table.id, "status": {"in": OPEN_SESSION}},
            order={"openedAt": "desc"},
        )
    if session is None:
        session = await tx.tablesession.create(
            data={"tenantId": tenant_id, "tableId": table.id, "token": secrets.token_urlsafe(16)}
        )
    elif session.status == "BILL_REQUESTED":
        # Pediu a conta e resolveu pedir mais: a conta volta a ficar aberta.
        session = await tx.tablesession.update(where={"id": session.id}, data={"status": "OPEN"})
    return session


@router.post("/orders", status_code=201)
async def create_order(body: OrderIn, request: Request, tenant=Depends(active_tenant)):
    # Generoso de propósito: no Wi-Fi do restaurante todas as mesas saem pelo mesmo IP.
    ratelimit.hit(f"order:{tenant.id}", request, ORDERS_PER_IP, 10 * 60, "Muitos pedidos seguidos deste aparelho. Aguarde alguns minutos.")
    if not tenant.ordersOpen:
        raise HTTPException(409, "O restaurante não está recebendo pedidos agora.")
    if not body.items:
        raise HTTPException(400, "Adicione ao menos um item ao pedido.")

    name = body.customerName.strip()
    phone = body.customerPhone.strip()
    table = None
    payment = None

    if body.type == "MESA":
        table = await table_from_qr(tenant.id, body.tableNumber, body.tableKey)
        await ensure_not_seated_elsewhere(tenant.id, table, body.sessionToken)
    else:
        if body.type == "RETIRADA" and not tenant.pickupEnabled:
            raise HTTPException(409, "No momento não estamos fazendo pedidos para retirada.")
        if body.type == "DELIVERY" and not tenant.deliveryEnabled:
            raise HTTPException(409, "No momento não estamos fazendo entregas.")
        if not name or len("".join(c for c in phone if c.isdigit())) < 10:
            raise HTTPException(400, "Informe seu nome e um telefone com DDD para avisarmos sobre o pedido.")
        if body.type == "DELIVERY" and len(body.address.strip()) < 8:
            raise HTTPException(400, "Informe o endereço completo para a entrega.")
        payment = await db.paymentmethod.find_first(where={"id": body.paymentMethodId or 0, "tenantId": tenant.id})
        if payment is None or not payment.active:
            raise HTTPException(400, "Forma de pagamento indisponível. Escolha outra.")

    items, products = await build_items(tenant.id, body)
    subtotal = sum(i["unitPriceCents"] * i["quantity"] for i in items)

    discount = 0
    code = normalize_code(body.couponCode)
    if code:
        coupon = await validate_coupon(tenant.id, code, subtotal)
        discount = discount_for(coupon, subtotal)

    fee = 0
    if body.type == "DELIVERY":
        if subtotal < tenant.minDeliveryCents:
            reais = f"{tenant.minDeliveryCents / 100:.2f}".replace(".", ",")
            raise HTTPException(400, f"O pedido mínimo para delivery é R$ {reais}.")
        fee = delivery_fee(tenant, subtotal)
    total = subtotal - discount + fee

    change_for = body.changeForCents if payment and payment.kind == "CASH" else 0
    if change_for and change_for < total:
        raise HTTPException(400, "O troco precisa ser para um valor maior que o total.")

    async with db.tx() as tx:
        low = await stock.reserve(tx, products, items)
        session = await open_session_for(tx, tenant.id, table, body.sessionToken) if table else None
        # Numeração por restaurante, sem repetir mesmo com pedidos simultâneos.
        seq = await tx.tenant.update(where={"id": tenant.id}, data={"orderSeq": {"increment": 1}})
        order = await tx.order.create(
            data={
                "tenantId": tenant.id,
                "code": f"{seq.orderPrefix}-{seq.orderSeq}",
                "token": secrets.token_urlsafe(16),
                "type": body.type,
                "tableId": table.id if table else None,
                "sessionId": session.id if session else None,
                "customerName": name,
                "customerPhone": phone if body.type != "MESA" else "",
                "address": body.address.strip() if body.type == "DELIVERY" else "",
                "addressRef": body.addressRef.strip() if body.type == "DELIVERY" else "",
                "notes": body.notes.strip(),
                "paymentMethod": payment.name if payment else "",
                "changeForCents": change_for,
                "couponCode": code if discount else "",
                "subtotalCents": subtotal,
                "discountCents": discount,
                "deliveryFeeCents": fee,
                "totalCents": total,
                "items": {"create": items},
            },
            include=ORDER_INCLUDE,
        )

    if any(products[i["productId"]].stockQty is not None for i in items):
        cache.invalidate(tenant.id)  # estoque mudou: o cardápio precisa mostrar "últimas unidades"/esgotado
    where = table.label if table else ("Delivery" if body.type == "DELIVERY" else "Retirada")
    await hub.broadcast(tenant.id, "order_created", {"id": order.id, "code": order.code, "where": where, "type": body.type})
    if low:
        await hub.broadcast(tenant.id, "stock_low", {"products": [products[pid].name for pid in low]})
    return {**order_out(order, public=True), "token": order.token, "sessionToken": session.token if session else None}


@router.get("/track/{token}")
async def track(token: str, tenant=Depends(get_tenant)):
    order = await db.order.find_unique(where={"token": token}, include=ORDER_INCLUDE)
    if order is None or order.tenantId != tenant.id:
        raise HTTPException(404, "Pedido não encontrado.")
    return {**order_out(order, public=True), "estimate": estimate(tenant, order)}


def estimate(tenant, order) -> int | None:
    """Minutos prometidos para o pedido (retirada/delivery), a partir da criação."""
    if order.type == "RETIRADA":
        return tenant.prepTimeMin
    if order.type == "DELIVERY":
        return tenant.deliveryTimeMin
    return None


@router.post("/track/{token}/review", status_code=201)
async def review(token: str, body: ReviewIn, tenant=Depends(active_tenant)):
    order = await db.order.find_unique(where={"token": token}, include={"review": True})
    if order is None or order.tenantId != tenant.id:
        raise HTTPException(404, "Pedido não encontrado.")
    if order.status != "ENTREGUE":
        raise HTTPException(409, "Você pode avaliar assim que receber o pedido.")
    if order.review:
        raise HTTPException(409, "Este pedido já foi avaliado. Obrigado!")
    await db.review.create(
        data={"tenantId": tenant.id, "orderId": order.id, "rating": body.rating, "comment": body.comment.strip()}
    )
    await hub.broadcast(tenant.id, "review_created", {"code": order.code, "rating": body.rating})
    return {"ok": True}


# ---------- Conta da mesa ----------


async def session_by_token(tenant, token: str):
    session = await db.tablesession.find_unique(where={"token": token}, include=SESSION_INCLUDE)
    if session is None or session.tenantId != tenant.id:
        raise HTTPException(404, "Conta não encontrada. Ela pode já ter sido fechada.")
    return session


@router.get("/bill/{token}")
async def bill(token: str, tenant=Depends(get_tenant)):
    return bill_out(await session_by_token(tenant, token), tenant.serviceFeePct)


@router.post("/bill/{token}/request")
async def request_bill(token: str, tenant=Depends(active_tenant)):
    """Cliente pede a conta pelo celular: a mesa fica marcada e a equipe recebe um chamado."""
    session = await session_by_token(tenant, token)
    if session.status == "CLOSED":
        raise HTTPException(409, "Esta conta já foi fechada.")
    await db.tablesession.update(where={"id": session.id}, data={"status": "BILL_REQUESTED"})
    await create_call(tenant, session.table, "CONTA")
    return bill_out(await session_by_token(tenant, token), tenant.serviceFeePct)


# ---------- Chamados (garçom, conta, ajuda) ----------


async def create_call(tenant, table, kind: str):
    # Um chamado aberto por tipo e mesa: apertar de novo não gera outro.
    existing = await db.servicecall.find_first(
        where={"tenantId": tenant.id, "tableId": table.id, "kind": kind, "status": "OPEN"}
    )
    if existing:
        return existing
    call = await db.servicecall.create(data={"tenantId": tenant.id, "tableId": table.id, "kind": kind})
    await hub.broadcast(tenant.id, "call_created", {"id": call.id, "kind": kind, "table": table.label})
    return call


@router.post("/calls", status_code=201)
async def call_waiter(body: CallIn, request: Request, tenant=Depends(active_tenant)):
    ratelimit.hit(f"call:{tenant.id}", request, CALLS_PER_IP, 5 * 60, "Muitos chamados seguidos. A equipe já foi avisada.")
    table = await table_from_qr(tenant.id, body.tableNumber, body.tableKey)
    call = await create_call(tenant, table, body.kind)
    return {"id": call.id, "kind": call.kind, "createdAt": call.createdAt.isoformat()}
