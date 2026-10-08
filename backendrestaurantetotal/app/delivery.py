"""Proteções dos pedidos para levar (delivery e retirada), que chegam por um link aberto a qualquer pessoa.

Na mesa, o QR com chave já prova que a pessoa está no salão. No delivery não há isso, então:
- telefone brasileiro válido (DDD existente, celular com 9 na frente, sem 99999-9999 ou 91111-1111);
- telefone bloqueado pela equipe (trote, calote) não pede;
- no máximo MAX_OPEN_PER_PHONE pedidos em andamento e PHONE_ORDERS_PER_HOUR por hora no mesmo telefone;
- limite por aparelho (IP) menor que o da mesa, que divide o Wi-Fi do salão;
- teto de unidades por pedido e campo-isca (honeypot) que só robô preenche.
"""
import unicodedata

from fastapi import HTTPException, Request

from . import ratelimit
from .db import db

MAX_OPEN_PER_PHONE = 3
PHONE_ORDERS_PER_HOUR = 6
TAKEOUT_PER_IP = 12  # pedidos para levar a cada 10 min, por aparelho
MAX_UNITS = 80  # unidades num pedido para levar; acima disso, só falando com o restaurante
OPEN_STATUSES = ["RECEBIDO", "EM_PREPARO", "PRONTO", "SAIU_ENTREGA"]

# DDDs em uso no Brasil (Anatel).
DDDS = {
    11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46,
    47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85,
    86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
}


def phone_digits(raw: str) -> str:
    digits = "".join(c for c in raw if c.isdigit())
    if len(digits) in (12, 13) and digits.startswith("55"):  # +55 na frente
        digits = digits[2:]
    return digits


def valid_phone(digits: str) -> bool:
    if len(digits) not in (10, 11) or int(digits[:2]) not in DDDS:
        return False
    number = digits[2:]
    if len(number) == 9 and number[0] != "9":  # celular
        return False
    if len(number) == 8 and number[0] not in "2345":  # fixo
        return False
    return len(set(number[1:])) > 1  # 99999-9999, 91111-1111, 3333-3333


def format_phone(digits: str) -> str:
    """(11) 98888-7777 — formato único, para contar os pedidos do mesmo telefone."""
    return f"({digits[:2]}) {digits[2:-4]}-{digits[-4:]}"


def clean_text(value: str) -> str:
    """Tira caracteres de controle/invisíveis (quebram a comanda impressa e a mensagem do WhatsApp)."""
    kept = "".join(" " if c in "\r\n\t" else c for c in value if c in "\r\n\t" or unicodedata.category(c) not in ("Cc", "Cf"))
    return " ".join(kept.split())


async def check_takeout(tenant_id: int, phone_raw: str, units: int, request: Request) -> str:
    """Barra pedido de delivery/retirada suspeito. Devolve o telefone no formato padrão."""
    ratelimit.hit(f"takeout:{tenant_id}", request, TAKEOUT_PER_IP, 10 * 60, "Muitos pedidos seguidos deste aparelho. Aguarde alguns minutos.")
    digits = phone_digits(phone_raw)
    if not valid_phone(digits):
        raise HTTPException(400, "Informe um telefone válido com DDD, ex.: (11) 98888-7777.")
    if units > MAX_UNITS:
        raise HTTPException(400, f"Pedidos com mais de {MAX_UNITS} itens só por telefone. Fale com o restaurante.")
    if await db.blockedphone.find_first(where={"tenantId": tenant_id, "phone": digits}):
        raise HTTPException(403, "Não conseguimos aceitar pedidos deste telefone pelo site. Fale com o restaurante.")
    phone = format_phone(digits)
    open_now = await db.order.count(
        where={"tenantId": tenant_id, "customerPhone": phone, "type": {"not": "MESA"}, "status": {"in": OPEN_STATUSES}}
    )
    if open_now >= MAX_OPEN_PER_PHONE:
        raise HTTPException(
            429, f"Você já tem {open_now} pedidos em andamento. Aguarde a entrega de um deles para pedir de novo."
        )
    ratelimit.hit_key(
        f"phone:{tenant_id}:{digits}", PHONE_ORDERS_PER_HOUR, 60 * 60, "Muitos pedidos deste telefone na última hora. Fale com o restaurante."
    )
    return phone
