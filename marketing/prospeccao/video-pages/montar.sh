#!/usr/bin/env bash
# Monta as páginas /v/<nicho> e as capas dos e-mails de prospecção, com o Edge sem janela.
#  1. quadros/<nicho>.jpg: quadro da cena "solução" de cada vídeo (videos/html/<video>/index.html?t=...)
#  2. python gerar.py: páginas em frontrestaurantetotal/public/v e capas/<nicho>.html
#  3. frontrestaurantetotal/public/midia/capa-<nicho>.jpg: print de cada capa (1120x760)
# Uso (Git Bash, nesta pasta):  bash montar.sh
set -euo pipefail
cd "$(dirname "$0")"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
RAIZW="$(cd ../../.. && pwd -W)"
DIR="$(pwd -W)"
MIDIA="$RAIZW/frontrestaurantetotal/public/midia"

# O Edge grava o print depois de sair; espera o arquivo aparecer.
print() { # largura altura saída url
  rm -f "$3"
  "$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="$1,$2" --virtual-time-budget=6000 "--screenshot=$3" "$4" > /dev/null 2>&1
  for _ in $(seq 60); do [ -s "$3" ] && return; sleep 0.5; done
  echo "falhou: $3" >&2; exit 1
}

mkdir -p quadros
# nicho:video:cena
for par in restaurantes:movitech-restaurantes:link autoescolas:nicho-autoescolas:solucao \
           imobiliarias:nicho-imobiliarias:solucao contabilidade:nicho-contabilidade:solucao \
           saloes:nicho-saloes:solucao petshops:nicho-petshops:solucao; do
  IFS=: read -r n v c <<< "$par"
  t=$(python -c "
import json, re
s = open(r'$RAIZW/videos/html/$v/index.html', encoding='utf-8').read()
cenas = json.loads(re.findall(r'\"cenas\":(\[\{\"cena\":\"[a-z]+\",\"de\".*?\])', s)[0])
x = next(k for k in cenas if k['cena'] == '$c')
print(round(x['de'] + 0.75 * (x['ate'] - x['de']), 2))")
  print 1080 1920 "$DIR/quadros/$n.jpg" "file:///$RAIZW/videos/html/$v/index.html?t=$t"
  echo "quadros/$n.jpg (t=$t)"
done

PYTHONIOENCODING=utf-8 python gerar.py

for f in capas/*.html; do
  n="$(basename "$f" .html)"
  print 1120 760 "$MIDIA/capa-$n.jpg" "file:///$DIR/$f"
  echo "midia/capa-$n.jpg"
done
