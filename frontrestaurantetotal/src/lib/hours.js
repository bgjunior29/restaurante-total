// Horário de atendimento: weeklyHours = 7 dias (0 = domingo), cada um com intervalos { open: "11:30", close: "15:00" }.
// Fechamento menor que a abertura = passa da meia-noite (ex.: 18:00 às 02:00).

export const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // segunda primeiro, como nos cardápios

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** "11:30" → "11h30", "18:00" → "18h". */
export const fmtHour = (hhmm) => {
  const [h, m] = hhmm.split(':')
  return `${Number(h)}h${m === '00' ? '' : m}`
}

export const fmtRanges = (ranges) => ranges.map((r) => `${fmtHour(r.open)} às ${fmtHour(r.close)}`).join(' · ')

/** Dia da semana e minutos do dia no horário de Brasília (o restaurante), não no do aparelho. */
export function nowInBrazil(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  )
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday), minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute) }
}

/** { open: true, closes } | { open: false, opens, opensIn (dias), opensDay } | { open: false } | null (sem horários). */
export function storeStatus(week, date = new Date()) {
  if (!week?.length) return null
  const { day, minutes } = nowInBrazil(date)
  for (const r of week[day]) {
    const o = toMin(r.open)
    const c = toMin(r.close)
    if (c > o ? minutes >= o && minutes < c : minutes >= o) return { open: true, closes: r.close }
  }
  for (const r of week[(day + 6) % 7]) {
    // o turno de ontem que passa da meia-noite
    if (toMin(r.close) < toMin(r.open) && minutes < toMin(r.close)) return { open: true, closes: r.close }
  }
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7
    const ranges = [...week[d]].sort((a, b) => toMin(a.open) - toMin(b.open))
    for (const r of ranges) {
      if (i === 0 && toMin(r.open) <= minutes) continue
      return { open: false, opens: r.open, opensIn: i, opensDay: d }
    }
  }
  return { open: false }
}

/**
 * Texto do status para o cliente: { tone: 'open' | 'closed' | 'paused', title, detail }.
 * Pedidos pausados pela equipe vencem o horário; sem horários cadastrados, usa o texto livre.
 */
export function statusText(menu, date = new Date()) {
  if (!menu.ordersOpen) return { tone: 'paused', title: 'Pedidos pausados', detail: 'no momento não estamos recebendo pedidos pelo site' }
  const s = storeStatus(menu.weeklyHours, date)
  if (!s) return { tone: 'open', title: 'Aberto para pedidos', detail: menu.openingHours || '' }
  if (s.open) return { tone: 'open', title: 'Aberto agora', detail: `fecha às ${fmtHour(s.closes)}` }
  if (s.opens == null) return { tone: 'closed', title: 'Loja fechada', detail: '' }
  const when = s.opensIn === 0 ? 'hoje' : s.opensIn === 1 ? 'amanhã' : DAYS[s.opensDay].toLowerCase()
  return { tone: 'closed', title: 'Loja fechada', detail: `abre ${when} às ${fmtHour(s.opens)}` }
}
