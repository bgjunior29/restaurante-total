"""Código Pix "copia e cola" (BR Code estático do Banco Central) com o valor exato do pedido.

O cliente cola o código no app do banco ou lê o QR, e o valor já vem preenchido. Não passa por
nenhum intermediário: o dinheiro cai direto na chave Pix do restaurante. A equipe confere o
recebimento no banco e marca o pedido como pago.
"""
import re
import unicodedata

UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def normalize_key(key: str) -> str:
    """Deixa a chave no formato que o Pix exige: CPF/CNPJ só números, telefone +55..., e-mail minúsculo."""
    key = key.strip()
    if "@" in key:
        return key.lower()
    if UUID.match(key):
        return key.lower()  # chave aleatória
    digits = re.sub(r"\D", "", key)
    if key.startswith("+") or "(" in key:
        return f"+{digits}" if key.startswith("+") else f"+55{digits}"
    return digits  # CPF (11) ou CNPJ (14)


def _ascii(text: str, limit: int) -> str:
    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z0-9 ]", "", plain).strip().upper()[:limit]


def _field(tag: str, value: str) -> str:
    return f"{tag}{len(value):02d}{value}"


def _crc16(payload: str) -> str:
    crc = 0xFFFF
    for byte in payload.encode():
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else crc << 1
            crc &= 0xFFFF
    return f"{crc:04X}"


def pix_code(key: str, name: str, city: str, amount_cents: int, txid: str) -> str:
    account = _field("00", "br.gov.bcb.pix") + _field("01", normalize_key(key))
    payload = (
        _field("00", "01")
        + _field("26", account)
        + _field("52", "0000")
        + _field("53", "986")  # real
        + _field("54", f"{amount_cents / 100:.2f}")
        + _field("58", "BR")
        + _field("59", _ascii(name, 25) or "RESTAURANTE")
        + _field("60", _ascii(city, 15) or "BRASIL")
        + _field("62", _field("05", re.sub(r"[^A-Za-z0-9]", "", txid)[:25] or "***"))
        + "6304"
    )
    return payload + _crc16(payload)


def city_from_address(address: str) -> str:
    """Cidade para o código Pix, tirada do endereço ("Rua X, 10, Bairro, Barueri - SP" → Barueri)."""
    parts = [p.strip() for p in re.split(r"[,\-/]", address) if p.strip()]
    for part in reversed(parts):
        words = re.sub(r"\d", "", part).strip()
        if len(words) > 2 and words.lower() not in {"brasil", "brazil"}:
            return words
    return ""
