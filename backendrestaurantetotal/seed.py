"""Prepara um banco novo: usuário da plataforma e, se não houver nenhum restaurante, o restaurante de exemplo.

Uso:  python seed.py
É seguro rodar mais de uma vez: só cria o que ainda não existe.

Variáveis opcionais:
  PLATFORM_ADMIN_USER / PLATFORM_ADMIN_PASSWORD   login do painel /plataforma (padrão: admin / admin123)
  ADMIN_PASSWORD                                  senha do admin do restaurante de exemplo (padrão: admin123)
  PUBLIC_URL                                      endereço do cardápio publicado (QR codes e links do WhatsApp)
  DEFAULT_TENANT_SLUG / DEFAULT_TENANT_NAME       restaurante de exemplo (padrão: cantina-da-nonna / Cantina da Nonna)
"""
import asyncio
import os

from dotenv import load_dotenv

load_dotenv()

from app.auth import hash_password  # noqa: E402
from app.db import db  # noqa: E402
from app.starter import create_starter_content  # noqa: E402


LOCAL = os.getenv("DATABASE_URL", "").startswith("file:")  # SQLite = PC de desenvolvimento


def password_from(env: str) -> str | None:
    """Senha da variável de ambiente; no PC aceita o padrão admin123, em produção nunca."""
    value = os.getenv(env)
    if value:
        return value
    if LOCAL:
        return "admin123"
    print(f"⚠ {env} não definida: em produção a senha padrão não é usada. Defina a variável e faça o deploy de novo.", flush=True)
    return None


async def main() -> None:
    print("seed: conectando ao banco...", flush=True)
    await db.connect()
    print("seed: conectado, conferindo dados iniciais", flush=True)

    if await db.platformuser.count() == 0:
        username = os.getenv("PLATFORM_ADMIN_USER", "admin").strip().lower()
        password = password_from("PLATFORM_ADMIN_PASSWORD")
        if password:
            await db.platformuser.create(
                data={"username": username, "name": "Dono da plataforma", "passwordHash": hash_password(password)}
            )
            shown = "a definida em PLATFORM_ADMIN_PASSWORD" if os.getenv("PLATFORM_ADMIN_PASSWORD") else "admin123"
            print(f"✔ Usuário da plataforma criado (login: {username} / senha: {shown}) — acesse /plataforma", flush=True)

    if await db.tenant.count() == 0 and password_from("ADMIN_PASSWORD"):
        slug = os.getenv("DEFAULT_TENANT_SLUG", "cantina-da-nonna")
        tenant = await db.tenant.create(data={"slug": slug, "name": os.getenv("DEFAULT_TENANT_NAME", "Cantina da Nonna"), "deliveryEnabled": True, "publicUrl": os.getenv("PUBLIC_URL", "").rstrip("/")})
        await create_starter_content(tenant.id)
        password = password_from("ADMIN_PASSWORD")
        await db.user.create(
            data={
                "tenantId": tenant.id,
                "username": "admin",
                "name": "Administrador",
                "role": "ADMIN",
                "passwordHash": hash_password(password),
            }
        )
        shown = "a definida em ADMIN_PASSWORD" if os.getenv("ADMIN_PASSWORD") else "admin123"
        print(f"✔ Restaurante de exemplo criado em /r/{slug} (login: admin / senha: {shown})", flush=True)

    await db.disconnect()
    print("seed: concluído", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
