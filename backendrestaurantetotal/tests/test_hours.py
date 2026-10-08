"""Horário de atendimento por dia: validado na gestão e mostrado no cardápio."""
from .conftest import login

SLUG = "cantina-da-nonna"
WEEK = [[], *[[{"open": "11:30", "close": "15:00"}, {"open": "19:00", "close": "23:30"}]] * 5, [{"open": "18:00", "close": "02:00"}]]


def identity(client, headers):
    return client.get(f"/api/t/{SLUG}/admin/identity", headers=headers).json()


def test_horarios_salvos_aparecem_no_cardapio(client):
    headers = login(client, SLUG)
    body = {**identity(client, headers), "weeklyHours": WEEK}
    r = client.put(f"/api/t/{SLUG}/admin/identity", headers=headers, json=body)
    assert r.status_code == 200, r.text
    assert r.json()["weeklyHours"] == WEEK
    assert client.get(f"/api/t/{SLUG}/menu").json()["weeklyHours"] == WEEK
    assert client.get(f"/api/t/{SLUG}/info").json()["weeklyHours"] == WEEK

    # vazio = não informado
    r = client.put(f"/api/t/{SLUG}/admin/identity", headers=headers, json={**body, "weeklyHours": []})
    assert r.json()["weeklyHours"] == []


def test_horarios_invalidos_sao_recusados(client):
    headers = login(client, SLUG)
    base = identity(client, headers)
    bad = [
        WEEK[:6],  # faltando um dia
        [[{"open": "25:00", "close": "15:00"}]] * 7,
        [[{"open": "11:00", "close": "11:00"}]] * 7,
        [[{"open": "08:00", "close": "10:00"}] * 4] * 7,  # 4 horários num dia
    ]
    for week in bad:
        r = client.put(f"/api/t/{SLUG}/admin/identity", headers=headers, json={**base, "weeklyHours": week})
        assert r.status_code == 422, week
