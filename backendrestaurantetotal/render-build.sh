#!/usr/bin/env bash
# Build no Render: instala dependências e gera o cliente Prisma para PostgreSQL.
# Localmente o schema continua em SQLite; aqui trocamos o provider só no servidor.
set -euo pipefail

pip install -r requirements.txt
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
prisma generate
