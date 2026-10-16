// Gera os contratos em PDF (contratos/pdf/) e em HTML editável com botão "Baixar PDF" (contratos/html/),
// mais a página contratos/index.html com os links. Rode de novo sempre que mudar um .md.
// Uso: node contratos/gerar_pdfs.mjs   (usa o playwright-core de videos/ e o Opera GX, como o render dos vídeos)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const DOCS = readdirSync(DIR).filter((f) => /^\d\d-.*\.md$/.test(f) || f === 'melhorias-e-sugestoes.md').sort()

// ---------- Markdown → HTML (só o que os contratos usam) ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const caixa = (s) => s.replace(/\[ \]/g, '☐').replace(/\[x\]/gi, '☒')

function inline(s) {
  const codigos = []
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    codigos.push(/\[.*\]/.test(c) ? `<span class="campo">${caixa(esc(c))}</span>` : `<code>${esc(c)}</code>`)
    return `\u0000${codigos.length - 1}\u0000`
  })
  s = esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, href) => `<a href="${href.replace(/^(\d\d-[^)]*|melhorias-e-sugestoes)\.md$/, '$1.html')}">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
  return caixa(s).replace(/\u0000(\d+)\u0000/g, (_, i) => codigos[i])
}

function markdown(md) {
  const linhas = md.replace(/\r/g, '').split('\n')
  const out = []
  let i = 0
  while (i < linhas.length) {
    const l = linhas[i]
    if (!l.trim()) { i++; continue }
    if (l.startsWith('```')) {
      const bloco = []
      for (i++; i < linhas.length && !linhas[i].startsWith('```'); i++) bloco.push(linhas[i])
      out.push(`<pre>${esc(bloco.join('\n'))}</pre>`); i++; continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(l)
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue }
    if (/^---+\s*$/.test(l)) { out.push('<hr>'); i++; continue }
    if (l.startsWith('|')) {
      const rows = []
      for (; i < linhas.length && linhas[i].startsWith('|'); i++) rows.push(linhas[i])
      const cel = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const temCabecalho = rows[1] && /^\|[\s:|-]+\|$/.test(rows[1].trim())
      const head = temCabecalho ? cel(rows[0]) : null
      const corpo = rows.slice(temCabecalho ? 2 : 0).map(cel)
      const vazio = head && head.every((c) => !c)
      out.push(`<table${vazio ? ' class="assinatura"' : ''}>${head && !vazio ? `<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` : ''}<tbody>${corpo.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
      continue
    }
    if (l.startsWith('>')) {
      const bloco = []
      for (; i < linhas.length && linhas[i].startsWith('>'); i++) bloco.push(linhas[i].replace(/^>\s?/, ''))
      out.push(`<blockquote>${inline(bloco.join(' '))}</blockquote>`); continue
    }
    const lista = /^(\s*)([-*]|\d+\.)\s+/
    if (lista.test(l)) {
      const ordenada = /\d+\./.test(lista.exec(l)[2])
      const itens = []
      for (; i < linhas.length && (lista.test(linhas[i]) || /^\s{2,}\S/.test(linhas[i])); i++) {
        if (lista.test(linhas[i])) itens.push(linhas[i].replace(lista, ''))
        else itens[itens.length - 1] += ' ' + linhas[i].trim()
      }
      const tag = ordenada ? 'ol' : 'ul'
      const check = itens.every((t) => /^\[[ x]\]/i.test(t))
      out.push(`<${tag}${check ? ' class="check"' : ''}>${itens.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`)
      continue
    }
    const par = []
    for (; i < linhas.length && linhas[i].trim() && !/^(#|\||>|```|---|\s*([-*]|\d+\.)\s)/.test(linhas[i]); i++) par.push(linhas[i].trim())
    out.push(`<p>${inline(par.join(' '))}</p>`)
  }
  return out.join('\n')
}

// ---------- Página ----------
const CSS = `
:root { --bg:#0f0e0c; --panel:#1f1d19; --line:#2e2b26; --ink:#1b1915; --muted:#6b665c; --gold:#d4b483; --gold-d:#8a7350; --paper:#fffdf9; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #ece8df; color: var(--ink); font: 13.5px/1.6 Inter, system-ui, sans-serif; }
.barra { position: sticky; top: 0; z-index: 5; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 10px 16px; background: var(--bg); color: #f2efe8; }
.barra b { font: 22px/1 "Instrument Serif", Georgia, serif; font-weight: 400; margin-right: auto; }
.barra span { color: #9a958b; font-size: 12px; }
.barra a, .barra button { font: inherit; font-size: 13px; color: #f2efe8; background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 7px 14px; cursor: pointer; text-decoration: none; }
.barra .principal { background: var(--gold); border-color: var(--gold); color: #141310; font-weight: 600; }
.folha { max-width: 210mm; margin: 24px auto; background: var(--paper); padding: 18mm 18mm 20mm; box-shadow: 0 10px 40px rgba(0,0,0,.12); outline: none; }
.topo { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd5c6; padding-bottom: 8px; margin-bottom: 6px; font-size: 11px; color: var(--muted); }
.topo .marca { display: flex; gap: 8px; align-items: center; color: var(--ink); font: 20px/1 "Instrument Serif", Georgia, serif; }
.topo .logo { width: 26px; height: 26px; border-radius: 50%; background: #141310; color: var(--gold); display: grid; place-items: center; font-size: 16px; }
h1 { font: 32px/1.1 "Instrument Serif", Georgia, serif; font-weight: 400; margin: 18px 0 10px; }
h2 { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--gold-d); margin: 22px 0 6px; break-after: avoid; }
h3 { font-size: 13.5px; margin: 16px 0 4px; break-after: avoid; }
p { margin: 6px 0; text-align: justify; }
ul, ol { margin: 6px 0; padding-left: 22px; }
ul.check { list-style: none; padding-left: 4px; }
li { margin: 2px 0; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12.5px; break-inside: avoid; }
th { text-align: left; font-size: 11px; color: var(--muted); border-bottom: 1px solid #cfc7b7; padding: 5px 6px; }
td { border-bottom: 1px solid #e7e0d2; padding: 5px 6px; vertical-align: top; }
table.assinatura td { border: 0; padding: 26px 10px 4px 0; width: 50%; }
hr { border: 0; border-top: 1px solid #ddd5c6; margin: 16px 0; }
blockquote { margin: 10px 0; padding: 8px 12px; background: #f3eee4; border-left: 3px solid var(--gold); font-size: 12.5px; }
code { font-size: 12px; background: #f1ece2; padding: 0 4px; border-radius: 3px; }
pre { background: #f1ece2; padding: 10px; border-radius: 6px; font-size: 11px; overflow-x: auto; }
a { color: inherit; }
.campo { background: #fbecc4; border-radius: 3px; padding: 0 2px; }
.rodape { margin-top: 26px; font-size: 10.5px; color: var(--muted); border-top: 1px solid #ddd5c6; padding-top: 6px; }
.aviso { max-width: 210mm; margin: 0 auto; padding: 0 16px; font-size: 12px; color: var(--muted); }
@media (max-width: 820px) { .folha { margin: 0; padding: 20px 16px; box-shadow: none; } p { text-align: left; } table { display: block; overflow-x: auto; } }
@media print {
  @page { size: A4; margin: 16mm 16mm 18mm; }
  html, body { background: #fff; }
  .barra, .aviso { display: none !important; }
  .folha { margin: 0; padding: 0; box-shadow: none; max-width: none; background: #fff; }
  .pdf .campo, .imprimir-limpo .campo { background: none; }
  a { text-decoration: none; }
}`

function pagina({ titulo, corpo, arquivo, modo }) {
  const pdf = `../pdf/${arquivo}.pdf`
  const barra = modo === 'html' ? `
<div class="barra"><b>Movitech</b>
  <span id="estado">Clique no texto para preencher os campos amarelos.</span>
  <a href="../index.html">Todos os documentos</a>
  <a href="${pdf}" download>PDF em branco</a>
  <button type="button" id="limpar">Desfazer edições</button>
  <button type="button" class="principal" id="baixar">Baixar PDF preenchido</button>
</div>
<p class="aviso">No "Baixar PDF preenchido", escolha <strong>Salvar como PDF</strong> como destino. As edições ficam salvas só neste navegador.</p>` : ''
  const script = modo === 'html' ? `
<script>
const CHAVE = 'movitech-doc-${arquivo}', folha = document.getElementById('folha'), original = folha.innerHTML
try { const s = localStorage.getItem(CHAVE); if (s) { folha.innerHTML = s; document.getElementById('estado').textContent = 'Edições anteriores recuperadas.' } } catch {}
folha.addEventListener('input', () => { try { localStorage.setItem(CHAVE, folha.innerHTML) } catch {} document.getElementById('estado').textContent = 'Salvo neste navegador.' })
document.getElementById('limpar').onclick = () => { if (!confirm('Voltar ao modelo em branco? As edições serão perdidas.')) return; folha.innerHTML = original; try { localStorage.removeItem(CHAVE) } catch {} }
document.getElementById('baixar').onclick = () => { document.body.classList.add('imprimir-limpo'); window.print(); document.body.classList.remove('imprimir-limpo') }
</script>` : ''
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head>
<body class="${modo}">${barra}
<article class="folha" id="folha"${modo === 'html' ? ' contenteditable="true" spellcheck="false"' : ''}>
<div class="topo"><span class="marca"><span class="logo">M</span>Movitech</span><span>Movitech Sistemas · Barueri/SP · (11) 96445-2878</span></div>
${corpo}
</article>${script}
</body></html>`
}

// ---------- Saída ----------
mkdirSync(join(DIR, 'html'), { recursive: true })
mkdirSync(join(DIR, 'pdf'), { recursive: true })
const lista = []
for (const f of DOCS) {
  const md = readFileSync(join(DIR, f), 'utf8')
  const titulo = (/^#\s+(.*)$/m.exec(md)?.[1] || f).replace(/`/g, '')
  const arquivo = basename(f, '.md')
  const corpo = markdown(md)
  writeFileSync(join(DIR, 'html', `${arquivo}.html`), pagina({ titulo, corpo, arquivo, modo: 'html' }))
  writeFileSync(join(DIR, 'pdf', `.${arquivo}.tmp.html`), pagina({ titulo, corpo, arquivo, modo: 'pdf' }))
  lista.push({ arquivo, titulo })
}

writeFileSync(join(DIR, 'index.html'), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contratos Movitech</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
:root { --bg:#0f0e0c; --panel:#1f1d19; --line:#2e2b26; --ink:#f2efe8; --muted:#9a958b; --gold:#d4b483; }
* { box-sizing: border-box; } body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.5 Inter, system-ui, sans-serif; }
main { max-width: 860px; margin: 0 auto; padding: 40px 16px; }
h1 { font: 44px/1.05 "Instrument Serif", Georgia, serif; font-weight: 400; margin: 0 0 6px; } h1 em { color: var(--gold); }
p { color: var(--muted); margin: 0 0 24px; }
.doc { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; border: 1px solid var(--line); background: var(--panel); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
.doc b { flex: 1 1 260px; font-weight: 600; }
a.btn { color: var(--ink); border: 1px solid var(--line); border-radius: 999px; padding: 7px 14px; text-decoration: none; font-size: 13px; white-space: nowrap; }
a.btn.principal { background: var(--gold); border-color: var(--gold); color: #141310; font-weight: 600; }
</style></head><body><main>
<h1>Contratos <em>Movitech</em></h1>
<p>Baixe o modelo em branco em PDF, ou abra para preencher no navegador e baixe o PDF já preenchido.</p>
<div class="doc"><b>Orçamento (gerador)</b><a class="btn principal" href="orcamento.html">Abrir e baixar PDF</a></div>
${lista.map((d) => `<div class="doc"><b>${esc(d.titulo)}</b><a class="btn" href="html/${d.arquivo}.html">Preencher e baixar</a><a class="btn principal" href="pdf/${d.arquivo}.pdf" download>Baixar PDF</a></div>`).join('\n')}
</main></body></html>`)

// ---------- PDF pelo navegador ----------
const require = createRequire(join(DIR, '..', 'videos', 'package.json'))
const { chromium } = require('playwright-core')
function navegador() {
  const base = join(process.env.LOCALAPPDATA || '', 'Programs', 'Opera GX')
  if (existsSync(base)) {
    const versoes = readdirSync(base).filter((d) => /^\d+\./.test(d) && existsSync(join(base, d, 'opera.exe')))
    if (versoes.length) return join(base, versoes.at(-1), 'opera.exe')
  }
  return undefined
}
const exe = navegador()
const browser = await chromium.launch({ executablePath: exe, headless: !exe, args: exe ? ['--window-position=-4000,0'] : [] })
const page = await browser.newPage()
const cdp = await page.context().newCDPSession(page)
const { unlinkSync } = await import('node:fs')
for (const d of lista) {
  const tmp = join(DIR, 'pdf', `.${d.arquivo}.tmp.html`)
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' }).catch(() => page.goto(pathToFileURL(tmp).href))
  await page.evaluate(() => document.fonts.ready)
  const { data } = await cdp.send('Page.printToPDF', {
    printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font:8px Inter,Arial,sans-serif;color:#8a8478;padding:0 16mm;display:flex;justify-content:space-between"><span>${esc(d.titulo)}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
  })
  writeFileSync(join(DIR, 'pdf', `${d.arquivo}.pdf`), Buffer.from(data, 'base64'))
  unlinkSync(tmp)
  console.log('PDF', `${d.arquivo}.pdf`)
}
await browser.close()
