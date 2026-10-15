// Renderiza um vídeo em HTML puro (html/<nome>/index.html) para out/<nome>.mp4.
// O navegador captura quadro a quadro (window.seek) e o scripts/montar_mp4.py (PyAV) codifica vídeo + áudio.
// No notebook usa o Opera GX (o Smart App Control bloqueia o Chrome headless e o ffmpeg.exe).
//   node scripts/render_html.mjs nicho-clinicas [nicho-saloes ...]   (ou "nicho-" para todos os nichos)
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

function navegador() {
  if (process.env.NAVEGADOR) return process.env.NAVEGADOR
  const base = join(process.env.LOCALAPPDATA || '', 'Programs', 'Opera GX')
  if (existsSync(base)) {
    const versoes = readdirSync(base).filter((d) => /^\d+\./.test(d) && existsSync(join(base, d, 'opera.exe')))
    versoes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    if (versoes.length) return join(base, versoes.at(-1), 'opera.exe')
  }
  return undefined // Linux/CI: Chromium do Playwright
}

// O Opera às vezes trava um print depois de centenas de quadros: tenta de novo antes de desistir.
async function captura(page) {
  for (let tent = 1; ; tent++) {
    try { return await page.screenshot({ type: 'jpeg', quality: 93, timeout: 15000 }) } catch (e) {
      if (tent >= 4) throw e
      process.stdout.write(` (print travou, tentativa ${tent + 1})`)
      await page.bringToFront().catch(() => {})
    }
  }
}

const pedidos = process.argv.slice(2)
if (!pedidos.length) { console.error('uso: node scripts/render_html.mjs <nome> [...]'); process.exit(1) }
const todos = readdirSync(join(RAIZ, 'html')).filter((d) => existsSync(join(RAIZ, 'html', d, 'index.html')))
const nomes = todos.filter((d) => pedidos.some((p) => d === p || (p.endsWith('-') && d.startsWith(p))))

const exe = navegador()
const browser = await chromium.launch({ executablePath: exe, headless: !exe, args: [...(exe ? ['--window-position=-4000,0'] : []), '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] })
mkdirSync(join(RAIZ, 'out'), { recursive: true })

for (const nome of nomes) {
  const pagina = join(RAIZ, 'html', nome, 'index.html')
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
  await page.goto(pathToFileURL(pagina).href + '?render')
  await page.waitForFunction(() => window.PRONTO === true)
  const info = await page.evaluate(() => ({ dur: window.DURACAO, fps: window.FPS, audio: window.AUDIO }))
  const total = Math.round(info.dur * info.fps)
  const audio = info.audio.map((a) => ({ ...a, src: resolve(dirname(pagina), a.src) }))
  const saida = join(RAIZ, 'out', `${nome}.mp4`)

  const py = spawn('python', [join(RAIZ, 'scripts', 'montar_mp4.py')], { stdio: ['pipe', 'inherit', 'inherit'] })
  const fimPy = new Promise((ok, erro) => py.on('close', (c) => (c === 0 ? ok() : erro(new Error(`montar_mp4.py saiu com ${c}`)))))
  const escreve = (buf) => new Promise((ok) => (py.stdin.write(buf) ? ok() : py.stdin.once('drain', ok)))
  await escreve(JSON.stringify({ w: 1080, h: 1920, fps: info.fps, total, audio, saida }) + '\n')

  const t0 = Date.now()
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.seek(t), i / info.fps)
    const jpg = await captura(page)
    const tam = Buffer.alloc(4); tam.writeUInt32LE(jpg.length)
    await escreve(tam); await escreve(jpg)
    if (i % 60 === 0) process.stdout.write(`\r${nome}: ${i}/${total} quadros`)
  }
  py.stdin.end()
  await fimPy
  console.log(`\r${nome}: ${total} quadros em ${((Date.now() - t0) / 1000).toFixed(0)} s → out/${nome}.mp4`)
  await page.close()
}
await browser.close()
