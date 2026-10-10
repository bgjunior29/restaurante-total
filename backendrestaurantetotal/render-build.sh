#!/usr/bin/env bash
# Build no Render: instala dependências e gera o cliente Prisma (PostgreSQL, igual ao PC e aos testes).
set -euo pipefail

pip install -r requirements.txt
prisma generate
