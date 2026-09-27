#!/usr/bin/env bash
# Início no Render: cria/atualiza as tabelas, popula o básico e sobe a API.
set -euo pipefail
export PYTHONUNBUFFERED=1  # logs aparecem na hora no painel do Render

echo "==> [start] prisma db push"
prisma db push --skip-generate

# O seed nunca pode impedir a API de subir: limite de 90 s e segue mesmo se falhar.
echo "==> [start] seed"
if ! PRISMA_PY_DEBUG=1 timeout 90 python -u seed.py; then
  echo "==> [start] AVISO: seed falhou ou passou de 90 s (veja as linhas acima). Subindo a API assim mesmo."
fi

echo "==> [start] uvicorn na porta ${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
