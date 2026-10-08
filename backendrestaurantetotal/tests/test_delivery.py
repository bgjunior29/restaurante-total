"""Delivery separado da mesa e suas proteções: telefone válido, bloqueio, limites e cozinha sem dados do cliente."""
import pytest

from app import delivery

from .conftest import login, new_phone
from .test_orders import SLUG, first_product

ADDRESS = "Rua das Flores, 120 - Centro - São Paulo/SP"


@pytest.fixture(scope="module")
def menu(client):
    return client.get(f"/api/t/{SLUG}/menu").json()


def delivery_order(client, menu, phone=None, quantity=4, **extra):
    product = first_product(menu)
    return client.post(
        f"/api/t/{SLUG}/orders",
        json={
            "type": "DELIVERY",
            "customerName": "Cliente Delivery",
            "customerPhone": phone or new_phone(),
            "address": ADDRESS,
            "paymentMethodId": menu["paymentMethods"][0]["id"],
            "items": [{"productId": product["id"], "quantity": quantity}],
            **extra,
        },
    )


@pytest.fixture(scope="module")
def kitchen_headers(client):
    admin = login(client, SLUG)
    r = client.post(
        f"/api/t/{SLUG}/admin/users",
        headers=admin,
        json={"username": "cozinha-teste", "name": "Cozinha", "password": "cozinha123", "role": "KITCHEN"},
    )
    assert r.status_code == 201, r.text
    return login(client, SLUG, "cozinha-teste", "cozinha123")


# ---------- Telefone ----------


@pytest.mark.parametrize(
    "raw, ok",
    [
        ("(11) 98888-7777", True),
        ("+55 21 99876-5432", True),
        ("1133334444", True),  # fixo
        ("11999998888", True),
        ("(11) 99999-9999", False),  # repetido
        ("(11) 91111-1111", False),
        ("(20) 98888-7777", False),  # DDD que não existe
        ("(11) 88888-7777", False),  # celular sem o 9
        ("98888-7777", False),  # sem DDD
        ("abc", False),
    ],
)
def test_validacao_do_telefone(raw, ok):
    assert delivery.valid_phone(delivery.phone_digits(raw)) is ok


def test_telefone_invalido_e_recusado(client, menu):
    r = delivery_order(client, menu, phone="(11) 99999-9999")
    assert r.status_code == 400
    assert "telefone" in r.json()["detail"].lower()


def test_telefone_fica_no_formato_padrao(client, menu):
    r = delivery_order(client, menu, phone="+55 (21) 9 8765-4321")
    assert r.status_code == 201, r.text
    admin = login(client, SLUG)
    orders = client.get(f"/api/t/{SLUG}/orders?type=DELIVERY&open_only=true", headers=admin).json()
    assert next(o for o in orders if o["id"] == r.json()["id"])["customerPhone"] == "(21) 98765-4321"


def test_delivery_nao_entra_na_conta_de_mesa(client, menu):
    r = delivery_order(client, menu)
    assert r.status_code == 201, r.text
    assert r.json()["sessionToken"] is None
    assert r.json()["table"] is None


# ---------- Limites ----------


def test_limite_de_pedidos_em_andamento_por_telefone(client, menu):
    phone = new_phone()
    for i in range(delivery.MAX_OPEN_PER_PHONE):
        # aparelhos diferentes: o limite é do telefone, não do IP
        r = client.post(f"/api/t/{SLUG}/orders", headers={"X-Forwarded-For": f"198.51.100.{i}"}, json=delivery_order_body(menu, phone))
        assert r.status_code == 201, r.text
    r = client.post(f"/api/t/{SLUG}/orders", headers={"X-Forwarded-For": "198.51.100.99"}, json=delivery_order_body(menu, phone))
    assert r.status_code == 429
    assert "em andamento" in r.json()["detail"]

    # entregou um: libera de novo
    admin = login(client, SLUG)
    open_orders = client.get(f"/api/t/{SLUG}/orders?type=DELIVERY&open_only=true", headers=admin).json()
    first = next(o for o in open_orders if o["customerPhone"] == delivery.format_phone(phone))
    assert client.patch(f"/api/t/{SLUG}/orders/{first['id']}/status", headers=admin, json={"status": "CANCELADO"}).status_code == 200
    r = client.post(f"/api/t/{SLUG}/orders", headers={"X-Forwarded-For": "198.51.100.98"}, json=delivery_order_body(menu, phone))
    assert r.status_code == 201, r.text


def delivery_order_body(menu, phone):
    return {
        "type": "DELIVERY",
        "customerName": "Cliente Delivery",
        "customerPhone": phone,
        "address": ADDRESS,
        "paymentMethodId": menu["paymentMethods"][0]["id"],
        "items": [{"productId": first_product(menu)["id"], "quantity": 4}],
    }


def test_limite_por_hora_do_mesmo_telefone(client, menu, monkeypatch):
    monkeypatch.setattr(delivery, "MAX_OPEN_PER_PHONE", 100)
    phone = new_phone()
    statuses = [
        client.post(f"/api/t/{SLUG}/orders", headers={"X-Forwarded-For": f"192.0.2.{i}"}, json=delivery_order_body(menu, phone)).status_code
        for i in range(delivery.PHONE_ORDERS_PER_HOUR + 1)
    ]
    assert statuses[:-1] == [201] * delivery.PHONE_ORDERS_PER_HOUR
    assert statuses[-1] == 429


def test_pedido_gigante_e_recusado(client, menu):
    product = first_product(menu)
    body = delivery_order_body(menu, new_phone())
    body["items"] = [{"productId": product["id"], "quantity": 50}, {"productId": product["id"], "quantity": 50, "optionIds": []}]
    r = client.post(f"/api/t/{SLUG}/orders", json=body)
    assert r.status_code == 400
    assert str(delivery.MAX_UNITS) in r.json()["detail"]


def test_campo_isca_barra_robo(client, menu):
    r = delivery_order(client, menu, website="http://spam.example")
    assert r.status_code == 400


def test_texto_sem_caracteres_de_controle(client, menu):
    r = delivery_order(client, menu, notes="sem\u0000 cebola​\r\npor favor")
    assert r.status_code == 201, r.text
    assert r.json()["notes"] == "sem cebola por favor"


# ---------- Bloqueio de telefone ----------


def test_equipe_bloqueia_telefone_do_pedido(client, menu):
    phone = new_phone()
    r = delivery_order(client, menu, phone=phone)
    assert r.status_code == 201, r.text
    admin = login(client, SLUG)
    b = client.post(f"/api/t/{SLUG}/orders/{r.json()['id']}/block-phone", headers=admin, json={"reason": "Trote"})
    assert b.status_code == 201, b.text

    again = delivery_order(client, menu, phone=phone)
    assert again.status_code == 403
    # retirada também
    body = {**delivery_order_body(menu, phone), "type": "RETIRADA", "address": ""}
    assert client.post(f"/api/t/{SLUG}/orders", json=body).status_code == 403

    blocked = client.get(f"/api/t/{SLUG}/admin/blocked-phones", headers=admin).json()
    entry = next(x for x in blocked if x["phone"] == delivery.format_phone(phone))
    assert entry["reason"] == "Trote"
    assert client.delete(f"/api/t/{SLUG}/admin/blocked-phones/{entry['id']}", headers=admin).status_code == 204
    assert delivery_order(client, menu, phone=phone).status_code == 201


def test_admin_bloqueia_telefone_na_mao(client, menu):
    admin = login(client, SLUG)
    assert client.post(f"/api/t/{SLUG}/admin/blocked-phones", headers=admin, json={"phone": "(11) 99999-9999"}).status_code == 400
    phone = new_phone()
    r = client.post(f"/api/t/{SLUG}/admin/blocked-phones", headers=admin, json={"phone": f"+55 {phone}", "reason": "Calote"})
    assert r.status_code == 201, r.text
    assert delivery_order(client, menu, phone=phone).status_code == 403


def test_bloqueio_de_outro_restaurante_nao_vaza(client, menu, second_tenant):
    other = login(client, second_tenant["slug"], "admin", "senha123")
    assert client.get(f"/api/t/{second_tenant['slug']}/admin/blocked-phones", headers=other).json() == []
    admin = login(client, SLUG)
    mine = client.get(f"/api/t/{SLUG}/admin/blocked-phones", headers=admin).json()
    assert mine
    r = client.delete(f"/api/t/{second_tenant['slug']}/admin/blocked-phones/{mine[0]['id']}", headers=other)
    assert r.status_code == 404


# ---------- Cozinha sem dados do cliente ----------


def test_cozinha_nao_ve_telefone_nem_endereco(client, menu, kitchen_headers):
    r = delivery_order(client, menu)
    assert r.status_code == 201, r.text
    queue = client.get(f"/api/t/{SLUG}/kitchen", headers=kitchen_headers).json()
    mine = next(o for o in queue if o["id"] == r.json()["id"])
    assert "customerPhone" not in mine and "address" not in mine and "addressRef" not in mine
    assert client.get(f"/api/t/{SLUG}/orders", headers=kitchen_headers).status_code == 403
    assert client.get(f"/api/t/{SLUG}/floor", headers=kitchen_headers).status_code == 403
    assert client.post(f"/api/t/{SLUG}/orders/{r.json()['id']}/block-phone", headers=kitchen_headers, json={}).status_code == 403


def test_cozinha_so_mexe_no_preparo(client, menu, kitchen_headers):
    r = delivery_order(client, menu)
    oid = r.json()["id"]
    url = f"/api/t/{SLUG}/orders/{oid}/status"
    assert client.patch(url, headers=kitchen_headers, json={"status": "EM_PREPARO"}).status_code == 200
    assert client.patch(url, headers=kitchen_headers, json={"status": "PRONTO"}).status_code == 200
    assert client.patch(url, headers=kitchen_headers, json={"status": "SAIU_ENTREGA"}).status_code == 403
    assert client.patch(url, headers=kitchen_headers, json={"status": "CANCELADO"}).status_code == 403
    admin = login(client, SLUG)
    assert client.patch(url, headers=admin, json={"status": "SAIU_ENTREGA"}).status_code == 200
    # saiu para entrega: a cozinha não puxa de volta
    assert client.patch(url, headers=kitchen_headers, json={"status": "PRONTO"}).status_code == 403
