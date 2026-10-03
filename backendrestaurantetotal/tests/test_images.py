"""Upload de fotos: só administradores, só imagens de verdade, servidas com cache longo."""
import base64

from .conftest import login, platform_login

SLUG = "cantina-da-nonna"
# PNG 1x1 válido
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")


def data_url(raw: bytes, kind: str = "image/png") -> str:
    return f"data:{kind};base64," + base64.b64encode(raw).decode()


def test_envia_e_serve_a_foto(client):
    r = client.post(f"/api/t/{SLUG}/admin/images", headers=login(client, SLUG), json={"dataBase64": data_url(PNG)})
    assert r.status_code == 201, r.text
    url = r.json()["url"]
    assert url.startswith("/api/img/")
    img = client.get(url)
    assert img.status_code == 200
    assert img.content == PNG
    assert img.headers["content-type"] == "image/png"
    assert "immutable" in img.headers["cache-control"]


def test_foto_enviada_pode_ir_no_produto(client):
    headers = login(client, SLUG)
    url = client.post(f"/api/t/{SLUG}/admin/images", headers=headers, json={"dataBase64": data_url(PNG)}).json()["url"]
    category = client.get(f"/api/t/{SLUG}/admin/categories", headers=headers).json()[0]
    r = client.post(
        f"/api/t/{SLUG}/admin/products",
        headers=headers,
        json={"name": "Produto com foto", "priceCents": 1000, "categoryId": category["id"], "imageUrl": url},
    )
    assert r.status_code == 201, r.text
    assert r.json()["imageUrl"] == url


def test_recusa_arquivo_que_nao_e_imagem(client):
    fake = data_url(b"<script>alert(1)</script>" * 5, "image/png")
    r = client.post(f"/api/t/{SLUG}/admin/images", headers=login(client, SLUG), json={"dataBase64": fake})
    assert r.status_code == 400


def test_recusa_foto_grande_demais(client):
    big = data_url(PNG + b"0" * (850 * 1024))
    r = client.post(f"/api/t/{SLUG}/admin/images", headers=login(client, SLUG), json={"dataBase64": big})
    assert r.status_code in (413, 422)


def test_upload_exige_login(client):
    r = client.post(f"/api/t/{SLUG}/admin/images", json={"dataBase64": data_url(PNG)})
    assert r.status_code == 401


def test_plataforma_envia_logo(client, second_tenant):
    r = client.post(f"/api/platform/tenants/{second_tenant['id']}/images", headers=platform_login(client), json={"dataBase64": data_url(PNG)})
    assert r.status_code == 201, r.text


def test_imagem_inexistente(client):
    assert client.get("/api/img/nao-existe").status_code == 404
