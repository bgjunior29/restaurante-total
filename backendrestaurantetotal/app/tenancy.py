"""Resolve o restaurante (tenant) pelo slug do endereço e garante que cada usuário só acessa o próprio restaurante."""
import re

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials

from . import cache
from .auth import bearer, read_token
from .db import db

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
RESERVED_SLUGS = {"api", "r", "ws", "plataforma", "assets", "admin", "equipe", "mesa", "pedido", "conta"}


def validate_slug(slug: str) -> str:
    slug = slug.strip().lower()
    if not (3 <= len(slug) <= 40) or not SLUG_RE.match(slug):
        raise HTTPException(400, "Endereço inválido: use de 3 a 40 letras minúsculas, números e hífens (ex.: cantina-da-nonna).")
    if slug in RESERVED_SLUGS:
        raise HTTPException(400, "Esse endereço é reservado. Escolha outro.")
    return slug


async def get_tenant(slug: str = Path(..., description="Endereço do restaurante, ex.: cantina-da-nonna")):
    tenant = cache.get_tenant(slug)
    if tenant is None:
        tenant = await db.tenant.find_unique(where={"slug": slug})
        if tenant is not None:
            cache.put_tenant(tenant)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Restaurante não encontrado. Confira o endereço.")
    return tenant


async def active_tenant(tenant=Depends(get_tenant)):
    """Restaurante suspenso não recebe pedidos nem acesso da equipe (a plataforma continua vendo)."""
    if tenant.status != "ACTIVE":
        raise HTTPException(status.HTTP_423_LOCKED, "Este cardápio está temporariamente indisponível.")
    return tenant


async def staff_user(tenant=Depends(active_tenant), creds: HTTPAuthorizationCredentials | None = Depends(bearer)):
    payload = read_token(creds, "tenant")
    if payload.get("tid") != tenant.id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão de outro restaurante. Faça login novamente.")
    user = await db.user.find_unique(where={"id": int(payload["sub"])})
    if user is None or not user.active or user.tenantId != tenant.id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário inválido.")
    return user


async def floor_user(user=Depends(staff_user)):
    """Atendimento (admin e garçom/caixa). A cozinha não vê telefone, endereço nem pagamento dos clientes."""
    if user.role not in ("ADMIN", "STAFF"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Seu acesso é só da cozinha.")
    return user


async def admin_user(user=Depends(staff_user)):
    if user.role != "ADMIN":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Apenas administradores.")
    return user
