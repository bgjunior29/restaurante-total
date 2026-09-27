"""Senhas (bcrypt) e sessões (JWT).

Há dois tipos de sessão, separados pelo campo "scope" do token:
- "tenant": funcionário/admin de um restaurante (leva o id do restaurante em "tid");
- "platform": dono da plataforma, que gerencia os restaurantes.
"""
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .db import db

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
TOKEN_HOURS = 12

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def create_token(user_id: int, scope: str, tenant_id: int | None = None, role: str | None = None) -> str:
    payload = {
        "sub": str(user_id),
        "scope": scope,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    if tenant_id is not None:
        payload["tid"] = tenant_id
    if role:
        payload["role"] = role
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def read_token(creds: HTTPAuthorizationCredentials | None, scope: str) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login para continuar.")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão expirada. Faça login novamente.")
    if payload.get("scope") != scope:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida para esta área. Faça login novamente.")
    return payload


async def platform_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)):
    payload = read_token(creds, "platform")
    user = await db.platformuser.find_unique(where={"id": int(payload["sub"])})
    if user is None or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário inválido.")
    return user
