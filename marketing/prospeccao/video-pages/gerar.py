"""Gera as páginas de vídeo da Movitech (/v/<nicho>) e as capas dos e-mails de prospecção.

Saídas:
  frontrestaurantetotal/public/v/<nicho>/index.html   página com o vídeo, benefícios e WhatsApp
  frontrestaurantetotal/public/v/fonts/*.woff2         fontes da marca (cópia de videos/html/_comum/fonts)
  frontrestaurantetotal/public/midia/quadro-<nicho>.jpg  pôster do vídeo (quadro da cena "solução", ver montar.sh)
  video-pages/capas/<nicho>.html                        capa do e-mail; montar.sh tira o print para midia/capa-<nicho>.jpg
Uso: bash montar.sh (tira os quadros, roda este script e tira o print das capas)
"""
import html
import shutil
from pathlib import Path
from urllib.parse import quote

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
PUBLIC = RAIZ / "frontrestaurantetotal" / "public"
SITE = "https://movitechsistemas.com.br"
WHATS = "5511964452878"

NICHOS = {
    "restaurantes": {
        "seg": 20,
        "rotulo": "restaurantes",
        "titulo": "Pedido direto, <em>sem comissão.</em>",
        "intro": "Cardápio digital, link de pedidos com o nome do restaurante e tela da cozinha, num sistema só.",
        "itens": ["Link de pedidos próprio, com Pix e sem comissão por pedido",
                  "QR code na mesa: o pedido cai direto na cozinha",
                  "Aviso no WhatsApp a cada etapa do pedido"],
        "site": "/restaurantes",
        "msg": "Oi! Vi o vídeo da Movitech e quero ver como ficaria no meu restaurante.",
        "cta": "Quero ver no meu restaurante",
    },
    "autoescolas": {
        "seg": 22,
        "rotulo": "autoescolas",
        "titulo": "Aluno inscrito <em>pelo celular.</em>",
        "intro": "Site rápido e seguro para a autoescola, com pré-matrícula e contato pelo WhatsApp em um toque.",
        "itens": ["Pré-matrícula pelo celular, a qualquer hora",
                  "Botão de WhatsApp que abre a conversa na hora",
                  "Perfil no Google bem configurado, para ser encontrado"],
        "site": "/",
        "msg": "Oi! Vi o vídeo da Movitech para autoescolas e quero um orçamento.",
        "cta": "Quero um orçamento",
    },
    "imobiliarias": {
        "seg": 20,
        "rotulo": "imobiliárias",
        "titulo": "Achou o imóvel, <em>já fala com você.</em>",
        "intro": "Site rápido para a imobiliária, com os imóveis no celular do cliente e contato direto pelo WhatsApp.",
        "itens": ["Imóveis com fotos, preço e bairro, rápidos no celular",
                  "Contato pelo WhatsApp direto do anúncio",
                  "Perfil no Google bem configurado, para ser encontrado"],
        "site": "/",
        "msg": "Oi! Vi o vídeo da Movitech para imobiliárias e quero um orçamento.",
        "cta": "Quero um orçamento",
    },
    "contabilidade": {
        "seg": 21,
        "rotulo": "escritórios de contabilidade",
        "curto": "contadores",
        "titulo": "Quem procura contador <em>encontra você.</em>",
        "intro": "Site rápido e seguro para o escritório, com os serviços explicados e contato pelo WhatsApp em um toque.",
        "itens": ["Site com os serviços do escritório, rápido no celular",
                  "Contato pelo WhatsApp em um toque",
                  "Perfil no Google bem configurado, para aparecer na busca"],
        "site": "/",
        "msg": "Oi! Vi o vídeo da Movitech para contabilidade e quero um orçamento.",
        "cta": "Quero um orçamento",
    },
    "saloes": {
        "seg": 23,
        "rotulo": "salões e barbearias",
        "titulo": "Agenda cheia, <em>a qualquer hora.</em>",
        "intro": "O cliente escolhe o serviço e marca o horário pelo celular, sem precisar ligar.",
        "itens": ["Agendamento de horário pelo celular",
                  "Contato pelo WhatsApp em um toque",
                  "Perfil no Google bem configurado, para ser encontrado"],
        "site": "/",
        "msg": "Oi! Vi o vídeo da Movitech para salões e barbearias e quero um orçamento.",
        "cta": "Quero um orçamento",
    },
    "petshops": {
        "seg": 23,
        "rotulo": "pet shops",
        "titulo": "O cliente escolhe <em>e pede sozinho.</em>",
        "intro": "Catálogo online com os produtos do pet shop e pedido pelo WhatsApp em um toque.",
        "itens": ["Catálogo online com produtos e preços",
                  "Pedido pelo WhatsApp em um toque",
                  "Perfil no Google bem configurado, para ser encontrado"],
        "site": "/",
        "msg": "Oi! Vi o vídeo da Movitech para pet shops e quero um orçamento.",
        "cta": "Quero um orçamento",
    },
}

LOGO = ('<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#141310" stroke="rgba(212,180,131,.5)"/>'
        '<path d="M14.5 32.5v-17l9.5 11 9.5-11v17" fill="none" stroke="#d4b483" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>')
ZAP = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.3 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2zm5.6 13.9c-.2.7-1.4 1.4-2 1.5-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.1.1.7-.1 1.4z"/></svg>')

PAGINA = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Movitech para {rotulo}</title>
<meta name="description" content="{intro}">
<meta name="robots" content="noindex">
<meta property="og:title" content="Movitech para {rotulo}">
<meta property="og:description" content="{intro}">
<meta property="og:image" content="{site}/midia/capa-{nome}.jpg">
<meta property="og:type" content="video.other">
<meta name="theme-color" content="#0f0e0c">
<link rel="icon" href="/favicon.svg">
<link rel="preload" href="/v/fonts/InstrumentSerif-Regular.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face {{ font-family: 'Instrument Serif'; src: url(/v/fonts/InstrumentSerif-Regular.woff2) format('woff2'); font-display: swap; }}
@font-face {{ font-family: 'Instrument Serif'; font-style: italic; src: url(/v/fonts/InstrumentSerif-Italic.woff2) format('woff2'); font-display: swap; }}
@font-face {{ font-family: 'Inter'; font-weight: 400 800; src: url(/v/fonts/Inter.woff2) format('woff2'); font-display: swap; }}
:root {{ --bg: #0f0e0c; --panel: #171613; --line: #2e2b26; --ink: #f2efe8; --muted: #9a958b; --gold: #d4b483; --zap: #1fa855; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html {{ background: var(--bg); }}
body {{ min-height: 100vh; background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,180,131,.10), transparent 70%), var(--bg);
  color: var(--ink); font: 400 16px/1.55 Inter, system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }}
a {{ color: inherit; }}
.topo {{ max-width: 1040px; margin: 0 auto; padding: 20px 16px; display: flex; align-items: center; justify-content: space-between; }}
.marca {{ display: flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 600; font-size: 17px; }}
.marca svg {{ width: 34px; height: 34px; }}
.topo .zap-mini {{ font-size: 14px; color: var(--muted); text-decoration: none; }}
main {{ max-width: 1040px; margin: 0 auto; padding: 8px 16px 56px; display: grid; gap: 28px; grid-template-areas: "cab" "video" "corpo"; }}
.cab {{ grid-area: cab; }} .video {{ grid-area: video; }} .corpo {{ grid-area: corpo; }}
@media (min-width: 860px) {{ main {{ grid-template-columns: 380px 1fr; grid-template-areas: "video cab" "video corpo"; column-gap: 72px; row-gap: 0; padding-top: 32px; align-content: center; }}
  .cab {{ align-self: end; }} .corpo {{ align-self: start; padding-top: 22px; }} }}
.video {{ position: relative; width: 100%; max-width: min(380px, calc(62vh * 9 / 16)); margin: 0 auto; aspect-ratio: 9 / 16; border-radius: 24px; overflow: hidden;
  background: #000; border: 1px solid var(--line); box-shadow: 0 30px 80px rgba(0,0,0,.55); }}
@media (min-width: 860px) {{ .video {{ max-width: 380px; }} }}
.video video {{ width: 100%; height: 100%; display: block; object-fit: cover; }}
.olho {{ display: flex; align-items: center; gap: 14px; font-size: 12px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: var(--gold); }}
.olho::before {{ content: ""; width: 36px; height: 1.5px; background: currentColor; opacity: .6; }}
h1 {{ font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(40px, 7vw, 64px); line-height: 1.02; letter-spacing: -.015em; margin-top: 18px; }}
h1 em {{ color: var(--gold); }}
.intro {{ margin-top: 0; font-size: 18px; color: rgba(242,239,232,.72); max-width: 520px; }}
ul {{ list-style: none; margin-top: 28px; border-top: 1px solid var(--line); max-width: 520px; }}
li {{ display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--line); }}
li span {{ font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 20px; color: var(--gold); min-width: 22px; line-height: 1.3; }}
.acoes {{ margin-top: 32px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }}
.botao {{ display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 52px; padding: 0 26px; border-radius: 999px;
  background: var(--zap); color: #fff; font-weight: 600; font-size: 16px; text-decoration: none; box-shadow: 0 10px 30px rgba(31,168,85,.28); }}
.botao svg {{ width: 22px; height: 22px; }}
.botao:hover {{ filter: brightness(1.06); }}
.link {{ color: var(--muted); font-size: 15px; text-decoration: none; padding: 12px 4px; }}
.link:hover {{ color: var(--ink); }}
.nota {{ margin-top: 14px; font-size: 13px; color: var(--muted); }}
footer {{ border-top: 1px solid var(--line); padding: 22px 16px 28px; text-align: center; font-size: 13px; color: var(--muted); }}
@media (max-width: 480px) {{ .botao {{ width: 100%; }} .acoes {{ flex-direction: column; align-items: stretch; }} .link {{ text-align: center; }} }}
</style>
</head>
<body>
<header class="topo">
  <a class="marca" href="{site}/">{logo}<span>Movitech</span></a>
  <a class="zap-mini" href="{wa}">(11) 96445-2878</a>
</header>
<main>
  <div class="video">
    <video src="/midia/movitech-{nome}.mp4" poster="/midia/quadro-{nome}.jpg" controls playsinline preload="metadata"></video>
  </div>
  <div class="cab">
    <p class="olho">Movitech para {rotulo}</p>
    <h1>{titulo}</h1>
  </div>
  <section class="corpo">
    <p class="intro">{intro}</p>
    <ul>{itens}</ul>
    <div class="acoes">
      <a class="botao" href="{wa}">{zap}{cta}</a>
      <a class="link" href="{site}{pagina_site}">Conhecer a Movitech →</a>
    </div>
    <p class="nota">Orçamento sob medida, só com o que vocês precisam. Sem compromisso.</p>
  </section>
</main>
<footer>Movitech Sistemas · Barueri/SP · <span style="white-space:nowrap">WhatsApp (11) 96445-2878</span></footer>
</body>
</html>
"""

CAPA = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>capa {nome}</title>
<style>
@font-face {{ font-family: 'Instrument Serif'; src: url(../../../../videos/html/_comum/fonts/InstrumentSerif-Regular.woff2); }}
@font-face {{ font-family: 'Instrument Serif'; font-style: italic; src: url(../../../../videos/html/_comum/fonts/InstrumentSerif-Italic.woff2); }}
@font-face {{ font-family: 'Inter'; font-weight: 400 800; src: url(../../../../videos/html/_comum/fonts/Inter.woff2); }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ width: 1120px; height: 760px; overflow: hidden; }}
body {{ background: radial-gradient(ellipse 70% 60% at 30% 10%, rgba(212,180,131,.13), transparent 70%), #0f0e0c; color: #f2efe8;
  font-family: Inter, sans-serif; display: grid; grid-template-columns: 340px 1fr; gap: 64px; align-items: center; padding: 56px 72px 56px 80px; }}
.quadro {{ position: relative; width: 340px; height: 604px; border-radius: 28px; overflow: hidden; border: 1.5px solid #2e2b26; box-shadow: 0 30px 70px rgba(0,0,0,.6); }}
.quadro img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
.quadro::after {{ content: ""; position: absolute; inset: 0; background: rgba(15,14,12,.28); }}
.play {{ position: absolute; z-index: 1; left: 50%; top: 50%; width: 132px; height: 132px; margin: -66px 0 0 -66px; border-radius: 50%;
  background: rgba(212,180,131,.96); box-shadow: 0 0 0 14px rgba(212,180,131,.22), 0 20px 50px rgba(0,0,0,.5); }}
.play::before {{ content: ""; position: absolute; left: 52px; top: 38px; border-left: 46px solid #141310; border-top: 28px solid transparent; border-bottom: 28px solid transparent; }}
.marca {{ display: flex; align-items: center; gap: 16px; font-size: 30px; font-weight: 600; }}
.marca svg {{ width: 56px; height: 56px; }}
.olho {{ margin-top: 54px; display: flex; align-items: center; gap: 18px; font-size: 20px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: #d4b483; }}
.olho::before {{ content: ""; width: 48px; height: 2px; background: currentColor; opacity: .6; }}
h1 {{ font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 84px; line-height: 1; letter-spacing: -.015em; margin-top: 22px; }}
h1 em {{ color: #d4b483; }}
.ver {{ margin-top: 46px; display: inline-flex; align-items: center; gap: 14px; font-size: 26px; font-weight: 600; color: #141310; background: #d4b483;
  padding: 18px 32px; border-radius: 999px; }}
.ver i {{ width: 0; height: 0; border-left: 16px solid #141310; border-top: 10px solid transparent; border-bottom: 10px solid transparent; }}
</style></head>
<body>
  <div class="quadro"><img src="../quadros/{nome}.jpg" alt=""><div class="play"></div></div>
  <div>
    <div class="marca">{logo}<span>Movitech</span></div>
    <p class="olho">Para {rotulo}</p>
    <h1>{titulo}</h1>
    <span class="ver"><i></i>Assistir o vídeo · {seg} s</span>
  </div>
</body></html>
"""


def main():
    fontes = PUBLIC / "v" / "fonts"
    fontes.mkdir(parents=True, exist_ok=True)
    for f in (RAIZ / "videos" / "html" / "_comum" / "fonts").glob("*.woff2"):
        shutil.copy(f, fontes / f.name)
    (AQUI / "capas").mkdir(exist_ok=True)
    for nome, n in NICHOS.items():
        wa = f"https://wa.me/{WHATS}?text={quote(n['msg'])}"
        itens = "".join(f"<li><span>{i}</span>{html.escape(t)}</li>" for i, t in enumerate(n["itens"], 1))
        pasta = PUBLIC / "v" / nome
        pasta.mkdir(parents=True, exist_ok=True)
        (pasta / "index.html").write_text(PAGINA.format(
            nome=nome, rotulo=html.escape(n["rotulo"]), titulo=n["titulo"], intro=html.escape(n["intro"]), itens=itens,
            wa=html.escape(wa), cta=html.escape(n["cta"]), site=SITE, pagina_site=n["site"], logo=LOGO, zap=ZAP), encoding="utf-8")
        shutil.copy(AQUI / "quadros" / f"{nome}.jpg", PUBLIC / "midia" / f"quadro-{nome}.jpg")
        (AQUI / "capas" / f"{nome}.html").write_text(CAPA.format(
            nome=nome, rotulo=html.escape(n.get("curto", n["rotulo"])), titulo=n["titulo"], logo=LOGO, seg=n["seg"]), encoding="utf-8")
        print(nome)


if __name__ == "__main__":
    main()
