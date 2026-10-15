import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Título, descrição e endereço oficial (canonical) das páginas públicas da Movitech, para a busca do Google.
// As demais rotas (cardápios, equipe, plataforma) cuidam do próprio título e ficam sem canonical.
const SITE = 'https://movitechsistemas.com.br'
const PAGES = {
  '/': {
    title: 'Movitech Sistemas · Sistemas, sites e apps para o seu negócio', // o mesmo da Landing
    description:
      'Movitech Sistemas, de Barueri/SP: sistema para restaurantes com cardápio digital, QR code na mesa, delivery próprio sem comissão e tela da cozinha. Também sites, links e apps para o seu negócio. Orçamento sob medida pelo WhatsApp.',
  },
  '/restaurantes': {
    title: 'Sistema para restaurantes sem comissão por pedido — Movitech',
    description:
      'Cardápio digital com QR code na mesa, link próprio de delivery e retirada sem comissão, Pix, tela da cozinha e relatórios. Sem aplicativo para baixar. Barueri e região, orçamento sob medida.',
  },
  '/termos': { title: 'Termos de uso — Movitech', description: 'Termos de uso da plataforma Movitech.' },
  '/privacidade': { title: 'Política de privacidade — Movitech', description: 'Como a Movitech trata os dados de clientes e restaurantes.' },
}

function meta(selector, attr, create) {
  let el = document.head.querySelector(selector)
  if (!el && create) {
    el = document.createElement(create.tag)
    Object.entries(create.attrs).forEach(([k, v]) => el.setAttribute(k, v))
    document.head.appendChild(el)
  }
  return el && { set: (v) => el.setAttribute(attr, v), remove: () => el.remove() }
}

export function useSeo() {
  const { pathname } = useLocation()
  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/'
    const page = PAGES[path]
    const canonical = meta('link[rel="canonical"]', 'href', page && { tag: 'link', attrs: { rel: 'canonical' } })
    if (!page) {
      canonical?.remove()
      return
    }
    document.title = page.title
    canonical.set(SITE + (path === '/' ? '/' : path))
    meta('meta[name="description"]', 'content', { tag: 'meta', attrs: { name: 'description' } }).set(page.description)
    meta('meta[property="og:url"]', 'content')?.set(SITE + (path === '/' ? '/' : path))
  }, [pathname])
}
