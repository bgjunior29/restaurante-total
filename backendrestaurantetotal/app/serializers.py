import json

IDENTITY_FIELDS = [
    "name",
    "tagline",
    "heroTitle",
    "heroHighlight",
    "heroText",
    "logoUrl",
    "accentColor",
    "theme",
    "openingHours",
    "phone",
    "whatsapp",
    "instagram",
    "address",
    "weeklyHours",
]

SETTINGS_FIELDS = [
    "ordersOpen",
    "pixKey",
    "publicUrl",
    "orderPrefix",
    "serviceFeePct",
    "lateAfterMin",
    "pickupEnabled",
    "deliveryEnabled",
    "deliveryFeeCents",
    "freeDeliveryAboveCents",
    "minDeliveryCents",
    "deliveryArea",
    "prepTimeMin",
    "deliveryTimeMin",
    "notifyWhatsapp",
]

# Regras de operação que o cliente precisa ver (retirada, delivery, taxa de serviço).
PUBLIC_OPERATION_FIELDS = [
    "ordersOpen",
    "serviceFeePct",
    "lateAfterMin",
    "pickupEnabled",
    "deliveryEnabled",
    "deliveryFeeCents",
    "freeDeliveryAboveCents",
    "minDeliveryCents",
    "deliveryArea",
    "prepTimeMin",
    "deliveryTimeMin",
]


def weekly_hours(raw: str) -> list:
    """weeklyHours guardado como JSON → lista de 7 dias (ou [] se não informado/ inválido)."""
    try:
        days = json.loads(raw) if raw else []
    except ValueError:
        return []
    return days if isinstance(days, list) and len(days) == 7 else []


def identity_out(t) -> dict:
    data = {k: getattr(t, k) for k in IDENTITY_FIELDS}
    data["weeklyHours"] = weekly_hours(t.weeklyHours)
    return data


def identity_data(body) -> dict:
    """IdentityIn → colunas do banco (os horários viram JSON)."""
    data = body.model_dump()
    data["weeklyHours"] = json.dumps(data["weeklyHours"]) if data["weeklyHours"] else ""
    return data


def tenant_public(t) -> dict:
    """O que qualquer visitante do cardápio pode ver do restaurante."""
    return {
        "slug": t.slug,
        "status": t.status,
        **identity_out(t),
        **{k: getattr(t, k) for k in PUBLIC_OPERATION_FIELDS},
    }


def tenant_settings(t) -> dict:
    return {k: getattr(t, k) for k in SETTINGS_FIELDS}


def option_group_out(g, only_available: bool = False) -> dict:
    options = sorted(g.options or [], key=lambda o: (o.sortOrder, o.id))
    if only_available:
        options = [o for o in options if o.available]
    return {
        "id": g.id,
        "name": g.name,
        "minSelect": g.minSelect,
        "maxSelect": g.maxSelect,
        "sortOrder": g.sortOrder,
        "options": [
            {"id": o.id, "name": o.name, "priceCents": o.priceCents, "available": o.available} for o in options
        ],
    }


def product_out(p) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "imageUrl": p.imageUrl,
        "priceCents": p.priceCents,
        "available": p.available,
        "stockQty": p.stockQty,
        "lowStockAt": p.lowStockAt,
        "sortOrder": p.sortOrder,
        "categoryId": p.categoryId,
        "optionGroupIds": [link.groupId for link in (p.optionGroups or [])],
    }


def payment_method_out(m) -> dict:
    return {"id": m.id, "name": m.name, "kind": m.kind, "active": m.active, "sortOrder": m.sortOrder}


def coupon_out(c, uses: int = 0) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "kind": c.kind,
        "value": c.value,
        "minOrderCents": c.minOrderCents,
        "maxUses": c.maxUses,
        "validUntil": c.validUntil.isoformat() if c.validUntil else None,
        "active": c.active,
        "uses": uses,
    }


def table_out(t) -> dict:
    return {"id": t.id, "number": t.number, "label": t.label, "seats": t.seats, "active": t.active, "qrKey": t.qrKey}


def call_out(c) -> dict:
    return {
        "id": c.id,
        "kind": c.kind,
        "status": c.status,
        "table": {"number": c.table.number, "label": c.table.label} if c.table else None,
        "createdAt": c.createdAt.isoformat(),
    }


def _iso(dt):
    return dt.isoformat() if dt else None


def order_out(o, public: bool = False) -> dict:
    data = {
        "id": o.id,
        "code": o.code,
        "type": o.type,
        "table": {"number": o.table.number, "label": o.table.label} if o.table else None,
        "customerName": o.customerName,
        "notes": o.notes,
        "status": o.status,
        "paymentMethod": o.paymentMethod,
        "changeForCents": o.changeForCents,
        "paid": o.paid,
        "couponCode": o.couponCode,
        "subtotalCents": o.subtotalCents,
        "discountCents": o.discountCents,
        "deliveryFeeCents": o.deliveryFeeCents,
        "totalCents": o.totalCents,
        "createdAt": o.createdAt.isoformat(),
        "updatedAt": o.updatedAt.isoformat(),
        "readyAt": _iso(o.readyAt),
        "finishedAt": _iso(o.finishedAt),
        "items": [
            {
                "id": i.id,
                "name": i.name,
                "details": i.details,
                "station": i.station,
                "unitPriceCents": i.unitPriceCents,
                "quantity": i.quantity,
            }
            for i in (o.items or [])
        ],
    }
    review = getattr(o, "review", None)
    data["review"] = {"rating": review.rating, "comment": review.comment} if review else None
    if not public:
        # Dados pessoais e de operação: só a equipe vê.
        data.update(
            {
                "customerPhone": o.customerPhone,
                "address": o.address,
                "addressRef": o.addressRef,
                "sessionId": o.sessionId,
                "paidAt": _iso(o.paidAt),
                "startedAt": _iso(o.startedAt),
            }
        )
    else:
        data["address"] = o.address  # o próprio cliente confere o endereço no acompanhamento
    return data


def user_out(u) -> dict:
    return {"id": u.id, "username": u.username, "name": u.name, "role": u.role, "active": u.active}
