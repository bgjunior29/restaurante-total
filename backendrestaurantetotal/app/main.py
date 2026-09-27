import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from prisma.errors import PrismaError  # noqa: E402

from .db import db  # noqa: E402
from .realtime import hub  # noqa: E402
from .routers import admin, platform, public, staff  # noqa: E402
from .timeutil import today  # noqa: E402


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.connect()
    # WAL melhora a concorrência de leitura/escrita no SQLite (no Postgres não se aplica).
    if os.getenv("DATABASE_URL", "").startswith("file:"):
        await db.query_raw("PRAGMA journal_mode=WAL;")
    yield
    await db.disconnect()


app = FastAPI(title="Restaurante Total API", lifespan=lifespan)
log = logging.getLogger("restaurantetotal")


@app.exception_handler(PrismaError)
async def database_error(request: Request, exc: PrismaError):
    """Falha de banco (ex.: Neon acordando, conexão derrubada): registra no log e responde 503,
    que o frontend entende como "tente de novo" em vez de um 500 genérico."""
    log.exception("Erro de banco em %s %s", request.method, request.url.path)
    if not db.is_connected():
        try:
            await db.connect()
        except Exception:
            log.exception("Não foi possível reconectar ao banco")
    return JSONResponse(
        status_code=503,
        content={"detail": "O servidor está acordando ou instável. Tente de novo em alguns segundos."},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(staff.router)
app.include_router(admin.router)
app.include_router(platform.router)


@app.get("/api/health")
async def health():
    return {"ok": True, "today": today()}


@app.websocket("/ws/{slug}")
async def websocket(ws: WebSocket, slug: str):
    tenant = await db.tenant.find_unique(where={"slug": slug})
    if tenant is None:
        await ws.close(code=4404)
        return
    await hub.connect(tenant.id, ws)
    try:
        while True:
            await ws.receive_text()  # mantém a conexão viva (ping do cliente)
    except WebSocketDisconnect:
        pass
    finally:
        hub.disconnect(tenant.id, ws)


# Em produção, o FastAPI também serve o build do React (frontrestaurantetotal/dist).
DIST = Path(__file__).resolve().parents[2] / "frontrestaurantetotal" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        file = DIST / path
        if path and file.is_file() and DIST in file.resolve().parents:
            return FileResponse(file)
        return FileResponse(DIST / "index.html")
