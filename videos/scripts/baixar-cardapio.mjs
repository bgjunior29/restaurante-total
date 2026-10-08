// Baixa o cardápio publicado do restaurante (pratos, fotos, logo e cores do tema) para o vídeo.
// Uso: npm run dados                      → point-arena, um prato com foto de cada categoria (até 6)
//      npm run dados -- outro-slug 1,3,5  → outro restaurante e/ou os produtos escolhidos (ids)
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { THEMES, DEFAULT_THEME } from '../../frontrestaurantetotal/src/lib/themes.js'

const SITE = process.env.SITE_URL || 'https://frontrestaurantetotal.vercel.app'
const [slug = 'point-arena', picked = ''] = process.argv.slice(2)
const MAX = 6

async function get(path) {
  const res = await fetch(`${SITE}${path}`)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res
}

async function download(path, file) {
  const res = await get(path)
  await writeFile(file, Buffer.from(await res.arrayBuffer()))
}

const menu = await (await get(`/api/t/${slug}/menu`)).json()
const all = menu.categories.flatMap((c) => c.products.map((p) => ({ ...p, category: c.name })))
const withPhoto = all.filter((p) => p.imageUrl)

let dishes
if (picked) {
  const ids = picked.split(',').map(Number)
  dishes = ids.map((id) => withPhoto.find((p) => p.id === id)).filter(Boolean)
} else {
  // Um de cada categoria primeiro (variedade), depois completa na ordem do cardápio.
  const first = menu.categories.map((c) => withPhoto.find((p) => p.category === c.name)).filter(Boolean)
  dishes = [...first, ...withPhoto.filter((p) => !first.includes(p))].slice(0, MAX)
}
if (!dishes.length) throw new Error('Nenhum produto com foto no cardápio.')

await rm('public/pratos', { recursive: true, force: true })
await mkdir('public/pratos', { recursive: true })
for (const [i, p] of dishes.entries()) {
  p.photo = `pratos/${i + 1}.jpg`
  await download(p.imageUrl, `public/${p.photo}`)
}

let logo = null
if (menu.logoUrl) {
  const res = await get(menu.logoUrl)
  const ext = (res.headers.get('content-type') || '').includes('png') ? 'png' : 'jpg'
  logo = `logo.${ext}`
  await writeFile(`public/${logo}`, Buffer.from(await res.arrayBuffer()))
}

const theme = THEMES[menu.theme] || THEMES[DEFAULT_THEME]
const data = {
  slug,
  name: menu.name,
  tagline: menu.tagline,
  heroTitle: menu.heroTitle,
  heroHighlight: menu.heroHighlight,
  instagram: menu.instagram?.replace(/^@/, '') || '',
  logo,
  accent: menu.accentColor || theme.accent,
  colors: theme.colors,
  delivery: menu.deliveryEnabled
    ? { feeCents: menu.deliveryFeeCents, freeAboveCents: menu.freeDeliveryAboveCents, minutes: menu.deliveryTimeMin }
    : null,
  link: `${SITE}/r/${slug}/delivery`,
  dishes: dishes.map((p) => ({ name: p.name, description: p.description, category: p.category, priceCents: p.priceCents, photo: p.photo })),
}
await writeFile('src/cardapio.json', JSON.stringify(data, null, 2))
console.log(`${data.name}: ${dishes.length} pratos → ${dishes.map((d) => d.name).join(', ')}`)
