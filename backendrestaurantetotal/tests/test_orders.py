"""Pedidos: o preço vem sempre do banco, nunca do celular do cliente."""
from .conftest import new_phone

SLUG = "cantina-da-nonna"


def first_product(menu: dict) -> dict:
    return next(p for c in menu["categories"] for p in c["products"] if not p["optionGroups"])


def pickup_order(client, product: dict, payment_id: int, headers: dict | None = None, **extra):
    return client.post(
        f"/api/t/{SLUG}/orders",
        headers=headers or {},
        json={
            "type": "RETIRADA",
            "customerName": "Cliente Teste",
            "customerPhone": new_phone(),
            "paymentMethodId": payment_id,
            "items": [{"productId": product["id"], "quantity": 2, "priceCents": 1}],  # preço falso é ignorado
            **extra,
        },
    )


def test_total_calculado_no_servidor(client):
    menu = client.get(f"/api/t/{SLUG}/menu").json()
    product = first_product(menu)
    r = pickup_order(client, product, menu["paymentMethods"][0]["id"], totalCents=1)
    assert r.status_code == 201, r.text
    assert r.json()["totalCents"] == product["priceCents"] * 2


def test_forma_de_pagamento_de_outro_restaurante_e_recusada(client, second_tenant):
    other_menu = client.get(f"/api/t/{second_tenant['slug']}/menu").json()
    menu = client.get(f"/api/t/{SLUG}/menu").json()
    r = pickup_order(client, first_product(menu), other_menu["paymentMethods"][0]["id"])
    assert r.status_code == 400


def test_pedido_de_mesa_exige_chave_do_qr(client):
    menu = client.get(f"/api/t/{SLUG}/menu").json()
    r = client.post(
        f"/api/t/{SLUG}/orders",
        json={"type": "MESA", "tableNumber": 1, "tableKey": "chave-errada", "items": [{"productId": first_product(menu)["id"], "quantity": 1}]},
    )
    assert r.status_code in (400, 403, 404)


def test_limite_de_pedidos_por_aparelho(client):
    """Para levar o limite é menor que o da mesa (que divide o Wi-Fi do salão)."""
    from app import delivery

    menu = client.get(f"/api/t/{SLUG}/menu").json()
    product, pay = first_product(menu), menu["paymentMethods"][0]["id"]
    headers = {"X-Forwarded-For": "203.0.113.9"}
    statuses = [pickup_order(client, product, pay, headers).status_code for _ in range(delivery.TAKEOUT_PER_IP + 1)]
    assert statuses[:-1] == [201] * delivery.TAKEOUT_PER_IP
    assert statuses[-1] == 429
