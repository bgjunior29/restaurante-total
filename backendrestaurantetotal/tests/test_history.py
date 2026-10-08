"""Pedido terminado sai das telas da equipe e fica no histórico, que só o administrador vê."""
import pytest

from .conftest import login, new_phone
from .test_orders import SLUG, first_product


@pytest.fixture(scope="module")
def staff_headers(client):
    admin = login(client, SLUG)
    r = client.post(
        f"/api/t/{SLUG}/admin/users",
        headers=admin,
        json={"username": "garcom-hist", "name": "Garçom", "password": "garcom123", "role": "STAFF"},
    )
    assert r.status_code == 201, r.text
    return login(client, SLUG, "garcom-hist", "garcom123")


def pickup(client, name="Cliente Histórico"):
    menu = client.get(f"/api/t/{SLUG}/menu").json()
    r = client.post(
        f"/api/t/{SLUG}/orders",
        json={
            "type": "RETIRADA",
            "customerName": name,
            "customerPhone": new_phone(),
            "paymentMethodId": menu["paymentMethods"][0]["id"],
            "items": [{"productId": first_product(menu)["id"], "quantity": 1}],
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_pedido_concluido_e_pago_sai_da_tela_e_vai_para_o_historico(client, staff_headers):
    admin = login(client, SLUG)
    order = pickup(client, "Ana Histórico")
    url = f"/api/t/{SLUG}/orders/{order['id']}"
    for st in ("EM_PREPARO", "PRONTO", "ENTREGUE"):
        assert client.patch(f"{url}/status", headers=staff_headers, json={"status": st}).status_code == 200
    # entregue mas não pago: continua na tela (falta receber)
    open_ids = [o["id"] for o in client.get(f"/api/t/{SLUG}/orders?open_only=true", headers=staff_headers).json()]
    assert order["id"] in open_ids
    assert client.patch(f"{url}/payment", headers=staff_headers, json={"paid": True}).status_code == 200
    open_ids = [o["id"] for o in client.get(f"/api/t/{SLUG}/orders?open_only=true", headers=staff_headers).json()]
    assert order["id"] not in open_ids

    h = client.get(f"/api/t/{SLUG}/admin/history?status=done&q=ana hist", headers=admin).json()
    assert [o["id"] for o in h["orders"]] == [order["id"]]
    assert h["summary"]["done"] == 1 and h["summary"]["paidCents"] == order["totalCents"]


def test_cancelado_vai_para_o_historico(client, staff_headers):
    admin = login(client, SLUG)
    order = pickup(client)
    assert client.patch(f"/api/t/{SLUG}/orders/{order['id']}/status", headers=staff_headers, json={"status": "CANCELADO"}).status_code == 200
    h = client.get(f"/api/t/{SLUG}/admin/history?status=canceled", headers=admin).json()
    assert order["id"] in [o["id"] for o in h["orders"]]
    assert all(o["status"] == "CANCELADO" for o in h["orders"])


def test_so_o_admin_ve_o_historico(client, staff_headers):
    assert client.get(f"/api/t/{SLUG}/admin/history", headers=staff_headers).status_code == 403
    assert client.get(f"/api/t/{SLUG}/orders?status=ENTREGUE", headers=staff_headers).status_code == 403
    assert client.get(f"/api/t/{SLUG}/orders", headers=staff_headers).status_code == 403
    assert client.get(f"/api/t/{SLUG}/orders?open_only=true", headers=staff_headers).status_code == 200
    assert client.get(f"/api/t/{SLUG}/admin/history?status=xyz", headers=login(client, SLUG)).status_code == 400
