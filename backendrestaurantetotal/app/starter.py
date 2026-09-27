"""Conteúdo inicial de um restaurante novo: cardápio de exemplo com estações, adicionais, pagamentos,
um cupom de boas-vindas e mesas. O dono edita tudo depois na Gestão."""
from .db import db
from .tables import new_qr_key

# categoria: (estação, [(nome, descrição, preço, [grupos de adicionais], estoque ou None)])
MENU = {
    "Entradas": (
        "COZINHA",
        [
            ("Bruschetta da Casa", "Pão italiano, tomate, manjericão e azeite.", 2890, [], None),
            ("Bolinho de Bacalhau", "6 unidades, com maionese de limão.", 3690, [], 30),
        ],
    ),
    "Pratos principais": (
        "COZINHA",
        [
            ("Filé à Parmegiana", "Filé empanado, molho de tomate e queijo gratinado.", 6890, ["Acompanhamento"], None),
            ("Risoto de Cogumelos", "Arbóreo, mix de cogumelos e parmesão.", 5990, [], None),
            ("Picanha na Chapa", "300 g, com farofa e vinagrete.", 8990, ["Ponto da carne", "Acompanhamento"], 20),
            ("Salmão Grelhado", "Com legumes salteados.", 7490, ["Acompanhamento"], None),
        ],
    ),
    "Bebidas": (
        "BAR",
        [
            ("Suco Natural", "Copo 400 ml.", 1390, ["Sabor do suco"], None),
            ("Refrigerante", "Lata 350 ml.", 790, [], None),
            ("Água Mineral", "Com ou sem gás, 500 ml.", 590, [], None),
            ("Caipirinha", "Limão, cachaça artesanal.", 2290, [], None),
        ],
    ),
    "Sobremesas": (
        "CONFEITARIA",
        [
            ("Petit Gâteau", "Com sorvete de creme.", 2990, [], 15),
            ("Pudim da Vó", "Fatia generosa.", 1890, [], None),
        ],
    ),
}

OPTION_GROUPS = [
    # nome, mínimo, máximo, [(opção, preço)]
    ("Ponto da carne", 1, 1, [("Mal passada", 0), ("Ao ponto", 0), ("Bem passada", 0)]),
    ("Acompanhamento", 1, 2, [("Arroz", 0), ("Fritas", 0), ("Purê", 0), ("Salada", 0), ("Legumes", 500)]),
    ("Sabor do suco", 1, 1, [("Laranja", 0), ("Limão", 0), ("Abacaxi com hortelã", 0), ("Maracujá", 0)]),
]

PAYMENTS = [("Pix", "PIX"), ("Cartão de crédito", "CARD"), ("Cartão de débito", "CARD"), ("Dinheiro", "CASH")]


async def create_payment_methods(tenant_id: int) -> None:
    for i, (name, kind) in enumerate(PAYMENTS):
        await db.paymentmethod.create(data={"tenantId": tenant_id, "name": name, "kind": kind, "sortOrder": i})


async def create_starter_content(tenant_id: int, tables: int = 6) -> None:
    groups = {}
    for i, (name, mn, mx, options) in enumerate(OPTION_GROUPS):
        g = await db.optiongroup.create(
            data={"tenantId": tenant_id, "name": name, "minSelect": mn, "maxSelect": mx, "sortOrder": i}
        )
        for j, (opt, price) in enumerate(options):
            await db.option.create(data={"groupId": g.id, "name": opt, "priceCents": price, "sortOrder": j})
        groups[name] = g.id

    for c_order, (cat_name, (station, products)) in enumerate(MENU.items()):
        cat = await db.category.create(
            data={"tenantId": tenant_id, "name": cat_name, "station": station, "sortOrder": c_order}
        )
        for p_order, (name, desc, price, group_names, stock) in enumerate(products):
            p = await db.product.create(
                data={
                    "tenantId": tenant_id,
                    "name": name,
                    "description": desc,
                    "priceCents": price,
                    "categoryId": cat.id,
                    "sortOrder": p_order,
                    "stockQty": stock,
                }
            )
            for gname in group_names:
                await db.productoptiongroup.create(data={"productId": p.id, "groupId": groups[gname]})

    await create_payment_methods(tenant_id)
    await db.coupon.create(
        data={"tenantId": tenant_id, "code": "BEMVINDO10", "kind": "PERCENT", "value": 10, "minOrderCents": 5000}
    )

    for n in range(1, tables + 1):
        await db.table.create(data={"tenantId": tenant_id, "number": n, "label": f"Mesa {n:02d}", "seats": 4, "qrKey": new_qr_key()})
