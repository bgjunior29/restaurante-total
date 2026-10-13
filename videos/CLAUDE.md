# Estúdio de motion graphics da Movitech

Regras para todo vídeo novo desta pasta. Os vídeos antigos (Remotion, `src/`) continuam como estão; vídeo novo segue o fluxo abaixo.

## Caminho técnico: HTML puro
- Cada vídeo é uma pasta `html/<nome>/` com um `index.html` **sem dependências** (nada de Remotion, Hyperframes, GSAP ou CDN). Fontes e imagens vêm de arquivos locais.
- O `index.html` expõe `window.DURACAO` (segundos), `window.FPS` e `window.seek(t)`. `seek(t)` desenha o quadro exato do instante `t` de forma determinística: nada de `Date.now()`, `requestAnimationFrame`, `Math.random()` sem semente nem transição CSS. Tudo é função de `t`.
- Com `?play` na URL a página toca sozinha em loop, para ver no navegador.
- Render: `node scripts/render_html.mjs <nome>`. O navegador captura quadro a quadro e o PyAV (`scripts/montar_mp4.py`) monta o MP4 e mixa o áudio declarado em `window.AUDIO`. **No notebook o Smart App Control bloqueia o Chrome headless e o `ffmpeg.exe`**, então o script usa o **Opera GX** (que é liberado) e o PyAV no lugar do ffmpeg. Revisão: `node scripts/quadros_chave.mjs <nome> <tempos...>`.
- Formatos: 1080×1920 (9:16, Reels/TikTok/Status) por padrão; 1920×1080 (16:9) quando pedido.

## Fluxo de cada vídeo
1. **Entradas**: ler `marca-movitech.md` (ou o arquivo da marca do cliente) e usar logo, cores, fontes e frases reais. Telas do sistema vêm de capturas reais (`html/<nome>/assets/`). Listar o que foi encontrado antes de animar.
2. **Referência**: quando houver vídeo de referência, descrever os movimentos e a linguagem visual dele e adaptar à marca. Nunca copiar personagem, logo ou música de terceiros.
3. **Tabela de batidas antes do código**: mostrar ao usuário a lista de cenas na grade da batida (tempo, o que aparece, movimento, texto na tela, som). **Só escrever código depois da aprovação.**
4. **Loop de autocrítica antes de mostrar**: capturar quadros-chave, dar nota de 1 a 10 em cada critério (legibilidade no celular, ritmo, sincronia com o som, fidelidade à marca, cara de IA genérica, clareza da oferta), corrigir os 3 piores problemas e repetir até tudo ficar ≥ 8. Só então pedir o render final.
5. **Depois de aprovado**: atualizar o arquivo de marca com o que funcionou (novas cores, frases, estilos de movimento).

## Aparência: fugir da cara de IA
- Sem a paleta padrão de IA (gradiente roxo/azul, grade de quadradinhos, brilho neon genérico, logo girando no fim). Usar a paleta da marca.
- Tipografia como protagonista: títulos grandes em serifa editorial, números em Inter firme. Poucas palavras por tela, que dê para ler em 1 s no celular.
- Movimento com intenção: entradas com easing forte (sair rápido, assentar devagar), máscaras e cortes no tempo da batida, nada flutuando à toa. No máximo 2 ou 3 coisas se mexendo ao mesmo tempo.
- Texto dentro da área segura do 9:16 (margem de 120 px em cima e 260 px embaixo, por causa da interface do Reels).
- Primeiro 1 s com gancho visual forte, porque é ali que se decide se a pessoa para de rolar.

## Som
- Nada de música com direito autoral. Trilha e efeitos sintetizados por script (ver `scripts/gerar_sfx.py`) ou a narração da Thalita (`scripts/gerar_voz.py`).
- Batida definida no roteiro (ex.: 120 BPM, 0,5 s por tempo). Cortes, entradas e efeitos caem no tempo.
- Volume conferido de verdade (não basta a faixa existir): narração em primeiro plano, trilha baixa.

## Oferta
- Desde 11/10/2026 os anúncios **não mostram preço fixo**: a chamada é pedir orçamento no WhatsApp (11) 96445-2878.
- Dados de restaurante real (pratos, logo do Point Arena) só com autorização do restaurante.
