// Folha de contato para revisar um vídeo HTML antes do render: captura quadros nos instantes pedidos
// e salva out/<nome>-quadros.png (grade com o tempo de cada quadro).
//   node scripts/quadros_chave.mjs nicho-clinicas 1.5 3 6.5 9 12.5 16 18 20.5
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const [nome, ...ts] = process.argv.slice(2)
const base = join(process.env.LOCALAPPDATA || '', 'Programs', 'Opera GX')
const v = existsSync(base) ? readdirSync(base).filter((d) => /^\d+\./.test(d)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1) : null
const exe = process.env.NAVEGADOR || (v ? join(base, v, 'opera.exe') : undefined)

const browser = await chromium.launch({ executablePath: exe, headless: !exe, args: exe ? ['--window-position=-4000,0'] : [] })
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
await page.goto(pathToFileURL(join(RAIZ, 'html', nome, 'index.html')).href + '?render')
await page.waitForFunction(() => window.PRONTO === true)
const dir = join(RAIZ, 'out', 'quadros', nome)
mkdirSync(dir, { recursive: true })
const arquivos = []
for (const t of ts) {
  await page.evaluate((x) => window.seek(x), +t)
  const f = join(dir, `${t}.jpg`)
  writeFileSync(f, await page.screenshot({ type: 'jpeg', quality: 85 }))
  arquivos.push([t, f])
}
await browser.close()
spawnSync('python', ['-c', `
import sys, json
from PIL import Image, ImageDraw
fs = json.loads(sys.argv[1]); col = 4; w, h = 360, 640
img = Image.new('RGB', (col * w, ((len(fs) + col - 1) // col) * (h + 40)), '#000')
d = ImageDraw.Draw(img)
for i, (t, f) in enumerate(fs):
    x, y = (i % col) * w, (i // col) * (h + 40)
    img.paste(Image.open(f).resize((w, h)), (x, y + 40)); d.text((x + 10, y + 10), t + ' s', fill='#fff')
img.save(sys.argv[2])`, JSON.stringify(arquivos), join(RAIZ, 'out', `${nome}-quadros.png`)], { stdio: 'inherit' })
console.log(`out/${nome}-quadros.png`)
