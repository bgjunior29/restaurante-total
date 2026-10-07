"""Pix copia e cola: código válido (CRC do Banco Central) com o valor do pedido."""
from app.pix import _crc16, city_from_address, normalize_key, pix_code

from .conftest import login
from .test_orders import SLUG, first_product, pickup_order


def test_crc_do_exemplo_do_banco_central():
    payload = (
        "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000"
        "5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304"
    )
    assert _crc16(payload) == "1D3D"


def test_chaves_normalizadas():
    assert normalize_key("123.456.789-09") == "12345678909"
    assert normalize_key("12.345.678/0001-90") == "12345678000190"
    assert normalize_key("(11) 99999-8888") == "+5511999998888"
    assert normalize_key("+55 11 99999-8888") == "+5511999998888"
    assert normalize_key("Loja@Exemplo.com") == "loja@exemplo.com"


def test_cidade_tirada_do_endereco():
    assert city_from_address("R. Santo Antonio, 02 Jardim Belval, Barueri, Brazil 06420430") == "Barueri"
    assert city_from_address("Rua X, 10 - Centro - São Paulo/SP") == "São Paulo"


def test_codigo_tem_valor_e_crc():
    code = pix_code("loja@exemplo.com", "Cantina da Nonna", "São Paulo", 4590, "RT-1001")
    assert "5405" + "45.90" in code
    assert "5916CANTINA DA NONNA" in code and "6009SAO PAULO" in code and "0506RT1001" in code
    assert code[-4:] == _crc16(code[:-4])


def test_acompanhamento_mostra_pix_ate_pagar(client):
    headers = login(client, SLUG)
    settings = client.get(f"/api/t/{SLUG}/admin/settings", headers=headers).json()
    assert client.put(f"/api/t/{SLUG}/admin/settings", headers=headers, json={**settings, "pixKey": "loja@exemplo.com"}).status_code == 200

    menu = client.get(f"/api/t/{SLUG}/menu").json()
    pix = next(m for m in menu["paymentMethods"] if m["kind"] == "PIX")
    cash = next(m for m in menu["paymentMethods"] if m["kind"] == "CASH")

    order = pickup_order(client, first_product(menu), pix["id"]).json()
    tracked = client.get(f"/api/t/{SLUG}/track/{order['token']}").json()
    assert tracked["paymentKind"] == "PIX"
    assert f"54{len(f'{order['totalCents'] / 100:.2f}'):02d}{order['totalCents'] / 100:.2f}" in tracked["pixCode"]

    r = client.patch(f"/api/t/{SLUG}/orders/{order['id']}/payment", headers=headers, json={"paid": True})
    assert r.status_code == 200, r.text
    assert client.get(f"/api/t/{SLUG}/track/{order['token']}").json()["pixCode"] is None

    order = pickup_order(client, first_product(menu), cash["id"]).json()
    tracked = client.get(f"/api/t/{SLUG}/track/{order['token']}").json()
    assert tracked["paymentKind"] == "CASH" and tracked["pixCode"] is None
