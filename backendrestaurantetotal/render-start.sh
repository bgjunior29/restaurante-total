#!/usr/bin/env bash
# Início no Render: aplica as migrações pendentes, popula o básico e sobe a API.
set -euo pipefail
export PYTHONUNBUFFERED=1  # logs aparecem na hora no painel do Render

# Migrações versionadas (prisma/migrations): só aplica o que é novo e nunca apaga coluna sem uma migração escrita.
# Banco criado antes das migrações (com db push) responde P3005; ele já tem exatamente a estrutura da 0_init,
# então ela é só registrada como aplicada, uma única vez, e o deploy segue normalmente.
echo "==> [start] prisma migrate deploy"
if ! out=$(prisma migrate deploy 2>&1); then
  echo "$out"
  if grep -q "P3005" <<<"$out"; then
    echo "==> [start] banco existente sem histórico de migrações: registrando a 0_init como aplicada"
    prisma migrate resolve --applied 0_init
    prisma migrate deploy
  else
    exit 1
  fi
else
  echo "$out"
fi

# O seed nunca pode impedir a API de subir: limite de 90 s e segue mesmo se falhar.
echo "==> [start] seed"
if ! PRISMA_PY_DEBUG=1 timeout 90 python -u seed.py; then
  echo "==> [start] AVISO: seed falhou ou passou de 90 s (veja as linhas acima). Subindo a API assim mesmo."
fi

echo "==> [start] uvicorn na porta ${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
