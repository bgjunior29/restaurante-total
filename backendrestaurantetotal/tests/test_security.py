"""Segurança: limite de tentativas no login e isolamento entre restaurantes."""
from .conftest import login, platform_login

SLUG = "cantina-da-nonna"


def test_login_bloqueia_depois_de_5_erros(client):
    for _ in range(5):
        r = client.post(f"/api/t/{SLUG}/auth/login", json={"username": "admin", "password": "errada"})
        assert r.status_code == 401
    r = client.post(f"/api/t/{SLUG}/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 429  # bloqueado mesmo com a senha certa
    assert "Tente de novo" in r.json()["detail"]


def test_bloqueio_e_por_aparelho(client):
    for _ in range(5):
        client.post(f"/api/t/{SLUG}/auth/login", json={"username": "admin", "password": "errada"}, headers={"X-Forwarded-For": "10.0.0.1"})
    r = client.post(f"/api/t/{SLUG}/auth/login", json={"username": "admin", "password": "admin123"}, headers={"X-Forwarded-For": "10.0.0.2"})
    assert r.status_code == 200  # o dono, em outro aparelho, continua entrando


def test_login_certo_zera_os_erros(client):
    for _ in range(4):
        client.post(f"/api/t/{SLUG}/auth/login", json={"username": "admin", "password": "errada"})
    login(client, SLUG)
    for _ in range(4):
        r = client.post(f"/api/t/{SLUG}/auth/login", json={"username": "admin", "password": "errada"})
        assert r.status_code == 401


def test_login_da_plataforma_tambem_bloqueia(client):
    for _ in range(5):
        client.post("/api/platform/auth/login", json={"username": "admin", "password": "errada"})
    r = client.post("/api/platform/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 429


def test_token_de_um_restaurante_nao_abre_outro(client, second_tenant):
    headers = login(client, SLUG)
    r = client.get(f"/api/t/{second_tenant['slug']}/admin/categories", headers=headers)
    assert r.status_code == 401
    r = client.get(f"/api/t/{second_tenant['slug']}/orders", headers=headers)
    assert r.status_code == 401


def test_token_de_restaurante_nao_abre_plataforma(client):
    r = client.get("/api/platform/tenants", headers=login(client, SLUG))
    assert r.status_code == 401


def test_cada_restaurante_ve_so_o_proprio_cardapio(client, second_tenant):
    headers = login(client, second_tenant["slug"], password="senha123")
    mine = {c["id"] for c in client.get(f"/api/t/{second_tenant['slug']}/admin/categories", headers=headers).json()}
    other = {c["id"] for c in client.get(f"/api/t/{SLUG}/admin/categories", headers=login(client, SLUG)).json()}
    assert mine and other and not (mine & other)


def test_restaurante_suspenso_nao_recebe_pedidos(client):
    headers = platform_login(client)
    r = client.post(
        "/api/platform/tenants",
        headers=headers,
        json={"name": "Suspenso", "slug": "restaurante-suspenso", "planPriceCents": 9900, "adminPassword": "senha123"},
    )
    tid = r.json()["id"]
    r = client.put(
        f"/api/platform/tenants/{tid}",
        headers=headers,
        json={"name": "Suspenso", "slug": "restaurante-suspenso", "planPriceCents": 9900, "status": "SUSPENDED"},
    )
    assert r.status_code == 200, r.text
    assert client.get("/api/t/restaurante-suspenso/menu").status_code == 423
    r = client.post("/api/t/restaurante-suspenso/auth/login", json={"username": "admin", "password": "senha123"})
    assert r.status_code == 423
