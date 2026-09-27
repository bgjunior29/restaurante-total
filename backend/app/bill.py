"""Conta da mesa: soma as rodadas de uma sessão, calcula a taxa de serviço e a divisão por pessoa."""
from .serializers import order_out

SESSION_INCLUDE = {"table": True, "orders": {"include": {"items": True, "table": True}}}


def bill_out(session, service_pct: int, public: bool = True) -> dict:
    orders = sorted(session.orders or [], key=lambda o: o.createdAt)
    valid = [o for o in orders if o.status != "CANCELADO"]
    subtotal = sum(o.totalCents for o in valid)
    if session.status == "CLOSED":
        service = session.serviceCents
    else:
        service = subtotal * service_pct // 100
    total = subtotal + service
    people = max(1, session.people)
    pending = [o for o in valid if o.status in ("RECEBIDO", "EM_PREPARO", "PRONTO")]
    return {
        "id": session.id,
        "token": session.token if not public else None,
        "status": session.status,
        "table": {"number": session.table.number, "label": session.table.label} if session.table else None,
        "people": people,
        "openedAt": session.openedAt.isoformat(),
        "closedAt": session.closedAt.isoformat() if session.closedAt else None,
        "paymentMethod": session.paymentMethod,
        "servicePct": service_pct,
        "subtotalCents": subtotal,
        "serviceCents": service,
        "totalCents": total,
        "perPersonCents": -(-total // people),  # arredonda para cima: ninguém paga centavo a menos
        "pendingOrders": len(pending),
        "orders": [order_out(o, public=public) for o in orders],
    }
