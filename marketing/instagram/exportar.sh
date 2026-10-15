#!/usr/bin/env bash
# Exporta todas as lâminas de posts.html para PNG (1080x1350 no feed, 1080x1920 nos Stories) com o Edge sem janela.
# Uso (Git Bash, nesta pasta):  bash exportar.sh
set -euo pipefail
cd "$(dirname "$0")"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
DIR="$(pwd -W)"
mkdir -p png
# id:lâminas:altura
for post in 01-apresentacao:4:1350 02-manifesto:6:1350 03-comissao:6:1350 04-salao:5:1350 05-cozinha:5:1350 06-gestao:5:1350 07-stories-comissao:5:1920; do
  IFS=: read -r id n h <<< "$post"
  mkdir -p "png/$id"
  for i in $(seq 1 "$n"); do
    "$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
      --window-size=1080,"$h" --virtual-time-budget=8000 \
      --screenshot="$DIR/png/$id/$(printf %02d "$i").png" \
      "file:///$DIR/posts.html?slide=$id/$i" > /dev/null 2>&1
    echo "png/$id/$(printf %02d "$i").png"
  done
done
