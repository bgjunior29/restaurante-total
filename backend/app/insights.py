"""Inteligência operacional do restaurante.

Evolução da camada Python do sistema integrado (DemandForecast, ProductRecommendation, DelayDetector,
PromotionAdvisor, InventoryManager): lá eram protótipos com dados simulados; aqui tudo roda sobre os
pedidos reais de cada restaurante, sem serviço externo e sem custo.
"""
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from itertools import combinations

from .db import db
from .timeutil import APP_TZ

WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]


def _local(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(APP_TZ)


def _minutes(a: datetime | None, b: datetime | None) -> float | None:
    if not a or not b:
        return None
    a = a if a.tzinfo else a.replace(tzinfo=timezone.utc)
    b = b if b.tzinfo else b.replace(tzinfo=timezone.utc)
    return (b - a).total_seconds() / 60


def product_pairs(orders, limit: int = 3) -> dict[int, list[int]]:
    """"Quem pede X também pede Y": produtos que mais aparecem juntos no mesmo pedido."""
    together: dict[int, Counter] = defaultdict(Counter)
    for o in orders:
        ids = sorted({i.productId for i in (o.items or []) if i.productId})
        for a, b in combinations(ids, 2):
            together[a][b] += 1
            together[b][a] += 1
    return {pid: [other for other, n in c.most_common(limit) if n >= 2] for pid, c in together.items()}


async def recent_pairs(tenant_id: int) -> dict[int, list[int]]:
    since = datetime.now(timezone.utc) - timedelta(days=60)
    orders = await db.order.find_many(
        where={"tenantId": tenant_id, "createdAt": {"gte": since}, "status": {"not": "CANCELADO"}},
        include={"items": True},
        order={"createdAt": "desc"},
        take=600,
    )
    return product_pairs(orders)


async def build_insights(tenant, days: int = 30) -> dict:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    orders = await db.order.find_many(
        where={"tenantId": tenant.id, "createdAt": {"gte": since}, "status": {"not": "CANCELADO"}},
        include={"items": True},
    )
    cancelled = await db.order.count(where={"tenantId": tenant.id, "createdAt": {"gte": since}, "status": "CANCELADO"})

    # ---- Demanda por hora e dia da semana (DemandForecast)
    by_hour = Counter()
    by_weekday = Counter()
    revenue_by_weekday = Counter()
    days_seen: dict[int, set] = defaultdict(set)
    for o in orders:
        lt = _local(o.createdAt)
        by_hour[lt.hour] += 1
        by_weekday[lt.weekday()] += 1
        revenue_by_weekday[lt.weekday()] += o.totalCents
        days_seen[lt.weekday()].add(lt.date())

    today = datetime.now(APP_TZ)
    wd = today.weekday()
    n_days = max(1, len(days_seen[wd]))
    today_hours = Counter(_local(o.createdAt).hour for o in orders if _local(o.createdAt).weekday() == wd)
    forecast = {
        "weekday": WEEKDAYS[wd],
        "expectedOrders": round(by_weekday[wd] / n_days) if days_seen[wd] else None,
        "expectedRevenueCents": revenue_by_weekday[wd] // n_days if days_seen[wd] else None,
        "peakHour": today_hours.most_common(1)[0][0] if today_hours else None,
        "basedOnDays": len(days_seen[wd]),
    }

    # ---- Tempos de preparo e atraso (DelayDetector)
    prep = [m for o in orders if (m := _minutes(o.createdAt, o.readyAt)) is not None and 0 <= m < 600]
    late = [m for m in prep if m > tenant.lateAfterMin]
    by_type = Counter(o.type for o in orders)

    # ---- Produtos: mais vendidos, parados e pares (ProductRecommendation / PromotionAdvisor)
    sold = Counter()
    revenue_item = Counter()
    for o in orders:
        for i in o.items or []:
            if i.productId:
                sold[i.productId] += i.quantity
                revenue_item[i.productId] += i.quantity * i.unitPriceCents
    products = await db.product.find_many(where={"tenantId": tenant.id})
    names = {p.id: p.name for p in products}
    # Parado = disponível há mais de 7 dias e sem nenhuma venda no período.
    slow = [p for p in products if p.available and sold[p.id] == 0 and (_minutes(p.createdAt, now) or 0) > 7 * 24 * 60]
    pairs = product_pairs(orders)
    top_pairs = []
    seen = set()
    for a, others in pairs.items():
        for b in others[:1]:
            key = tuple(sorted((a, b)))
            if key not in seen and a in names and b in names:
                seen.add(key)
                top_pairs.append({"a": names[a], "b": names[b]})
    low_stock = [
        {"id": p.id, "name": p.name, "stockQty": p.stockQty, "lowStockAt": p.lowStockAt}
        for p in products
        if p.stockQty is not None and p.stockQty <= p.lowStockAt
    ]

    # ---- Avaliações
    reviews = await db.review.find_many(
        where={"tenantId": tenant.id, "createdAt": {"gte": since}}, order={"createdAt": "desc"}, include={"order": True}
    )
    rating = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else None

    total = sum(o.totalCents for o in orders)
    ticket = total // len(orders) if orders else 0

    # ---- Recomendações em linguagem simples
    tips: list[str] = []
    if forecast["expectedOrders"]:
        peak = f", com pico por volta das {forecast['peakHour']}h" if forecast["peakHour"] is not None else ""
        tips.append(
            f"Hoje ({forecast['weekday']}) a média é de {forecast['expectedOrders']} "
            f"pedido{'' if forecast['expectedOrders'] == 1 else 's'}{peak}. Reforce a equipe nesse horário."
        )
    if prep and len(late) / len(prep) > 0.25:
        tips.append(
            f"{round(100 * len(late) / len(prep))}% dos pedidos passaram de {tenant.lateAfterMin} min de preparo. "
            "Revise a fila da cozinha ou o tempo prometido."
        )
    if low_stock:
        tips.append("Estoque baixo: " + ", ".join(i["name"] for i in low_stock[:5]) + ". Programe a reposição.")
    if slow:
        tips.append(
            "Sem vendas no período: "
            + ", ".join(p.name for p in slow[:4])
            + ". Vale uma promoção com cupom, destaque no cardápio ou tirar do cardápio."
        )
    if top_pairs:
        p = top_pairs[0]
        tips.append(f"\"{p['a']}\" e \"{p['b']}\" saem muito juntos: monte um combo. O cardápio já sugere um ao outro.")
    if orders and ticket < 4000 and tenant.deliveryEnabled:
        tips.append("Ticket médio abaixo de R$ 40: um cupom com pedido mínimo ajuda a aumentar o valor dos pedidos.")
    if rating is not None and rating < 4:
        tips.append(f"A nota média está em {rating:.1f}. Leia os comentários abaixo para achar o que melhorar.")
    if orders and cancelled / (len(orders) + cancelled) > 0.1:
        tips.append("Mais de 10% dos pedidos foram cancelados. Confira se há itens em falta no cardápio.")
    if not tips:
        tips.append("Tudo dentro do esperado. Continue acompanhando por aqui.")

    return {
        "days": days,
        "orders": len(orders),
        "cancelled": cancelled,
        "revenueCents": total,
        "averageTicketCents": ticket,
        "byType": dict(by_type),
        "byHour": [{"hour": h, "orders": by_hour[h]} for h in range(24)],
        "byWeekday": [
            {"weekday": WEEKDAYS[d], "orders": by_weekday[d], "avgOrders": round(by_weekday[d] / max(1, len(days_seen[d])), 1)}
            for d in range(7)
        ],
        "forecast": forecast,
        "prep": {
            "avgMinutes": round(sum(prep) / len(prep), 1) if prep else None,
            "lateCount": len(late),
            "measured": len(prep),
            "lateAfterMin": tenant.lateAfterMin,
        },
        "topProducts": [
            {"name": names.get(pid, "?"), "quantity": q, "revenueCents": revenue_item[pid]} for pid, q in sold.most_common(8)
        ],
        "slowProducts": [p.name for p in slow[:10]],
        "pairs": top_pairs[:6],
        "lowStock": low_stock,
        "rating": {"average": rating, "count": len(reviews)},
        "reviews": [
            {"rating": r.rating, "comment": r.comment, "code": r.order.code if r.order else "", "createdAt": r.createdAt.isoformat()}
            for r in reviews[:10]
        ],
        "tips": tips,
    }
