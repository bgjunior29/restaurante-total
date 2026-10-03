"""Sobe a API inteira contra um banco SQLite próprio dos testes (tests/test.db), recriado a cada execução.

Rodar:  .venv\\Scripts\\python -m pytest
"""
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
TEST_DB = ROOT / "tests" / "test.db"

# Antes de importar o app: o cliente Prisma lê DATABASE_URL na importação, e o .env não sobrescreve o que já existe.
os.environ["DATABASE_URL"] = f"file:{TEST_DB.as_posix()}"
os.environ["JWT_SECRET"] = "segredo-dos-testes-com-32-bytes-ou-mais"
os.environ["PYTHONUTF8"] = "1"
for var in ("PLATFORM_ADMIN_PASSWORD", "ADMIN_PASSWORD", "WHATSAPP_ACCESS_TOKEN"):
    os.environ.pop(var, None)


def _run(*args: str) -> None:
    scripts = Path(sys.executable).parent
    env = {**os.environ, "PATH": f"{scripts}{os.pathsep}{os.environ.get('PATH', '')}"}
    result = subprocess.run(args, cwd=ROOT, env=env, capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr


@pytest.fixture(scope="session")
def client():
    for suffix in ("", "-journal", "-wal", "-shm"):
        Path(f"{TEST_DB}{suffix}").unlink(missing_ok=True)
    _run(sys.executable, "-m", "prisma", "db", "push", "--skip-generate", "--accept-data-loss")
    _run(sys.executable, "seed.py")  # plataforma admin/admin123 + cantina-da-nonna (admin/admin123)

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def clean_limits():
    from app import ratelimit

    ratelimit.reset()
    yield
    ratelimit.reset()


def login(client, slug: str, username: str = "admin", password: str = "admin123") -> dict:
    r = client.post(f"/api/t/{slug}/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def platform_login(client) -> dict:
    r = client.post("/api/platform/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def second_tenant(client):
    """Outro restaurante, para provar que um não enxerga o outro."""
    r = client.post(
        "/api/platform/tenants",
        headers=platform_login(client),
        json={"name": "Pizzaria Teste", "slug": "pizzaria-teste", "planPriceCents": 14900, "adminPassword": "senha123"},
    )
    assert r.status_code == 201, r.text
    return r.json()
