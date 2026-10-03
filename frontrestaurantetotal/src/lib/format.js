const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const money = (cents) => brl.format((cents || 0) / 100)

/** "38,90" -> 3890 */
export function parseMoney(text) {
  const clean = String(text).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(clean)
  return Number.isFinite(n) ? Math.round(n * 100) : NaN
}

export const centsToInput = (cents) => (cents / 100).toFixed(2).replace('.', ',')

export const time = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const todayISO = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const pad2 = (n) => String(n).padStart(2, '0')

export const minutesSince = (iso, now = Date.now()) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))

export const STATUS = {
  RECEBIDO: { label: 'Recebido', badge: 'ring-1 ring-inset ring-sky-300/25 bg-sky-300/[0.06] text-sky-200' },
  EM_PREPARO: { label: 'Em preparo', badge: 'ring-1 ring-inset ring-amber-200/25 bg-amber-200/[0.06] text-amber-100' },
  PRONTO: { label: 'Pronto', badge: 'ring-1 ring-inset ring-emerald-300/30 bg-emerald-300/[0.07] text-emerald-200' },
  SAIU_ENTREGA: { label: 'Saiu para entrega', badge: 'ring-1 ring-inset ring-violet-300/25 bg-violet-300/[0.06] text-violet-200' },
  ENTREGUE: { label: 'Entregue', badge: 'ring-1 ring-inset ring-line text-muted' },
  CANCELADO: { label: 'Cancelado', badge: 'ring-1 ring-inset ring-red-400/25 bg-red-400/[0.06] text-red-300' },
}

export const ORDER_TYPES = {
  MESA: { label: 'Na mesa', icon: 'utensils', short: 'Mesa' },
  RETIRADA: { label: 'Retirada no balcão', icon: 'bag', short: 'Retirada' },
  DELIVERY: { label: 'Delivery', icon: 'scooter', short: 'Delivery' },
}

/** Caminho do pedido em cada tipo: [status, rótulo do passo, texto do botão que leva até ele]. */
export const FLOWS = {
  MESA: [
    ['RECEBIDO', 'Recebido', null],
    ['EM_PREPARO', 'Em preparo', 'Iniciar preparo'],
    ['PRONTO', 'Pronto', 'Marcar pronto'],
    ['ENTREGUE', 'Na mesa', 'Servir na mesa'],
  ],
  RETIRADA: [
    ['RECEBIDO', 'Recebido', null],
    ['EM_PREPARO', 'Em preparo', 'Iniciar preparo'],
    ['PRONTO', 'Pronto p/ retirar', 'Marcar pronto'],
    ['ENTREGUE', 'Retirado', 'Cliente retirou'],
  ],
  DELIVERY: [
    ['RECEBIDO', 'Recebido', null],
    ['EM_PREPARO', 'Em preparo', 'Iniciar preparo'],
    ['PRONTO', 'Pronto', 'Marcar pronto'],
    ['SAIU_ENTREGA', 'Saiu p/ entrega', 'Saiu para entrega'],
    ['ENTREGUE', 'Entregue', 'Confirmar entrega'],
  ],
}

/** Próximo passo do pedido: { status, action } ou null. */
export function nextStep(order) {
  const flow = FLOWS[order.type] || FLOWS.MESA
  const i = flow.findIndex(([s]) => s === order.status)
  if (i < 0 || i === flow.length - 1) return null
  return { status: flow[i + 1][0], action: flow[i + 1][2] }
}

export const STATIONS = {
  COZINHA: 'Cozinha',
  BAR: 'Bar',
  CONFEITARIA: 'Confeitaria',
  COPA: 'Copa',
}

export const CALL_KINDS = {
  GARCOM: { label: 'Chamou o garçom', icon: 'hand' },
  CONTA: { label: 'Pediu a conta', icon: 'receipt' },
  AJUDA: { label: 'Precisa de ajuda', icon: 'help' },
}

export const PAYMENT_KINDS = {
  PIX: 'Pix (mostra a chave Pix)',
  CARD: 'Cartão',
  CASH: 'Dinheiro (pergunta o troco)',
  OTHER: 'Outro',
}

/** Link do WhatsApp com a mensagem pronta (funciona sem nenhuma configuração de API). */
export function waLink(phone, text = '') {
  let digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  if (!digits.startsWith('55')) digits = `55${digits}`
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** "cantina-da-nonna" a partir de "Cantina da Nonna" */
export const slugify = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
