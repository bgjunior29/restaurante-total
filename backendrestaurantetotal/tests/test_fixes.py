"""Correções da revisão técnica: estoque no cancelamento, cancelamento repetido, limite do cupom e painel da plataforma."""
from .conftest import login, platform_login

SLUG = "cantina-da-nonna"


def new_product(client, headers, name: str, stock: int) -> dict:
    category = client.get(f"/api/t/{SLUG}/admin/categories", headers=headers).json()[0]
    r = client.post(
        f"/api/t/{SLUG}/admin/products",
        headers=headers,
        json={"name": name, "priceCents": 2000, "categoryId": category["id"], "stockQty": stock, "lowStockAt": 0},
    )
    assert r.status_code == 201, r.text
    return r.json()


def product(client, headers, pid: int) -> dict:
    return next(p for p in client.get(f"/api/t/{SLUG}/admin/products", headers=headers).json() if p["id"] == pid)


def order(client, pid: int, qty: int = 1, coupon: str = "") -> dict:
    pay = client.get(f"/api/t/{SLUG}/menu").json()["paymentMethods"][0]["id"]
    return client.post(
        f"/api/t/{SLUG}/orders",
        json={
            "type": "RETIRADA",
            "customerName": "Cliente",
            "customerPhone": "11999998888",
            "paymentMethodId": pay,
            "couponCode": coupon,
            "items": [{"productId": pid, "quantity": qty}],
        },
    )


def cancel(client, headers, order_id: int):
    return client.patch(f"/api/t/{SLUG}/orders/{order_id}/status", headers=headers, json={"status": "CANCELADO"})


def test_cancelar_devolve_produto_que_esgotou(client):
    headers = login(client, SLUG)
    p = new_product(client, headers, "Última fatia", stock=1)
    r = order(client, p["id"])
    assert r.status_code == 201, r.text
    assert product(client, headers, p["id"])["available"] is False  # zerou e saiu do cardápio

    assert cancel(client, headers, r.json()["id"]).status_code == 200
    after = product(client, headers, p["id"])
    assert after["stockQty"] == 1
    assert after["available"] is True  # voltou para o cardápio


def test_produto_desligado_pelo_dono_continua_desligado(client):
    headers = login(client, SLUG)
    p = new_product(client, headers, "Desligado à mão", stock=3)
    r = order(client, p["id"])
    client.put(
        f"/api/t/{SLUG}/admin/products/{p['id']}",
        headers=headers,
        json={**{k: product(client, headers, p["id"])[k] for k in ("name", "priceCents", "categoryId", "stockQty", "lowStockAt")}, "available": False},
    )
    cancel(client, headers, r.json()["id"])
    after = product(client, headers, p["id"])
    assert after["stockQty"] == 3
    assert after["available"] is False


def test_cancelar_duas_vezes_nao_devolve_em_dobro(client):
    headers = login(client, SLUG)
    p = new_product(client, headers, "Estoque contado", stock=5)
    oid = order(client, p["id"], qty=2).json()["id"]
    assert cancel(client, headers, oid).status_code == 200
    assert cancel(client, headers, oid).status_code == 200  # repetir não faz nada
    assert product(client, headers, p["id"])["stockQty"] == 5


def test_cupom_respeita_limite_de_usos(client):
    headers = login(client, SLUG)
    r = client.post(f"/api/t/{SLUG}/admin/coupons", headers=headers, json={"code": "UMAVEZ", "kind": "FIXED", "value": 500, "maxUses": 1})
    assert r.status_code == 201, r.text
    p = new_product(client, headers, "Produto do cupom", stock=10)
    first = order(client, p["id"], coupon="UMAVEZ")
    assert first.status_code == 201, first.text
    assert first.json()["discountCents"] == 500
    second = order(client, p["id"], coupon="UMAVEZ")
    assert second.status_code == 400
    assert product(client, headers, p["id"])["stockQty"] == 9  # o pedido recusado não baixou estoque


def test_painel_da_plataforma_mostra_o_uso(client, second_tenant):
    order(client, client.get(f"/api/t/{SLUG}/menu").json()["categories"][0]["products"][0]["id"])
    rows = {t["slug"]: t for t in client.get("/api/platform/tenants", headers=platform_login(client)).json()}
    cantina, pizzaria = rows[SLUG], rows[second_tenant["slug"]]
    assert cantina["orders30d"] >= 1
    assert cantina["revenue30dCents"] > 0
    assert cantina["users"] >= 1 and cantina["tables"] >= 1
    assert cantina["lastOrderAt"] is not None
    assert pizzaria["orders30d"] == 0 and pizzaria["lastOrderAt"] is None
