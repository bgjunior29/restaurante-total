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
