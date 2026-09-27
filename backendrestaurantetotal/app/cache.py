"""Cache em memória para as leituras mais frequentes (restaurante pelo slug e cardápio).

Cada consulta ao banco custa ~100 ms em produção (Render e Neon em nuvens diferentes); o cardápio
fazia ~9 consultas. Aqui guardamos o resultado por pouco tempo e apagamos na hora em que algo muda
(gestão, configurações, estoque). O TTL curto é só uma rede de segurança.

Vale para um processo só (um uvicorn), que é como o Render roda no plano atual.
"""
import time

TENANT_TTL = 60  # segundos
MENU_TTL = 300
PAIRS_TTL = 600

_tenants: dict[str, tuple[float, object]] = {}  # slug -> (expira em, tenant)
_menus: dict[int, tuple[float, dict]] = {}  # tenant id -> (expira em, resposta do /menu)
_pairs: dict[int, tuple[float, dict]] = {}  # tenant id -> (expira em, pares de produtos)


def _get(store: dict, key):
    hit = store.get(key)
    if hit and hit[0] > time.monotonic():
        return hit[1]
    store.pop(key, None)
    return None


def _put(store: dict, key, value, ttl: int):
    store[key] = (time.monotonic() + ttl, value)
    return value


def get_tenant(slug: str):
    return _get(_tenants, slug)


def put_tenant(tenant):
    return _put(_tenants, tenant.slug, tenant, TENANT_TTL)


def get_menu(tenant_id: int):
    return _get(_menus, tenant_id)


def put_menu(tenant_id: int, menu: dict):
    return _put(_menus, tenant_id, menu, MENU_TTL)


def get_pairs(tenant_id: int):
    return _get(_pairs, tenant_id)


def put_pairs(tenant_id: int, pairs: dict):
    return _put(_pairs, tenant_id, pairs, PAIRS_TTL)


def invalidate(tenant_id: int | None = None) -> None:
    """Esquece o que está guardado de um restaurante (ou de todos) depois de uma alteração."""
    if tenant_id is None:
        _tenants.clear()
        _menus.clear()
        return
    _menus.pop(tenant_id, None)
    for slug, (_, t) in list(_tenants.items()):
        if t.id == tenant_id:
            _tenants.pop(slug, None)
