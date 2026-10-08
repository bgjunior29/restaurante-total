"""Limite de tentativas em memória: protege o login contra quem tenta senhas sem parar
e o envio de pedidos/chamados contra quem enche a cozinha de pedidos falsos.

Vale para um processo só (um uvicorn), como o cache. Reiniciar o servidor zera os contadores.
"""
import os
import secrets
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request
from starlette.requests import HTTPConnection

LOGIN_WINDOW = 15 * 60  # segundos
LOGIN_MAX_PER_IP_USER = 5  # erros seguidos do mesmo aparelho no mesmo usuário
LOGIN_MAX_PER_USER = 20  # erros no mesmo usuário vindos de qualquer lugar

ORIGIN_HEADER = "x-origin-secret"  # a Vercel coloca em toda requisição que repassa para a API (vercel.json)

_hits: dict[str, deque] = defaultdict(deque)


def origin_secret() -> str:
    return os.getenv("ORIGIN_SECRET", "")


def from_vercel(conn: HTTPConnection) -> bool:
    """A requisição veio pela Vercel (traz o segredo combinado), e não direto no Render."""
    secret = origin_secret()
    given = conn.headers.get(ORIGIN_HEADER, "")
    return bool(secret) and secrets.compare_digest(given.encode(), secret.encode())


def client_ip(conn: HTTPConnection) -> str:
    """IP do cliente.

    - Pela Vercel (segredo confere): x-real-ip, que a Vercel preenche com o IP do visitante.
    - WebSocket (vai direto ao Render): CF-Connecting-IP, que o Cloudflare na frente do Render preenche.
    - Sem ORIGIN_SECRET configurado (PC, testes): primeiro valor de X-Forwarded-For. O Render não limpa esse
      cabeçalho, então ele só é confiável quando a API recusa quem não vem pela Vercel (guards.OriginGuard).
    """
    headers = conn.headers
    real = headers.get("x-real-ip", "").strip()
    if real and from_vercel(conn):
        return real
    cloudflare = headers.get("cf-connecting-ip", "").strip()
    if cloudflare and conn.scope["type"] == "websocket":
        return cloudflare
    forwarded = headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return conn.client.host if conn.client else "?"


def _recent(key: str, window: int) -> deque:
    hits = _hits[key]
    limit = time.monotonic() - window
    while hits and hits[0] < limit:
        hits.popleft()
    if not hits:
        _hits.pop(key, None)
        hits = _hits[key]
    return hits


def _wait_minutes(hits: deque, window: int) -> int:
    return max(1, int((hits[0] + window - time.monotonic()) // 60) + 1)


def check_login(scope: str, request: Request, username: str) -> None:
    """Chame antes de conferir a senha. Bloqueia com 429 quem errou demais."""
    ip = client_ip(request)
    for key, limit in ((f"login:{scope}:{ip}:{username}", LOGIN_MAX_PER_IP_USER), (f"login:{scope}:{username}", LOGIN_MAX_PER_USER)):
        hits = _recent(key, LOGIN_WINDOW)
        if len(hits) >= limit:
            raise HTTPException(429, f"Muitas tentativas erradas. Tente de novo em {_wait_minutes(hits, LOGIN_WINDOW)} min.")


def login_failed(scope: str, request: Request, username: str) -> None:
    now = time.monotonic()
    ip = client_ip(request)
    _hits[f"login:{scope}:{ip}:{username}"].append(now)
    _hits[f"login:{scope}:{username}"].append(now)


def login_ok(scope: str, request: Request, username: str) -> None:
    """Senha certa: zera os erros deste aparelho (os do usuário expiram sozinhos)."""
    _hits.pop(f"login:{scope}:{client_ip(request)}:{username}", None)


def hit(name: str, request: Request, limit: int, window: int, message: str) -> None:
    """Conta uma ação do aparelho e bloqueia com 429 ao passar de `limit` em `window` segundos."""
    hit_key(f"{name}:{client_ip(request)}", limit, window, message)


def hit_key(key: str, limit: int, window: int, message: str) -> None:
    """Como `hit`, mas por uma chave qualquer (ex.: telefone), valendo para todos os aparelhos."""
    hits = _recent(key, window)
    if len(hits) >= limit:
        raise HTTPException(429, message)
    hits.append(time.monotonic())


def reset() -> None:
    """Usado pelos testes."""
    _hits.clear()
