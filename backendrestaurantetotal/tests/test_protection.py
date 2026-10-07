"""Proteções de entrada: acesso só pela Vercel, IP confiável, limite de cupom, de WebSocket e de tamanho."""
import pytest
from starlette.websockets import WebSocketDisconnect

from app import realtime

SLUG = "cantina-da-nonna"
SECRET = "segredo-da-vercel-nos-testes"
VIA_VERCEL = {"x-origin-secret": SECRET}


def wrong_login(client, headers=None):
    return client.post(f"/api/t/{SLUG}/auth/login", json={"username": "admin", "password": "errada"}, headers=headers or {})


# ---------- Acesso só pela Vercel ----------


def test_sem_segredo_configurado_a_api_continua_aberta(client):
    assert client.get(f"/api/t/{SLUG}/info").status_code == 200


def test_com_segredo_recusa_quem_chama_o_render_direto(client, monkeypatch):
    monkeypatch.setenv("ORIGIN_SECRET", SECRET)
    r = client.get(f"/api/t/{SLUG}/info")
    assert r.status_code == 403
    assert client.get(f"/api/t/{SLUG}/info", headers={"x-origin-secret": "chute"}).status_code == 403
    assert client.get(f"/api/t/{SLUG}/info", headers=VIA_VERCEL).status_code == 200


def test_health_continua_aberto_para_o_render_e_o_ping(client, monkeypatch):
    monkeypatch.setenv("ORIGIN_SECRET", SECRET)
    assert client.get("/api/health").status_code == 200


# ---------- IP confiável ----------


def test_pela_vercel_vale_o_ip_da_vercel_e_nao_o_inventado(client, monkeypatch):
    """X-Forwarded-For diferente a cada tentativa não escapa do bloqueio: vale o x-real-ip da Vercel."""
    monkeypatch.setenv("ORIGIN_SECRET", SECRET)
    for i in range(5):
        headers = {**VIA_VERCEL, "x-real-ip": "200.1.1.1", "x-forwarded-for": f"10.9.9.{i}"}
        assert wrong_login(client, headers).status_code == 401
    headers = {**VIA_VERCEL, "x-real-ip": "200.1.1.1", "x-forwarded-for": "10.9.9.99"}
    assert wrong_login(client, headers).status_code == 429


def test_pela_vercel_cada_visitante_tem_o_seu_limite(client, monkeypatch):
    monkeypatch.setenv("ORIGIN_SECRET", SECRET)
    for _ in range(5):
        wrong_login(client, {**VIA_VERCEL, "x-real-ip": "200.1.1.1"})
    r = client.post(
        f"/api/t/{SLUG}/auth/login",
        json={"username": "admin", "password": "admin123"},
        headers={**VIA_VERCEL, "x-real-ip": "200.2.2.2"},
    )
    assert r.status_code == 200


# ---------- Cupom ----------


def test_conferir_cupom_tem_limite(client):
    for i in range(20):
        r = client.post(f"/api/t/{SLUG}/coupons/check", json={"code": f"CHUTE{i}", "subtotalCents": 10000})
        assert r.status_code == 404
    r = client.post(f"/api/t/{SLUG}/coupons/check", json={"code": "BEMVINDO10", "subtotalCents": 10000})
    assert r.status_code == 429
    assert "cupom" in r.json()["detail"]


def test_limite_de_cupom_e_por_aparelho(client):
    for i in range(20):
        client.post(f"/api/t/{SLUG}/coupons/check", json={"code": f"CHUTE{i}", "subtotalCents": 10000}, headers={"X-Forwarded-For": "10.1.1.1"})
    r = client.post(f"/api/t/{SLUG}/coupons/check", json={"code": "BEMVINDO10", "subtotalCents": 10000}, headers={"X-Forwarded-For": "10.1.1.2"})
    assert r.status_code == 200
    assert r.json()["discountCents"] == 1000


# ---------- WebSocket ----------


@pytest.fixture
def small_ws_limit(monkeypatch):
    monkeypatch.setattr(realtime, "MAX_PER_IP", 2)


def test_websocket_tem_limite_por_ip(client, small_ws_limit):
    with client.websocket_connect(f"/ws/{SLUG}"), client.websocket_connect(f"/ws/{SLUG}"):
        with client.websocket_connect(f"/ws/{SLUG}") as third:
            with pytest.raises(WebSocketDisconnect) as closed:
                third.receive_text()
            assert closed.value.code == realtime.CLOSE_LIMIT


def test_websocket_libera_a_vaga_ao_fechar(client, small_ws_limit):
    with client.websocket_connect(f"/ws/{SLUG}"):
        with client.websocket_connect(f"/ws/{SLUG}"):
            pass
        with client.websocket_connect(f"/ws/{SLUG}") as again:
            again.send_text("ping")  # aceita e fica aberta
    assert realtime.hub.per_ip == {}


def test_websocket_limite_separa_ips(client, small_ws_limit):
    other = {"cf-connecting-ip": "200.3.3.3"}
    with client.websocket_connect(f"/ws/{SLUG}"), client.websocket_connect(f"/ws/{SLUG}"):
        with client.websocket_connect(f"/ws/{SLUG}", headers=other) as ws:
            ws.send_text("ping")
            assert realtime.hub.per_ip["200.3.3.3"] == 1


# ---------- Tamanho da requisição ----------


def test_recusa_corpo_grande_pelo_content_length(client):
    big = b"x" * (2 * 1024 * 1024 + 1)
    r = client.post(f"/api/t/{SLUG}/coupons/check", content=big, headers={"content-type": "application/json"})
    assert r.status_code == 413


def test_recusa_corpo_grande_enviado_em_partes(client):
    def chunks():
        for _ in range(3):
            yield b"x" * (1024 * 1024)

    r = client.post(f"/api/t/{SLUG}/coupons/check", content=chunks(), headers={"content-type": "application/json"})
    assert r.status_code == 413


def test_corpo_normal_passa(client):
    r = client.post(f"/api/t/{SLUG}/coupons/check", json={"code": "BEMVINDO10", "subtotalCents": 10000})
    assert r.status_code == 200
