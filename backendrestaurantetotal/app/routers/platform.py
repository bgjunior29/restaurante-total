"""Painel da plataforma (dono do sistema): cria, edita, suspende restaurantes e acompanha o uso. /api/platform/..."""
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import create_token, hash_password, platform_user, verify_password
from ..db import db
from ..schemas import IdentityIn, LoginIn, TenantAdminResetIn, TenantCreateIn, TenantUpdateIn
from ..serializers import IDENTITY_FIELDS
from ..starter import create_payment_methods, create_starter_content
from ..tenancy import validate_slug

router = APIRouter(prefix="/api/platform", tags=["plataforma"])


@router.post("/auth/login")
async def login(body: LoginIn):
    user = await db.platformuser.find_unique(where={"username": body.username.strip().lower()})
    if user is None or not user.active or not verify_password(body.password, user.passwordHash):
        raise HTTPException(401, "Usuário ou senha incorretos.")
    return {
        "token": create_token(user.id, "platform"),
        "user": {"id": user.id, "username": user.username, "name": user.name, "role": "PLATFORM"},
    }


@router.get("/auth/me")
async def me(user=Depends(platform_user)):
    return {"id": user.id, "username": user.username, "name": user.name, "role": "PLATFORM"}


def tenant_row(t, usage: dict) -> dict:
    return {
        "id": t.id,
        "slug": t.slug,
        "name": t.name,
        "status": t.status,
        "plan": t.plan,
        "planPriceCents": t.planPriceCents,
        "notes": t.notes,
        "ordersOpen": t.ordersOpen,
        "tagline": t.tagline,
        "logoUrl": t.logoUrl,
        "accentColor": t.accentColor,
        "theme": t.theme,
        "createdAt": t.createdAt.isoformat(),
        **usage,
    }


async def usage_for(tenant_id: int) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=30)
    orders = await db.order.find_many(
        where={"tenantId": tenant_id, "createdAt": {"gte": since}, "status": {"not": "CANCELADO"}}
    )
    last = await db.order.find_first(where={"tenantId": tenant_id}, order={"createdAt": "desc"})
    return {
        "orders30d": len(orders),
        "revenue30dCents": sum(o.totalCents for o in orders),
        "users": await db.user.count(where={"tenantId": tenant_id, "active": True}),
        "tables": await db.table.count(where={"tenantId": tenant_id, "active": True}),
        "lastOrderAt": last.createdAt.isoformat() if last else None,
    }


@router.get("/tenants")
async def list_tenants(_=Depends(platform_user)):
    tenants = await db.tenant.find_many(order={"createdAt": "asc"})
    return [tenant_row(t, await usage_for(t.id)) for t in tenants]


@router.get("/summary")
async def summary(_=Depends(platform_user)):
    tenants = await db.tenant.find_many()
    active = [t for t in tenants if t.status == "ACTIVE"]
    return {
        "tenants": len(tenants),
        "active": len(active),
        "suspended": len(tenants) - len(active),
        "mrrCents": sum(t.planPriceCents for t in active),  # receita recorrente mensal dos restaurantes ativos
    }


async def ensure_slug_free(slug: str, current_id: int | None = None) -> None:
    other = await db.tenant.find_unique(where={"slug": slug})
    if other and other.id != current_id:
        raise HTTPException(409, "Já existe um restaurante com esse endereço.")


@router.post("/tenants", status_code=201)
async def create_tenant(body: TenantCreateIn, _=Depends(platform_user)):
    slug = validate_slug(body.slug)
    await ensure_slug_free(slug)
    tenant = await db.tenant.create(
        data={
            "slug": slug,
            "name": body.name,
            "plan": body.plan,
            "planPriceCents": body.planPriceCents,
            "notes": body.notes,
            "tagline": body.tagline,
            "accentColor": body.accentColor,
            "theme": body.theme,
            "publicUrl": os.getenv("PUBLIC_URL", "").rstrip("/"),  # QR codes já apontam para o site publicado
        }
    )
    await db.user.create(
        data={
            "tenantId": tenant.id,
            "username": body.adminUsername.strip().lower(),
            "name": body.adminName,
            "role": "ADMIN",
            "passwordHash": hash_password(body.adminPassword),
        }
    )
    if body.starterContent:
        await create_starter_content(tenant.id)
    else:
        await create_payment_methods(tenant.id)  # sem forma de pagamento o cliente não consegue pedir
    return tenant_row(tenant, await usage_for(tenant.id))


@router.put("/tenants/{tid}")
async def update_tenant(tid: int, body: TenantUpdateIn, _=Depends(platform_user)):
    if await db.tenant.find_unique(where={"id": tid}) is None:
        raise HTTPException(404, "Restaurante não encontrado.")
    slug = validate_slug(body.slug)
    await ensure_slug_free(slug, tid)
    data = body.model_dump()
    data["slug"] = slug
    t = await db.tenant.update(where={"id": tid}, data=data)
    return tenant_row(t, await usage_for(t.id))


async def tenant_or_404(tid: int):
    tenant = await db.tenant.find_unique(where={"id": tid})
    if tenant is None:
        raise HTTPException(404, "Restaurante não encontrado.")
    return tenant


@router.get("/tenants/{tid}/identity")
async def read_tenant_identity(tid: int, _=Depends(platform_user)):
    """Identidade visual do restaurante (a mesma que o dono edita em Gestão → Identidade)."""
    t = await tenant_or_404(tid)
    return {k: getattr(t, k) for k in IDENTITY_FIELDS}


@router.put("/tenants/{tid}/identity")
async def write_tenant_identity(tid: int, body: IdentityIn, _=Depends(platform_user)):
    await tenant_or_404(tid)
    t = await db.tenant.update(where={"id": tid}, data=body.model_dump())
    return {k: getattr(t, k) for k in IDENTITY_FIELDS}


@router.post("/tenants/{tid}/admin")
async def reset_tenant_admin(tid: int, body: TenantAdminResetIn, _=Depends(platform_user)):
    """Suporte: redefine a senha de um admin do restaurante (ou cria o admin, se o usuário não existir)."""
    if await db.tenant.find_unique(where={"id": tid}) is None:
        raise HTTPException(404, "Restaurante não encontrado.")
    username = body.username.strip().lower()
    user = await db.user.find_first(where={"tenantId": tid, "username": username})
    data = {"passwordHash": hash_password(body.password), "role": "ADMIN", "active": True}
    if user:
        await db.user.update(where={"id": user.id}, data=data)
        return {"ok": True, "created": False}
    await db.user.create(data={"tenantId": tid, "username": username, "name": "Administrador", **data})
    return {"ok": True, "created": True}
