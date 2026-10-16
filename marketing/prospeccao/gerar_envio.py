"""Gera envio-17-10.html: a central de envio do e-mail "veja em X segundos como funciona" para os 28 leads.

Os e-mails saem pelo Gmail do navegador (conta movitechsuportedev). O conector do Gmail usado pelo Claude troca todo
link por google.com/url e apaga imagens, então ele não serve para e-mail com capa e link limpo.
Cada cartão tem: "Abrir no Gmail" (destinatário e assunto preenchidos) e "Copiar e-mail" (corpo com capa e links,
pronto para colar com Ctrl+V). O progresso fica marcado no navegador.
Uso: python gerar_envio.py  → abre envio-17-10.html no Chrome/Edge.
"""
import html
import json
from pathlib import Path
from urllib.parse import quote

AQUI = Path(__file__).resolve().parent
SITE = "https://movitechsistemas.com.br"
CONTA = "movitechsuportedev@gmail.com"

SEG = {"restaurantes": 20, "autoescolas": 22, "imobiliarias": 20, "contabilidade": 21, "saloes": 23, "petshops": 23}
ROTULO = {"restaurantes": "restaurantes", "autoescolas": "autoescolas", "imobiliarias": "imobiliárias",
          "contabilidade": "contadores", "saloes": "salões e barbearias", "petshops": "pet shops"}
FRASE = {
    "autoescolas": "o que a Movitech faz por autoescolas: site rápido, pré-matrícula pelo celular e contato pelo WhatsApp em um toque.",
    "imobiliarias": "o que a Movitech faz por imobiliárias: site rápido com os imóveis e contato pelo WhatsApp direto do anúncio.",
    "contabilidade": "o que a Movitech faz por escritórios de contabilidade: site rápido e seguro e contato pelo WhatsApp em um toque, para quem procura contador encontrar vocês.",
    "saloes": "o que a Movitech faz por barbearias e salões: agendamento de horário pelo celular e contato pelo WhatsApp em um toque.",
    "petshops": "o que a Movitech faz por pet shops: catálogo online com os produtos e pedido pelo WhatsApp em um toque.",
}
BARUERI, PERTO, REGIAO = "aqui de Barueri", "aqui de Barueri, pertinho de vocês", "aqui da região"

# nome, e-mail, nicho, de onde, como o pedido entra (só restaurantes)
LEADS = [
    ("Soggiorno Pizzaria", "alphaville@soggiorno.com.br", "restaurantes", BARUERI, "direto pelo link da pizzaria"),
    ("San Telmo Gastrobar", "contato@santelmogastrobar.com.br", "restaurantes", BARUERI, "pelo QR code da mesa e pelo link da casa"),
    ("El Uruguayo", "eluruguayo@eluruguayo.com.br", "restaurantes", BARUERI, "direto pelo link do restaurante"),
    ("Restaurante Pedra Branca", "jandira@restaurantepedrabranca.com.br", "restaurantes", BARUERI, "direto pelo link do restaurante"),
    ("Amadelle Pizzaria", "amadellipizzas@gmail.com", "restaurantes", BARUERI, "direto pelo link da pizzaria"),
    ("Donattela Pizzaria", "contatopizzariadonattela@gmail.com", "restaurantes", BARUERI, "direto pelo link da pizzaria"),
    ("Real Burger", "contato@realburger.com.br", "restaurantes", BARUERI, "direto pelo link da hamburgueria"),
    ("Pizzaria e Esfiharia Lisboa", "pizzarialisboaoficial@gmail.com", "restaurantes", BARUERI, "direto pelo link da pizzaria"),
    ("Premiata Pizzaria", "premiatapizzaria@gmail.com", "restaurantes", BARUERI, "direto pelo link da pizzaria"),
    ("Paris Pizzaria", "meltsazar.pizzaria@gmail.com", "restaurantes", BARUERI, "direto pelo link da pizzaria"),
    ("Rancho 26 Bar e Restaurante", "faleconoscor26barueri@gmail.com", "restaurantes", BARUERI, "pelo QR code da mesa e pelo link do restaurante"),
    ("Giorgio Restaurante", "restaurantegiorgio@gmail.com", "restaurantes", BARUERI, "pelo QR code da mesa e pelo link do restaurante"),
    ("Pizzaria Nova Real", "pizzarianovareal2@gmail.com", "restaurantes", BARUERI, "direto pelo link da pizzaria"),
    ("A Quinta do Mirante", "aquintadomirante@gmail.com", "restaurantes", BARUERI, "pelo QR code da mesa e pelo link do restaurante"),
    ("Lellis Trattoria Alphaville", "lellis@lellis.com.br", "restaurantes", BARUERI, "pelo QR code da mesa e pelo link do restaurante"),
    ("Jandira Lanches e Restaurante", "jandiralancheserestaurante@gmail.com", "restaurantes", PERTO, "direto pelo link do restaurante"),
    ("DJ Pizzaria", "pizzaria.dj.jandira@gmail.com", "restaurantes", PERTO, "direto pelo link da pizzaria"),
    ("Autoescola Charme", "contato@autoescolacharme.com.br", "autoescolas", PERTO, None),
    ("Auto Escola Speed", "speedautoescola0@gmail.com", "autoescolas", PERTO, None),
    ("Imobiliária Jardins", "cadastro@imobiliariajardins.com.br", "imobiliarias", REGIAO, None),
    ("Habitnews Imóveis", "corretormarcos87@gmail.com", "imobiliarias", REGIAO, None),
    ("Central Imóveis", "contato@centralimobiliaria.com.br", "imobiliarias", REGIAO, None),
    ("QualityConti", "contato@qualityconti.com.br", "contabilidade", REGIAO, None),
    ("Marcondes & Pereira", "contato@marcondesepereira.com.br", "contabilidade", PERTO, None),
    ("CERC Contabilidade", "cerc@cerccontabilidade.com.br", "contabilidade", PERTO, None),
    ("Sergio's Rodrigues Barbearia", "sergiosbarbershop.men@gmail.com", "saloes", PERTO, None),
    ("Mr. Deivid Barbearia", "mr.deivid.barbearia@gmail.com", "saloes", PERTO, None),
    ("Casa Mendes de Ração", "casamendesderacao@gmail.com", "petshops", PERTO, None),
]

A = 'style="color:#1f1d19"'

# Os 28 leads receberam em 15/10 o aviso "agora somos Lexmovi"; em 16/10 a marca voltou a ser Movitech.
CORRECAO = ("Uma correção rápida: no último e-mail eu avisei de uma mudança de nome, mas seguimos como Movitech, "
            "com o mesmo site e o mesmo WhatsApp de sempre.")


def corpo(nome, nicho, onde, pedido):
    e = html.escape
    url = f"{SITE}/v/{nicho}"
    seg = SEG[nicho]
    if nicho == "restaurantes":
        abre = f"Sou o John, da Movitech, {onde}. Gravei um vídeo curto mostrando na prática como funciona o pedido {pedido}, sem comissão:"
        fecha = ("Se quiserem ver com o cardápio de vocês, é só responder este e-mail com o cardápio (PDF ou foto serve). "
                 "Eu monto a versão de vocês para testarem no celular, sem custo e sem compromisso.")
    else:
        abre = f"Sou o John, da Movitech, {onde}. Gravei um vídeo curto mostrando {FRASE[nicho]}"
        fecha = "Se fizer sentido, preparo um orçamento só com o que vocês precisam, sem compromisso. É só responder este e-mail."
    return f"""<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f1d19;max-width:560px">
<p>Olá, equipe {e(nome)}!</p>
<p>{e(CORRECAO)}</p>
<p>{e(abre)}</p>
<p><a href="{url}"><img src="{SITE}/midia/capa-{nicho}.jpg" width="560" alt="Assistir o vídeo da Movitech para {e(ROTULO[nicho])} ({seg} s)" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:10px"></a></p>
<p><a href="{url}" style="color:#7a5c2e;font-weight:bold">▶ Assistir o vídeo ({seg} s)</a></p>
<p>{e(fecha)}</p>
<p>Abraço,<br><b>John</b><br>Movitech Sistemas · Barueri/SP<br>WhatsApp <a href="https://wa.me/5511964452878" {A}>(11) 96445-2878</a> · <a href="{SITE}" {A}>movitechsistemas.com.br</a></p>
<p style="font-size:12px;color:#8a857b">Se não fizer sentido para vocês, é só responder "não" que eu não envio mais nada.</p>
</div>"""


PAGINA = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Envio 17/10 · Movitech</title>
<style>
:root {{ --bg: #f4f1ea; --card: #fff; --ink: #1f1d19; --muted: #77716a; --line: #e4ded3; --gold: #b08a4f; --ok: #1f8a4c; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; }}
header {{ position: sticky; top: 0; z-index: 2; background: #141310; color: #f2efe8; padding: 16px 24px; display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }}
header h1 {{ margin: 0; font-size: 18px; }}
header .barra {{ flex: 1; min-width: 200px; height: 8px; background: #2e2b26; border-radius: 99px; overflow: hidden; }}
header .barra i {{ display: block; height: 100%; width: 0; background: #d4b483; transition: width .3s; }}
header .conta {{ color: #d4b483; font-weight: 600; }}
.passos {{ max-width: 900px; margin: 24px auto 0; padding: 0 16px; color: var(--muted); }}
.passos ol {{ margin: 8px 0 0; padding-left: 20px; }}
main {{ max-width: 900px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }}
.lead {{ background: var(--card); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }}
.lead.feito {{ opacity: .55; }}
.topo {{ display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 14px 18px; border-bottom: 1px solid var(--line); }}
.num {{ font-weight: 700; color: var(--gold); min-width: 28px; }}
.quem {{ flex: 1; min-width: 220px; }}
.quem b {{ display: block; }}
.quem small {{ color: var(--muted); }}
button, .btn {{ font: 600 14px system-ui, sans-serif; border-radius: 999px; padding: 9px 16px; border: 1px solid var(--line); background: #fff; color: var(--ink); cursor: pointer; text-decoration: none; }}
.btn.gmail {{ background: #141310; color: #fff; border-color: #141310; }}
button.copiar {{ background: #d4b483; border-color: #d4b483; }}
button.copiado {{ background: var(--ok); border-color: var(--ok); color: #fff; }}
label.feito {{ display: flex; gap: 6px; align-items: center; color: var(--muted); font-size: 14px; cursor: pointer; }}
.assunto {{ padding: 10px 18px; background: #faf8f4; border-bottom: 1px solid var(--line); font-size: 14px; }}
.assunto span {{ color: var(--muted); }}
details summary {{ padding: 10px 18px; cursor: pointer; color: var(--muted); font-size: 14px; }}
.email {{ padding: 4px 18px 18px; }}
</style></head>
<body>
<header><h1>Envio 17/10 · e-mail com vídeo</h1><div class="barra"><i id="barra"></i></div><span id="conta">0 de {total} enviados</span>
<span>Conta: <span class="conta">{conta}</span></span></header>
<div class="passos">Para cada negócio:
<ol><li><b>Abrir no Gmail</b>: abre um e-mail novo com destinatário e assunto já preenchidos (na conta {conta}).</li>
<li><b>Copiar e-mail</b> aqui, volte ao Gmail, clique no corpo do e-mail e cole com <b>Ctrl+V</b>. A capa e os links vão juntos.</li>
<li>Envie e marque <b>Enviado</b>. O progresso fica salvo neste navegador.</li></ol>
Dica: mande uns 10, faça uma pausa de alguns minutos e siga. Envios em rajada parecem spam.</div>
<main>{cartoes}</main>
<script>
const CHAVE = 'movitech-envio-17-10'
let feitos = {{}}
try {{ feitos = JSON.parse(localStorage.getItem(CHAVE) || '{{}}') }} catch (e) {{}}
function atualizar() {{
  const total = document.querySelectorAll('.lead').length
  let n = 0
  document.querySelectorAll('.lead').forEach(c => {{
    const ok = !!feitos[c.dataset.email]
    c.classList.toggle('feito', ok); c.querySelector('input').checked = ok; if (ok) n++
  }})
  document.getElementById('conta').textContent = n + ' de ' + total + ' enviados'
  document.getElementById('barra').style.width = (100 * n / total) + '%'
}}
document.querySelectorAll('.lead input').forEach(i => i.addEventListener('change', e => {{
  const email = e.target.closest('.lead').dataset.email
  if (e.target.checked) feitos[email] = new Date().toISOString(); else delete feitos[email]
  try {{ localStorage.setItem(CHAVE, JSON.stringify(feitos)) }} catch (e) {{}}
  atualizar()
}}))
document.querySelectorAll('button.copiar').forEach(b => b.addEventListener('click', () => {{
  const el = b.closest('.lead').querySelector('.email > div')
  const sel = window.getSelection(); sel.removeAllRanges()
  const r = document.createRange(); r.selectNode(el); sel.addRange(r)
  const ok = document.execCommand('copy'); sel.removeAllRanges()
  b.textContent = ok ? 'Copiado ✓' : 'Não copiou, tente de novo'; b.classList.toggle('copiado', ok)
  setTimeout(() => {{ b.textContent = 'Copiar e-mail'; b.classList.remove('copiado') }}, 2500)
}}))
atualizar()
</script>
</body></html>
"""


def main():
    cartoes = []
    for i, (nome, email, nicho, onde, pedido) in enumerate(LEADS, 1):
        assunto = f"{nome}: veja em {SEG[nicho]} segundos como funciona"
        gmail = (f"https://mail.google.com/mail/u/?authuser={quote(CONTA)}&view=cm&fs=1"
                 f"&to={quote(email)}&su={quote(assunto)}")
        cartoes.append(f"""<section class="lead" data-email="{html.escape(email)}">
<div class="topo"><span class="num">{i:02d}</span><div class="quem"><b>{html.escape(nome)}</b><small>{html.escape(email)} · vídeo de {html.escape(ROTULO[nicho])}</small></div>
<a class="btn gmail" href="{html.escape(gmail)}" target="_blank" rel="noopener">Abrir no Gmail</a>
<button class="copiar" type="button">Copiar e-mail</button>
<label class="feito"><input type="checkbox"> Enviado</label></div>
<div class="assunto"><span>Assunto:</span> {html.escape(assunto)}</div>
<details open><summary>Ver o e-mail</summary><div class="email">{corpo(nome, nicho, onde, pedido)}</div></details>
</section>""")
    saida = AQUI / "envio-17-10.html"
    saida.write_text(PAGINA.format(total=len(LEADS), conta=CONTA, cartoes="\n".join(cartoes)), encoding="utf-8")
    json.dump([{"nome": n, "email": e, "nicho": k} for n, e, k, _, _ in LEADS],
              open(AQUI / "envio-17-10.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(saida, len(LEADS))


if __name__ == "__main__":
    main()
