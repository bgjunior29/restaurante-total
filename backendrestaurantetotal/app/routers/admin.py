"""Gestão de um restaurante (só administradores): /api/t/{slug}/admin/...

Cardápio, adicionais, estoque, cupons, formas de pagamento, mesas, identidade, configurações, equipe,
relatórios e inteligência. Toda consulta filtra pelo tenant do usuário logado: um restaurante nunca
enxerga dados de outro.
"""
from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request

from .. import cache
from ..auth import hash_password
from ..coupons import count_uses, normalize_code
from ..db import db
from ..insights import build_insights
from ..schemas import (
    CategoryIn,
    CouponIn,
    IdentityIn,
    OptionGroupIn,
    PaymentMethodIn,
    ProductIn,
    SettingsIn,
    TableIn,
    UserIn,
    UserUpdateIn,
)
from ..serializers import (
    IDENTITY_FIELDS,
    coupon_out,
    option_group_out,
    payment_method_out,
    product_out,
    table_out,
    tenant_settings,
    user_out,
)
from ..tenancy import admin_user
from ..timeutil import local_date, local_day_bounds

async def fresh_cache(request: Request, slug: str):
    """Toda alteração na gestão (cardápio, pagamentos, identidade, configurações...) limpa o cache do
    restaurante, antes e depois de gravar, para o cliente ver a mudança na hora."""
    if request.method == "GET":
        yield
        return
    tenant = cache.get_tenant(slug)
    if tenant:
        cache.invalidate(tenant.id)
    yield
    if tenant:
        cache.invalidate(tenant.id)
    else:
        cache.invalidate()


router = APIRouter(prefix="/api/t/{slug}/admin", tags=["gestão do restaurante"], dependencies=[Depends(fresh_cache)])


async def owned(model, record_id: int, tenant_id: int, label: str):
    """Busca um registro garantindo que ele pertence ao restaurante; 404 se for de outro ou não existir."""
    row = await model.find_first(where={"id": record_id, "tenantId": tenant_id})
    if row is None:
        raise HTTPException(404, f"{label} não encontrado(a).")
    return row


def category_out(c) -> dict:
    return {"id": c.id, "name": c.name, "station": c.station, "sortOrder": c.sortOrder}


# ---------- Categorias ----------
@router.get("/categories")
async def list_categories(user=Depends(admin_user)):
    rows = await db.category.find_many(where={"tenantId": user.tenantId}, order={"sortOrder": "asc"})
    return [category_out(c) for c in rows]


async def ensure_category_name(tenant_id: int, name: str, current_id: int | None = None):
    other = await db.category.find_first(where={"tenantId": tenant_id, "name": name})
    if other and other.id != current_id:
        raise HTTPException(409, "Já existe uma categoria com esse nome.")


@router.post("/categories", status_code=201)
async def create_category(body: CategoryIn, user=Depends(admin_user)):
    await ensure_category_name(user.tenantId, body.name)
    return category_out(await db.category.create(data={**body.model_dump(), "tenantId": user.tenantId}))


@router.put("/categories/{cid}")
async def update_category(cid: int, body: CategoryIn, user=Depends(admin_user)):
    await owned(db.category, cid, user.tenantId, "Categoria")
    await ensure_category_name(user.tenantId, body.name, cid)
    return category_out(await db.category.update(where={"id": cid}, data=body.model_dump()))


@router.delete("/categories/{cid}", status_code=204)
async def delete_category(cid: int, user=Depends(admin_user)):
    await owned(db.category, cid, user.tenantId, "Categoria")
    if await db.product.count(where={"categoryId": cid}):
        raise HTTPException(409, "Remova ou mova os produtos desta categoria antes de excluí-la.")
    await db.category.delete(where={"id": cid})


# ---------- Produtos ----------
PRODUCT_INCLUDE = {"optionGroups": True}


async def product_data(body: ProductIn, tenant_id: int) -> tuple[dict, list[int]]:
    await owned(db.category, body.categoryId, tenant_id, "Categoria")
    group_ids = list(dict.fromkeys(body.optionGroupIds))
    if group_ids:
        valid = await db.optiongroup.count(where={"id": {"in": group_ids}, "tenantId": tenant_id})
        if valid != len(group_ids):
            raise HTTPException(400, "Um dos grupos de adicionais não existe mais.")
    data = body.model_dump(exclude={"optionGroupIds"})
    if data["stockQty"] == 0:
        data["available"] = False  # sem estoque não aparece no cardápio
    return data, group_ids


async def set_product_groups(product_id: int, group_ids: list[int]) -> None:
    await db.productoptiongroup.delete_many(where={"productId": product_id})
    for gid in group_ids:
        await db.productoptiongroup.create(data={"productId": product_id, "groupId": gid})


@router.get("/products")
async def list_products(user=Depends(admin_user)):
    rows = await db.product.find_many(
        where={"tenantId": user.tenantId}, order=[{"categoryId": "asc"}, {"sortOrder": "asc"}], include=PRODUCT_INCLUDE
    )
    return [product_out(p) for p in rows]


@router.post("/products", status_code=201)
async def create_product(body: ProductIn, user=Depends(admin_user)):
    data, group_ids = await product_data(body, user.tenantId)
    p = await db.product.create(data={**data, "tenantId": user.tenantId})
    await set_product_groups(p.id, group_ids)
    return product_out(await db.product.find_unique(where={"id": p.id}, include=PRODUCT_INCLUDE))


@router.put("/products/{pid}")
async def update_product(pid: int, body: ProductIn, user=Depends(admin_user)):
    await owned(db.product, pid, user.tenantId, "Produto")
    data, group_ids = await product_data(body, user.tenantId)
    await db.product.update(where={"id": pid}, data=data)
    await set_product_groups(pid, group_ids)
    return product_out(await db.product.find_unique(where={"id": pid}, include=PRODUCT_INCLUDE))


@router.delete("/products/{pid}", status_code=204)
async def delete_product(pid: int, user=Depends(admin_user)):
    await owned(db.product, pid, user.tenantId, "Produto")
    # Produtos com vendas ficam no histórico: apenas desativamos.
    if await db.orderitem.count(where={"productId": pid}):
        await db.product.update(where={"id": pid}, data={"available": False})
    else:
        await db.product.delete(where={"id": pid})


# ---------- Adicionais (grupos de opções) ----------
GROUP_INCLUDE = {"options": True, "products": True}


def group_admin_out(g) -> dict:
    return {**option_group_out(g), "productCount": len(g.products or [])}


@router.get("/option-groups")
async def list_option_groups(user=Depends(admin_user)):
    rows = await db.optiongroup.find_many(
        where={"tenantId": user.tenantId}, order={"sortOrder": "asc"}, include=GROUP_INCLUDE
    )
    return [group_admin_out(g) for g in rows]


def check_group_limits(body: OptionGroupIn) -> None:
    if body.minSelect > body.maxSelect:
        raise HTTPException(400, "O mínimo de escolhas não pode ser maior que o máximo.")
    available = sum(1 for o in body.options if o.available)
    if body.minSelect > available:
        raise HTTPException(400, "O mínimo de escolhas é maior que o número de opções disponíveis.")


async def sync_options(group_id: int, options) -> None:
    """Atualiza as opções existentes, cria as novas e apaga as que saíram da lista.
    Os pedidos guardam o nome das opções como texto, então apagar não afeta o histórico."""
    current = {o.id: o for o in await db.option.find_many(where={"groupId": group_id})}
    keep = set()
    for i, o in enumerate(options):
        data = {"name": o.name, "priceCents": o.priceCents, "available": o.available, "sortOrder": i}
        if o.id and o.id in current:
            await db.option.update(where={"id": o.id}, data=data)
            keep.add(o.id)
        else:
            await db.option.create(data={**data, "groupId": group_id})
    stale = [oid for oid in current if oid not in keep]
    if stale:
        await db.option.delete_many(where={"id": {"in": stale}})


@router.post("/option-groups", status_code=201)
async def create_option_group(body: OptionGroupIn, user=Depends(admin_user)):
    check_group_limits(body)
    g = await db.optiongroup.create(
        data={"tenantId": user.tenantId, **body.model_dump(exclude={"options"})}
    )
    await sync_options(g.id, body.options)
    return group_admin_out(await db.optiongroup.find_unique(where={"id": g.id}, include=GROUP_INCLUDE))


@router.put("/option-groups/{gid}")
async def update_option_group(gid: int, body: OptionGroupIn, user=Depends(admin_user)):
    await owned(db.optiongroup, gid, user.tenantId, "Grupo de adicionais")
    check_group_limits(body)
    await db.optiongroup.update(where={"id": gid}, data=body.model_dump(exclude={"options"}))
    await sync_options(gid, body.options)
    return group_admin_out(await db.optiongroup.find_unique(where={"id": gid}, include=GROUP_INCLUDE))


@router.delete("/option-groups/{gid}", status_code=204)
async def delete_option_group(gid: int, user=Depends(admin_user)):
    await owned(db.optiongroup, gid, user.tenantId, "Grupo de adicionais")
    await db.optiongroup.delete(where={"id": gid})  # opções e vínculos com produtos saem juntos (cascade)


# ---------- Cupons ----------
def coupon_data(body: CouponIn) -> dict:
    data = body.model_dump()
    data["code"] = normalize_code(body.code)
    # Vale até o fim do dia escolhido, no fuso do restaurante.
    data["validUntil"] = local_day_bounds(body.validUntil.isoformat())[1] if body.validUntil else None
    return data


async def ensure_coupon_code(tenant_id: int, code: str, current_id: int | None = None):
    other = await db.coupon.find_first(where={"tenantId": tenant_id, "code": code})
    if other and other.id != current_id:
        raise HTTPException(409, "Já existe um cupom com esse código.")


@router.get("/coupons")
async def list_coupons(user=Depends(admin_user)):
    rows = await db.coupon.find_many(where={"tenantId": user.tenantId}, order={"createdAt": "desc"})
    return [coupon_out(c, await count_uses(user.tenantId, c.code)) for c in rows]


@router.post("/coupons", status_code=201)
async def create_coupon(body: CouponIn, user=Depends(admin_user)):
    data = coupon_data(body)
    await ensure_coupon_code(user.tenantId, data["code"])
    return coupon_out(await db.coupon.create(data={**data, "tenantId": user.tenantId}))


@router.put("/coupons/{cid}")
async def update_coupon(cid: int, body: CouponIn, user=Depends(admin_user)):
    await owned(db.coupon, cid, user.tenantId, "Cupom")
    data = coupon_data(body)
    await ensure_coupon_code(user.tenantId, data["code"], cid)
    c = await db.coupon.update(where={"id": cid}, data=data)
    return coupon_out(c, await count_uses(user.tenantId, c.code))


@router.delete("/coupons/{cid}", status_code=204)
async def delete_coupon(cid: int, user=Depends(admin_user)):
    await owned(db.coupon, cid, user.tenantId, "Cupom")
    await db.coupon.delete(where={"id": cid})  # pedidos guardam o código como texto


# ---------- Formas de pagamento ----------
@router.get("/payment-methods")
async def list_payment_methods(user=Depends(admin_user)):
    rows = await db.paymentmethod.find_many(where={"tenantId": user.tenantId}, order={"sortOrder": "asc"})
    return [payment_method_out(m) for m in rows]


async def ensure_one_active_payment(tenant_id: int, ignore_id: int) -> None:
    others = await db.paymentmethod.count(where={"tenantId": tenant_id, "active": True, "id": {"not": ignore_id}})
    if others == 0:
        raise HTTPException(409, "Deixe pelo menos uma forma de pagamento ativa, senão o cliente não consegue pedir.")


@router.post("/payment-methods", status_code=201)
async def create_payment_method(body: PaymentMethodIn, user=Depends(admin_user)):
    return payment_method_out(await db.paymentmethod.create(data={**body.model_dump(), "tenantId": user.tenantId}))


@router.put("/payment-methods/{mid}")
async def update_payment_method(mid: int, body: PaymentMethodIn, user=Depends(admin_user)):
    await owned(db.paymentmethod, mid, user.tenantId, "Forma de pagamento")
    if not body.active:
        await ensure_one_active_payment(user.tenantId, mid)
    return payment_method_out(await db.paymentmethod.update(where={"id": mid}, data=body.model_dump()))


@router.delete("/payment-methods/{mid}", status_code=204)
async def delete_payment_method(mid: int, user=Depends(admin_user)):
    await owned(db.paymentmethod, mid, user.tenantId, "Forma de pagamento")
    await ensure_one_active_payment(user.tenantId, mid)
    await db.paymentmethod.delete(where={"id": mid})  # pedidos guardam o nome como texto


# ---------- Mesas ----------
@router.get("/tables")
async def list_tables(user=Depends(admin_user)):
    rows = await db.table.find_many(where={"tenantId": user.tenantId}, order={"number": "asc"})
    return [table_out(t) for t in rows]


async def table_data(body: TableIn, tenant_id: int, current_id: int | None = None) -> dict:
    other = await db.table.find_first(where={"tenantId": tenant_id, "number": body.number})
    if other and other.id != current_id:
        raise HTTPException(409, "Já existe uma mesa com esse número.")
    data = body.model_dump()
    data["label"] = data["label"].strip() or f"Mesa {body.number:02d}"
    return data


@router.post("/tables", status_code=201)
async def create_table(body: TableIn, user=Depends(admin_user)):
    data = await table_data(body, user.tenantId)
    return table_out(await db.table.create(data={**data, "tenantId": user.tenantId}))


@router.put("/tables/{tid}")
async def update_table(tid: int, body: TableIn, user=Depends(admin_user)):
    await owned(db.table, tid, user.tenantId, "Mesa")
    data = await table_data(body, user.tenantId, tid)
    return table_out(await db.table.update(where={"id": tid}, data=data))


@router.delete("/tables/{tid}", status_code=204)
async def delete_table(tid: int, user=Depends(admin_user)):
    await owned(db.table, tid, user.tenantId, "Mesa")
    in_use = await db.order.count(where={"tableId": tid}) or await db.servicecall.count(where={"tableId": tid})
    if in_use:
        await db.table.update(where={"id": tid}, data={"active": False})
    else:
        await db.table.delete(where={"id": tid})


# ---------- Identidade e configurações ----------
@router.get("/identity")
async def read_identity(user=Depends(admin_user)):
    t = await db.tenant.find_unique(where={"id": user.tenantId})
    return {k: getattr(t, k) for k in IDENTITY_FIELDS}


@router.put("/identity")
async def write_identity(body: IdentityIn, user=Depends(admin_user)):
    t = await db.tenant.update(where={"id": user.tenantId}, data=body.model_dump())
    return {k: getattr(t, k) for k in IDENTITY_FIELDS}


@router.get("/settings")
async def read_settings(user=Depends(admin_user)):
    return tenant_settings(await db.tenant.find_unique(where={"id": user.tenantId}))


@router.put("/settings")
async def write_settings(body: SettingsIn, user=Depends(admin_user)):
    data = body.model_dump()
    data["publicUrl"] = data["publicUrl"].strip().rstrip("/")
    data["orderPrefix"] = data["orderPrefix"].upper()
    data["deliveryArea"] = data["deliveryArea"].strip()
    return tenant_settings(await db.tenant.update(where={"id": user.tenantId}, data=data))


# ---------- Equipe ----------
@router.get("/users")
async def list_users(user=Depends(admin_user)):
    return [user_out(u) for u in await db.user.find_many(where={"tenantId": user.tenantId}, order={"id": "asc"})]


@router.post("/users", status_code=201)
async def create_user(body: UserIn, user=Depends(admin_user)):
    username = body.username.strip().lower()
    if await db.user.find_first(where={"tenantId": user.tenantId, "username": username}):
        raise HTTPException(409, "Esse usuário já existe.")
    u = await db.user.create(
        data={
            "tenantId": user.tenantId,
            "username": username,
            "name": body.name,
            "role": body.role,
            "passwordHash": hash_password(body.password),
        }
    )
    return user_out(u)


@router.patch("/users/{uid}")
async def update_user(uid: int, body: UserUpdateIn, me=Depends(admin_user)):
    await owned(db.user, uid, me.tenantId, "Usuário")
    data = body.model_dump(exclude_none=True)
    if uid == me.id and (data.get("active") is False or data.get("role") == "STAFF"):
        raise HTTPException(400, "Você não pode desativar ou rebaixar o próprio usuário.")
    if "password" in data:
        data["passwordHash"] = hash_password(data.pop("password"))
    return user_out(await db.user.update(where={"id": uid}, data=data))


# ---------- Relatórios ----------
@router.get("/report")
async def report(start: str, end: str, user=Depends(admin_user)):
    """Resumo entre duas datas (YYYY-MM-DD, inclusivas)."""
    s, _ = local_day_bounds(start)
    _, e = local_day_bounds(end)
    if e <= s or e - s > timedelta(days=366):
        raise HTTPException(400, "Período inválido (máximo de 1 ano).")
    orders = await db.order.find_many(
        where={"tenantId": user.tenantId, "createdAt": {"gte": s, "lt": e}, "status": {"not": "CANCELADO"}},
        include={"items": True},
    )
    by_day: dict[str, dict] = defaultdict(lambda: {"orders": 0, "revenueCents": 0, "paidCents": 0})
    by_method: dict[str, int] = defaultdict(int)
    by_item: dict[str, dict] = defaultdict(lambda: {"quantity": 0, "revenueCents": 0})
    for o in orders:
        key = local_date(o.createdAt)
        by_day[key]["orders"] += 1
        by_day[key]["revenueCents"] += o.totalCents
        if o.paid:
            by_day[key]["paidCents"] += o.totalCents
            by_method[o.paymentMethod] += o.totalCents
        for i in o.items or []:
            by_item[i.name]["quantity"] += i.quantity
            by_item[i.name]["revenueCents"] += i.quantity * i.unitPriceCents
    sessions = await db.tablesession.find_many(
        where={"tenantId": user.tenantId, "status": "CLOSED", "closedAt": {"gte": s, "lt": e}}
    )
    reviews = await db.review.find_many(where={"tenantId": user.tenantId, "createdAt": {"gte": s, "lt": e}})
    by_type: dict[str, dict] = defaultdict(lambda: {"orders": 0, "revenueCents": 0})
    for o in orders:
        by_type[o.type]["orders"] += 1
        by_type[o.type]["revenueCents"] += o.totalCents
    total = sum(o.totalCents for o in orders)
    return {
        "serviceCents": sum(x.serviceCents for x in sessions),
        "deliveryFeesCents": sum(o.deliveryFeeCents for o in orders),
        "discountCents": sum(o.discountCents for o in orders),
        "byType": dict(by_type),
        "rating": {
            "average": round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else None,
            "count": len(reviews),
        },
        "orders": len(orders),
        "revenueCents": total,
        "paidCents": sum(o.totalCents for o in orders if o.paid),
        "averageTicketCents": total // len(orders) if orders else 0,
        "byDay": [{"day": d, **v} for d, v in sorted(by_day.items())],
        "byPaymentMethod": dict(by_method),
        "topItems": sorted(
            ({"name": n, **v} for n, v in by_item.items()), key=lambda x: x["revenueCents"], reverse=True
        )[:15],
    }


# ---------- Inteligência ----------
@router.get("/insights")
async def insights(days: int = 30, user=Depends(admin_user)):
    """Pico de horário, previsão do dia, tempo de preparo, produtos parados, combos e avaliações."""
    if days not in (7, 30, 90):
        raise HTTPException(400, "Período inválido: use 7, 30 ou 90 dias.")
    tenant = await db.tenant.find_unique(where={"id": user.tenantId})
    return await build_insights(tenant, days)


@router.get("/stock")
async def low_stock(user=Depends(admin_user)):
    rows = await db.product.find_many(where={"tenantId": user.tenantId, "stockQty": {"not": None}}, order={"name": "asc"})
    return [
        {"id": p.id, "name": p.name, "stockQty": p.stockQty, "lowStockAt": p.lowStockAt, "available": p.available}
        for p in rows
    ]
