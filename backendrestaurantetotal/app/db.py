import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from prisma import Prisma


def _postgres_url() -> str | None:
    """Ajusta a URL do PostgreSQL (Neon) para aguentar o banco "acordando".

    O Neon grátis desliga após 5 min parado e leva alguns segundos para voltar; o padrão do
    Prisma espera só 5 s pela conexão, e a primeira requisição dava erro 500. Aqui damos mais
    tempo e tiramos o channel_binding, que o Prisma não entende.
    """
    url = os.getenv("DATABASE_URL", "")
    if not url.startswith(("postgres://", "postgresql://")):
        return None
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query))
    query.pop("channel_binding", None)
    if parts.hostname not in ("localhost", "127.0.0.1", "::1"):  # o Postgres do docker-compose não tem SSL
        query.setdefault("sslmode", "require")
    query.setdefault("connect_timeout", "30")  # segundos esperando o banco acordar
    query.setdefault("pool_timeout", "30")  # segundos esperando uma conexão livre
    return urlunsplit(parts._replace(query=urlencode(query)))


_url = _postgres_url()
db = Prisma(datasource={"url": _url}) if _url else Prisma()
