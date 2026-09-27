"""Avisos por WhatsApp (API Cloud da Meta), trazidos do sistema integrado.

Funciona em dois níveis:
1. Sempre: a equipe tem um botão que abre o WhatsApp com a mensagem pronta (link wa.me, feito no frontend).
2. Automático: se o servidor tiver WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID e o restaurante ligar
   "Avisar clientes pelo WhatsApp", cada mudança de status de retirada/delivery vira mensagem.

O envio roda em segundo plano e nunca derruba o pedido: falhou, só registra no log.
"""
import asyncio
import json
import logging
import os
import re
import urllib.request

log = logging.getLogger("restaurantetotal.whatsapp")

API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v21.0")

STATUS_TEXT = {
    "RECEBIDO": "recebemos seu pedido e ele já está na fila da cozinha",
    "EM_PREPARO": "seu pedido está sendo preparado",
    "PRONTO": {"RETIRADA": "seu pedido está pronto para retirada", "DELIVERY": "seu pedido está pronto e aguarda o entregador"},
    "SAIU_ENTREGA": "seu pedido saiu para entrega",
    "ENTREGUE": {"RETIRADA": "pedido retirado. Bom apetite!", "DELIVERY": "pedido entregue. Bom apetite!"},
    "CANCELADO": "seu pedido foi cancelado. Fale com a gente se tiver dúvidas",
}


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        return ""
    return digits if digits.startswith("55") else f"55{digits}"


def configured() -> bool:
    return bool(os.getenv("WHATSAPP_ACCESS_TOKEN") and os.getenv("WHATSAPP_PHONE_NUMBER_ID"))


def status_message(tenant_name: str, order, track_url: str = "") -> str:
    text = STATUS_TEXT.get(order.status, order.status)
    if isinstance(text, dict):
        text = text.get(order.type, next(iter(text.values())))
    name = f"{order.customerName}, " if order.customerName else ""
    lines = [f"*{tenant_name}* · pedido {order.code}", f"Olá, {name}{text}."]
    if track_url:
        lines.append(f"Acompanhe: {track_url}")
    return "\n".join(lines)


def _send_sync(to: str, body: str) -> None:
    url = f"https://graph.facebook.com/{API_VERSION}/{os.environ['WHATSAPP_PHONE_NUMBER_ID']}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"preview_url": False, "body": body[:4096]},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {os.environ['WHATSAPP_ACCESS_TOKEN']}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as res:  # noqa: S310 (endereço fixo da Meta)
        res.read()


async def notify_status(tenant, order, track_url: str = "") -> None:
    """Dispara o aviso sem bloquear a resposta da API."""
    if order.type == "MESA" or not tenant.notifyWhatsapp or not configured():
        return
    to = normalize_phone(order.customerPhone)
    if not to:
        return

    async def run():
        try:
            await asyncio.to_thread(_send_sync, to, status_message(tenant.name, order, track_url))
        except Exception:
            log.exception("Falha ao enviar WhatsApp do pedido %s", order.code)

    asyncio.create_task(run())
