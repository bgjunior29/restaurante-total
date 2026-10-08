"""Rotas da equipe: login, pedidos, cozinha, salão (contas das mesas) e chamados. /api/t/{slug}/..."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from .. import cache, delivery, ratelimit, stock, whatsapp
from ..auth import create_token, verify_password
from ..bill import SESSION_INCLUDE, bill_out
from ..db import db
from ..realtime import hub
from ..schemas import BlockPhoneIn, CloseSessionIn, LoginIn, PaymentIn, StatusIn
from ..serializers import call_out, order_out, user_out
from ..tenancy import active_tenant, floor_user, staff_user
from ..timeutil import local_day_bounds

router = APIRouter(prefix="/api/t/{slug}", tags=["equipe"])

ORDER_INCLUDE = {"items": True, "table": True, "review": True}
ACTIVE_STATUSES = ["RECEBIDO", "EM_PREPARO", "PRONTO", "SAIU_ENTREGA"]
OPEN_SESSION = ["OPEN", "BILL_REQUESTED"]

# Para onde cada status pode ir. Cancelado é final (o estoque já foi devolvido).
ALLOWED = {
    "RECEBIDO": {"EM_PREPARO", "PRONTO", "CANCELADO"},
    "EM_PREPARO": {"RECEBIDO", "PRONTO", "CANCELADO"},
    "PRONTO": {"EM_PREPARO", "SAIU_ENTREGA", "ENTREGUE", "CANCELADO"},
    "SAIU_ENTREGA": {"PRONTO", "ENTREGUE", "CANCELADO"},
    "ENTREGUE": {"PRONTO", "SAIU_ENTREGA"},
    "CANCELADO": set(),
}
# A cozinha só mexe no preparo; sair para entrega, entregar e cancelar ficam com o atendimento.
KITCHEN_CAN = {"RECEBIDO", "EM_PREPARO", "PRONTO"}


@router.post("/auth/login")
async def login(body: LoginIn, request: Request, tenant=Depends(active_tenant)):
    username = body.username.strip().lower()
    scope = f"t{tenant.id}"
    ratelimit.check_login(scope, request, username)
    user = await db.user.find_first(where={"tenantId": tenant.id, "username": username})
    if user is None or not user.active or not verify_password(body.password, user.passwordHash):
        ratelimit.login_failed(scope, request, username)
        raise HTTPException(401, "Usuário ou senha incorretos.")
    ratelimit.login_ok(scope, request, username)
    return {"token": create_token(user.id, "tenant", tenant.id, user.role), "user": user_out(user)}


@router.get("/auth/me")
async def me(user=Depends(staff_user)):
    return user_out(user)


async def owned_order(tenant_id: int, order_id: int):
    order = await db.order.find_first(where={"id": order_id, "tenantId": tenant_id}, include={"items": True})
    if order is None:
        raise HTTPException(404, "Pedido não encontrado.")
    return order


@router.get("/orders")
async def list_orders(
    status: str | None = None,
    type: str | None = None,
    day: str | None = Query(default=None, description="YYYY-MM-DD; padrão: hoje"),
    open_only: bool = False,
    user=Depends(floor_user),
):
    where: dict = {"tenantId": user.tenantId}
    if open_only:
        # Tudo que ainda precisa de atenção: pedido ativo, ou retirada/delivery ainda não pago.
        where["OR"] = [
            {"status": {"in": ACTIVE_STATUSES}},
            {"AND": [{"paid": False}, {"type": {"not": "MESA"}}, {"status": {"not": "CANCELADO"}}]},
        ]
    else:
        start, end = local_day_bounds(day)
        where["createdAt"] = {"gte": start, "lt": end}
    if status:
        where["status"] = status
    if type:
        where["type"] = type
    orders = await db.order.find_many(where=where, include=ORDER_INCLUDE, order={"createdAt": "desc"})
    return [order_out(o) for o in orders]


def track_url(tenant, order) -> str:
    return f"{tenant.publicUrl}/r/{tenant.slug}/pedido/{order.token}" if tenant.publicUrl else ""


@router.patch("/orders/{order_id}/status")
async def update_status(order_id: int, body: StatusIn, user=Depends(staff_user), tenant=Depends(active_tenant)):
    current = await owned_order(user.tenantId, order_id)
    if body.status == current.status:
        return order_out(await db.order.find_unique(where={"id": order_id}, include=ORDER_INCLUDE))
    if user.role == "KITCHEN" and (body.status not in KITCHEN_CAN or current.status not in KITCHEN_CAN):
        raise HTTPException(403, "A cozinha só marca preparo e pronto. Saída, entrega e cancelamento ficam com o atendimento.")
    if body.status not in ALLOWED[current.status]:
        raise HTTPException(409, "Esse pedido não pode ir para esse status (atualize a tela).")
    if body.status == "SAIU_ENTREGA" and current.type != "DELIVERY":
        raise HTTPException(400, "Só pedidos de delivery saem para entrega.")

    now = datetime.now(timezone.utc)
    data: dict = {"status": body.status}
    if body.status == "EM_PREPARO" and not current.startedAt:
        data["startedAt"] = now
    if body.status == "PRONTO" and not current.readyAt:
        data["readyAt"] = now
    if body.status == "ENTREGUE":
        data["finishedAt"] = now
    # Só grava se ninguém mudou o status no meio do caminho: dois garçons cancelando juntos
    # não podem devolver o estoque duas vezes.
    changed = await db.order.update_many(where={"id": order_id, "status": current.status}, data=data)
    if changed == 0:
        raise HTTPException(409, "Outra pessoa acabou de mudar este pedido. Atualize a tela.")
    order = await db.order.find_unique(where={"id": order_id}, include=ORDER_INCLUDE)
    if body.status == "CANCELADO":
        await stock.release(db, current.items or [])
        cache.invalidate(user.tenantId)

    await hub.broadcast(user.tenantId, "order_updated", {"id": order.id, "status": order.status})
    await whatsapp.notify_status(tenant, order, track_url(tenant, order))
    return order_out(order)


@router.patch("/orders/{order_id}/payment")
async def update_payment(order_id: int, body: PaymentIn, user=Depends(floor_user)):
    current = await owned_order(user.tenantId, order_id)
    if current.type == "MESA":
        raise HTTPException(400, "Pedidos da mesa são pagos no fechamento da conta (Salão).")
    data: dict = {"paid": body.paid, "paidAt": datetime.now(timezone.utc) if body.paid else None}
    if body.paymentMethodId:
        method = await db.paymentmethod.find_first(where={"id": body.paymentMethodId, "tenantId": user.tenantId})
        if method is None:
            raise HTTPException(400, "Forma de pagamento inválida.")
        data["paymentMethod"] = method.name
    order = await db.order.update(where={"id": order_id}, data=data, include=ORDER_INCLUDE)
    await hub.broadcast(user.tenantId, "order_updated", {"id": order.id})
    return order_out(order)


@router.post("/orders/{order_id}/block-phone", status_code=201)
async def block_phone(order_id: int, body: BlockPhoneIn, user=Depends(floor_user)):
    """Bloqueia o telefone do pedido (trote, calote): ele não consegue mais pedir delivery nem retirada pelo site."""
    order = await owned_order(user.tenantId, order_id)
    digits = delivery.phone_digits(order.customerPhone)
    if order.type == "MESA" or not digits:
        raise HTTPException(400, "Este pedido não tem telefone para bloquear.")
    reason = delivery.clean_text(body.reason) or f"Pedido {order.code}"
    await db.blockedphone.upsert(
        where={"tenantId_phone": {"tenantId": user.tenantId, "phone": digits}},
        data={
            "create": {"tenantId": user.tenantId, "phone": digits, "reason": reason, "createdBy": user.name},
            "update": {"reason": reason, "createdBy": user.name},
        },
    )
    return {"ok": True, "phone": delivery.format_phone(digits) if delivery.valid_phone(digits) else digits}


@router.get("/payment-methods")
async def payment_methods(user=Depends(floor_user)):
    """Formas ativas, para o funcionário escolher ao receber."""
    rows = await db.paymentmethod.find_many(
        where={"tenantId": user.tenantId, "active": True}, order={"sortOrder": "asc"}
    )
    return [{"id": m.id, "name": m.name, "kind": m.kind} for m in rows]


@router.get("/stats")
async def stats(day: str | None = None, user=Depends(floor_user)):
    start, end = local_day_bounds(day)
    orders = await db.order.find_many(
        where={"tenantId": user.tenantId, "createdAt": {"gte": start, "lt": end}, "status": {"not": "CANCELADO"}},
    )
    sessions = await db.tablesession.find_many(
        where={"tenantId": user.tenantId, "status": "CLOSED", "closedAt": {"gte": start, "lt": end}}
    )
    open_tables = await db.tablesession.count(where={"tenantId": user.tenantId, "status": {"in": OPEN_SESSION}})
    paid = sum(o.totalCents for o in orders if o.paid) + sum(s.serviceCents for s in sessions)
    return {
        "orders": len(orders),
        "active": sum(1 for o in orders if o.status in ACTIVE_STATUSES),
        "delivery": sum(1 for o in orders if o.type != "MESA"),
        "openTables": open_tables,
        "calls": await db.servicecall.count(where={"tenantId": user.tenantId, "status": "OPEN"}),
        "revenuePaidCents": paid,
        "revenuePendingCents": sum(o.totalCents for o in orders if not o.paid),
    }


# ---------- Cozinha (KDS) ----------


@router.get("/kitchen")
async def kitchen(station: str | None = None, user=Depends(staff_user)):
    """Fila da cozinha: pedidos recebidos e em preparo, mais antigos primeiro, só com os itens da estação."""
    orders = await db.order.find_many(
        where={"tenantId": user.tenantId, "status": {"in": ["RECEBIDO", "EM_PREPARO"]}},
        include={"items": True, "table": True},
        order={"createdAt": "asc"},
    )
    out = []
    for o in orders:
        data = order_out(o, public=True)
        data.pop("address", None)  # a cozinha não precisa do endereço do cliente
        if station:
            data["items"] = [i for i in data["items"] if i["station"] == station]
            if not data["items"]:
                continue
        out.append(data)
    return out


# ---------- Chamados ----------


@router.get("/calls")
async def list_calls(user=Depends(staff_user)):
    rows = await db.servicecall.find_many(
        where={"tenantId": user.tenantId, "status": "OPEN"}, include={"table": True}, order={"createdAt": "asc"}
    )
    return [call_out(c) for c in rows]


@router.patch("/calls/{call_id}/done")
async def call_done(call_id: int, user=Depends(staff_user)):
    call = await db.servicecall.find_first(where={"id": call_id, "tenantId": user.tenantId})
    if call is None:
        raise HTTPException(404, "Chamado não encontrado.")
    await db.servicecall.update(where={"id": call_id}, data={"status": "DONE", "doneAt": datetime.now(timezone.utc)})
    await hub.broadcast(user.tenantId, "call_updated", {"id": call_id})
    return {"ok": True}


# ---------- Salão: mesas e contas ----------


@router.get("/floor")
async def floor(user=Depends(floor_user), tenant=Depends(active_tenant)):
    """Mapa do salão: cada mesa ativa com a conta aberta (se houver) e chamados pendentes."""
    tables = await db.table.find_many(where={"tenantId": user.tenantId, "active": True}, order={"number": "asc"})
    sessions = await db.tablesession.find_many(
        where={"tenantId": user.tenantId, "status": {"in": OPEN_SESSION}}, include=SESSION_INCLUDE
    )
    calls = await db.servicecall.find_many(where={"tenantId": user.tenantId, "status": "OPEN"})
    by_table = {s.tableId: s for s in sessions}
    calls_by_table: dict[int, list[str]] = {}
    for c in calls:
        calls_by_table.setdefault(c.tableId, []).append(c.kind)
    out = []
    for t in tables:
        s = by_table.get(t.id)
        out.append(
            {
                "id": t.id,
                "number": t.number,
                "label": t.label,
                "seats": t.seats,
                "calls": calls_by_table.get(t.id, []),
                "bill": bill_out(s, tenant.serviceFeePct, public=False) if s else None,
            }
        )
    return out


async def owned_session(tenant_id: int, session_id: int):
    s = await db.tablesession.find_first(where={"id": session_id, "tenantId": tenant_id}, include=SESSION_INCLUDE)
    if s is None:
        raise HTTPException(404, "Conta não encontrada.")
    return s


@router.post("/sessions/{session_id}/close")
async def close_session(
    session_id: int, body: CloseSessionIn, user=Depends(floor_user), tenant=Depends(active_tenant)
):
    s = await owned_session(user.tenantId, session_id)
    if s.status == "CLOSED":
        raise HTTPException(409, "Esta conta já foi fechada.")
    method = await db.paymentmethod.find_first(where={"id": body.paymentMethodId, "tenantId": user.tenantId})
    if method is None:
        raise HTTPException(400, "Forma de pagamento inválida.")
    valid = [o for o in s.orders or [] if o.status != "CANCELADO"]
    subtotal = sum(o.totalCents for o in valid)
    service = subtotal * tenant.serviceFeePct // 100 if body.includeService else 0
    now = datetime.now(timezone.utc)
    async with db.tx() as tx:
        await tx.order.update_many(
            where={"sessionId": s.id, "status": {"not": "CANCELADO"}},
            data={"paid": True, "paidAt": now, "paymentMethod": method.name},
        )
        # Pedido que ainda não tinha chegado na mesa é considerado entregue ao fechar a conta.
        await tx.order.update_many(
            where={"sessionId": s.id, "status": {"in": ["RECEBIDO", "EM_PREPARO", "PRONTO"]}},
            data={"status": "ENTREGUE", "finishedAt": now},
        )
        await tx.tablesession.update(
            where={"id": s.id},
            data={
                "status": "CLOSED",
                "closedAt": now,
                "serviceCents": service,
                "people": body.people,
                "paymentMethod": method.name,
            },
        )
        await tx.servicecall.update_many(
            where={"tenantId": user.tenantId, "tableId": s.tableId, "status": "OPEN"}, data={"status": "DONE", "doneAt": now}
        )
    await hub.broadcast(user.tenantId, "session_closed", {"id": s.id, "table": s.table.label})
    return bill_out(await owned_session(user.tenantId, session_id), tenant.serviceFeePct, public=False)


@router.patch("/sessions/{session_id}/people")
async def set_people(session_id: int, people: int = Query(ge=1, le=50), user=Depends(floor_user)):
    s = await owned_session(user.tenantId, session_id)
    await db.tablesession.update(where={"id": s.id}, data={"people": people})
    await hub.broadcast(user.tenantId, "session_updated", {"id": s.id})
    return {"ok": True}
