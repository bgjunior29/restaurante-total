# Vídeos de divulgação (Remotion)

Vídeos gerados por código com os dados reais do cardápio publicado. Pasta separada: não entra no deploy do site nem da API.

## Reel do cardápio (1080×1920, ~20 s)

```
npm install          # só na primeira vez
npm run reel         # baixa o cardápio do point-arena e gera out/point-arena-cardapio.mp4
```

Abertura com logo e título da casa → 6 pratos (foto, categoria, nome, descrição e preço) → chamada do delivery com QR code.
Preços, fotos, cores do tema, frete e Instagram vêm do sistema: mudou no cardápio, é só rodar de novo.

- Outros pratos: `npm run dados -- point-arena 3,5,11` (ids dos produtos) e depois `npx remotion render src/index.jsx CardapioReel out/point-arena-cardapio.mp4`
- Outro restaurante: `npm run dados -- outro-slug`
- Ver e ajustar ao vivo no navegador: `npm run estudio`

Sem música (para não ter problema de direitos autorais): adicione uma do próprio Instagram/TikTok ao postar.
Licença do Remotion: grátis para pessoas e empresas pequenas; confira https://remotion.dev/license antes de usar numa empresa maior.

## Anúncio "comissão" da Movitech (1080×1920, ~16 s)

```
npm run anuncio      # gera out/anuncio-comissao.mp4
```

Gancho com a comissão do app subindo → pedidos perdendo 23% → cardápio próprio no celular (3 primeiros pratos do
`cardapio.json`) → R$ 199/mês e chamada para o WhatsApp. Valores do exemplo e preço ficam no topo de `src/AnuncioComissao.jsx`.
Usa os pratos e o logo do Point Arena: peça autorização ao restaurante antes de veicular.

## Vídeos da Movi (avatar + voz + legenda)

A Movi é a apresentadora ilustrada da Movitech (`src/movi/Movi.jsx`): pisca, balança a cabeça e mexe a boca
conforme o volume da narração. A voz é neural (pt-BR, Thalita) via `edge-tts`, e as legendas acendem palavra por palavra.

```
python -m pip install edge-tts      # só na primeira vez
python scripts/gerar_voz.py         # roteiros → public/voz/*.mp3 + src/voz/*.json (tempo de cada palavra)
npx remotion render src/index.jsx MoviAnuncioNegocios out/movi-anuncio-negocios.mp4
npx remotion render src/index.jsx MoviAnuncioRestaurantes out/movi-anuncio-restaurantes.mp4
npx remotion render src/index.jsx MoviApresentacao out/movi-apresentacao.mp4
```

Para mudar uma fala, edite `ROTEIROS` em `scripts/gerar_voz.py`, gere a voz de novo e renderize.
As cenas de cada vídeo ficam em `src/movi/MoviVideos.jsx` (chave = nome da cena no roteiro).

### Versão motion graphics (flat)

Mesma narração, visual plano: cores sólidas por cena com transição de círculo, ícones vetoriais, infográficos e a Movi plana (`src/mg/MG.jsx`).

```
npx remotion render src/index.jsx MGAnuncioNegocios out/movi-mg-anuncio-negocios.mp4
npx remotion render src/index.jsx MGAnuncioRestaurantes out/movi-mg-anuncio-restaurantes.mp4
npx remotion render src/index.jsx MGApresentacao out/movi-mg-apresentacao.mp4
```

## Anúncios de nicho em HTML puro (estilo novo, renderizados no PC)

Sete anúncios (clínicas, salões, imobiliárias, autoescolas, oficinas, contabilidade, pet shops), 9:16, com a narração da
Thalita, a trilha sintetizada e a paleta da marca. Regras do estúdio em `CLAUDE.md` e identidade em `marca-movitech.md`.

```
python -m pip install -U edge-tts av numpy pillow   # só na primeira vez (edge-tts 7.3+: a 7.2 leva 403)
python scripts/gerar_voz.py nicho-                  # narração → public/voz + src/voz
python scripts/gerar_trilha.py                      # trilha de fundo → public/trilha/base.wav
node scripts/montar_nichos.mjs                      # textos de cada nicho + tempos → html/nicho-*/index.html
node scripts/quadros_chave.mjs nicho-clinicas 2 5 10 15 19   # folha de contato para revisar antes do render
node scripts/render_html.mjs nicho-                 # → out/nicho-*.mp4 (~2 min cada)
```

- Ver ao vivo: abra `html/nicho-clinicas/index.html?play` no navegador (`?t=12` congela em 12 s).
- Textos de cada nicho (problemas, recursos, tela do celular, notificação, frase do benefício): `scripts/montar_nichos.mjs`.
- O render usa o **Opera GX** como navegador (o Smart App Control bloqueia o Chrome headless e o `ffmpeg.exe`) e o
  **PyAV** para gravar o MP4. Em outro PC ou no Linux, `NAVEGADOR=caminho/do/chrome` ou o Chromium do Playwright.
