import { useEffect, useRef, useState } from 'react'
import { DAYS, fmtRanges, nowInBrazil, statusText, WEEK_ORDER } from '../lib/hours'
import { money, waLink } from '../lib/format'
import Icon from './Icon'

const TONE = {
  open: 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,.18)]',
  closed: 'bg-red-400 shadow-[0_0_0_3px_rgba(248,113,113,.18)]',
  paused: 'bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,.18)]',
}
const PAY_ICON = { PIX: 'receipt', CASH: 'bag', CARD: 'receipt', OTHER: 'receipt' }

/** Status atualizado a cada minuto (abre/fecha sozinho com a página aberta). */
function useStatus(menu) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return statusText(menu, now)
}

/**
 * Faixa fina logo abaixo do topo do cardápio: status da loja e atalho para o perfil.
 * Não fica grudada no topo, então não ocupa espaço enquanto a pessoa rola o cardápio.
 */
export function StoreBar({ menu, onOpen }) {
  const s = useStatus(menu)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 border-b border-line/60 bg-dark/40 px-[clamp(16px,5.7vw,96px)] py-2.5 text-left text-xs transition hover:bg-dark/60"
      aria-label={`${s.title}${s.detail ? `, ${s.detail}` : ''}. Ver perfil da loja`}
    >
      <i className={`size-2 shrink-0 rounded-full ${TONE[s.tone]}`} aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        <strong className="font-semibold text-ink">{s.title}</strong>
        {s.detail && <span className="text-muted"> · {s.detail}</span>}
      </span>
      {menu.address && (
        <span className="hidden max-w-[38%] items-center gap-1.5 truncate text-muted md:flex">
          <Icon name="pin" className="size-3.5 shrink-0" />
          <span className="truncate">{menu.address}</span>
        </span>
      )}
      <span className="flex shrink-0 items-center gap-1 font-semibold text-lime">
        <span className="hidden sm:inline">Perfil da loja</span>
        <span className="sm:hidden">Ver mais</span>
        <Icon name="arrow" className="size-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

function Card({ title, icon, children }) {
  return (
    <section className="rounded-2xl bg-[#f1eee7] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon name={icon} className="size-4 text-olive" /> {title}
      </h3>
      <div className="mt-3 text-sm text-[#4f4a42]">{children}</div>
    </section>
  )
}

/** Perfil da loja: horários, pagamento, endereço com mapa, entrega e contatos. Celular: sobe de baixo; computador: lateral. */
export function StoreSheet({ menu, atTable, onClose }) {
  const s = useStatus(menu)
  const panel = useRef(null)
  const today = nowInBrazil().day
  const week = menu.weeklyHours || []
  const map = menu.address ? `https://maps.google.com/maps?q=${encodeURIComponent(menu.address)}&z=16&output=embed` : null
  const route = menu.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(menu.address)}` : null
  const whats = waLink(menu.whatsapp, `Olá, ${menu.name}!`)
  const insta = menu.instagram?.replace(/^@/, '')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panel.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <button aria-label="Fechar" tabIndex={-1} className="absolute inset-0 animate-[fade-in_.2s_ease-out] bg-black/60" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${menu.name}`}
        className="relative flex max-h-[90vh] w-full animate-[rise_.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-cream text-dark outline-none sm:h-full sm:max-h-none sm:max-w-[440px] sm:animate-[slide-in_.25s_ease-out] sm:rounded-none"
      >
        <div className={`flex items-center gap-3 px-5 py-3 text-sm ${s.tone === 'open' ? 'bg-emerald-100 text-emerald-900' : s.tone === 'paused' ? 'bg-amber-100 text-amber-900' : 'bg-[#e9e5dc] text-dark'}`}>
          <i className={`size-2 shrink-0 rounded-full ${TONE[s.tone]}`} aria-hidden />
          <span className="min-w-0 flex-1">
            <strong className="font-semibold">{s.title}</strong>
            {s.detail && <span>, {s.detail}</span>}
          </span>
          <button aria-label="Fechar" onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 pb-1">
            {menu.logoUrl ? (
              <img src={menu.logoUrl} alt="" className="size-12 rounded-full border border-[#e2dccf] object-cover" />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-full bg-dark font-serif text-lg text-cream">{menu.name
                  .split(/\s+/)
                  .filter((w) => w.length > 2)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || menu.name.slice(0, 2)}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate font-serif text-2xl leading-tight">{menu.name}</h2>
              {menu.tagline && <p className="truncate text-xs text-[#6b7266]">{menu.tagline}</p>}
            </div>
          </div>

          <Card title="Horário de atendimento" icon="clock">
            {week.length ? (
              <ul className="divide-y divide-[#e2ddd2]">
                {WEEK_ORDER.map((d) => (
                  <li key={d} className={`flex justify-between gap-4 py-1.5 ${d === today ? 'font-semibold text-dark' : ''}`}>
                    <span>
                      {DAYS[d]}
                      {d === today && <span className="ml-2 rounded bg-dark px-1.5 py-0.5 text-[10px] font-semibold text-cream">hoje</span>}
                    </span>
                    <span className="text-right tabular-nums">{week[d].length ? fmtRanges(week[d]) : 'Fechado'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{menu.openingHours || 'Horário não informado. Fale com a gente pelo WhatsApp.'}</p>
            )}
            {week.length > 0 && menu.openingHours && <p className="mt-2 text-xs text-[#6b7266]">{menu.openingHours}</p>}
          </Card>

          {menu.paymentMethods?.length > 0 && (
            <Card title="Formas de pagamento" icon="receipt">
              <ul className="flex flex-wrap gap-2">
                {menu.paymentMethods.map((m) => (
                  <li key={m.id} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-dark">
                    <Icon name={PAY_ICON[m.kind] || 'receipt'} className="size-3.5 text-olive" /> {m.name}
                  </li>
                ))}
              </ul>
              {!atTable && <p className="mt-2 text-xs text-[#6b7266]">Pix com código copia e cola no fim do pedido. Dinheiro: pague na entrega ou no balcão.</p>}
            </Card>
          )}

          {!atTable && (menu.deliveryEnabled || menu.pickupEnabled) && (
            <Card title="Entrega e retirada" icon="scooter">
              <ul className="space-y-1">
                {menu.deliveryEnabled && (
                  <li>
                    Delivery em ~{menu.deliveryTimeMin} min · taxa {money(menu.deliveryFeeCents)}
                    {menu.freeDeliveryAboveCents > 0 && ` (grátis acima de ${money(menu.freeDeliveryAboveCents)})`}
                  </li>
                )}
                {menu.deliveryEnabled && menu.minDeliveryCents > 0 && <li>Pedido mínimo para entrega: {money(menu.minDeliveryCents)}</li>}
                {menu.deliveryEnabled && menu.deliveryArea && <li>Atendemos: {menu.deliveryArea}</li>}
                {menu.pickupEnabled && <li>Retirada no balcão em ~{menu.prepTimeMin} min</li>}
              </ul>
            </Card>
          )}

          {menu.address && (
            <Card title="Endereço" icon="pin">
              <p>{menu.address}</p>
              <div className="mt-3 overflow-hidden rounded-xl border border-[#e2ddd2] bg-[#e9e5dc]">
                <iframe title={`Mapa: ${menu.address}`} src={map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="block aspect-[16/10] w-full border-0" />
              </div>
              <a href={route} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-olive hover:underline">
                Como chegar <Icon name="arrow" className="size-3.5" />
              </a>
            </Card>
          )}

          {(whats || menu.phone || insta) && (
            <Card title="Contato" icon="chat">
              <div className="flex flex-wrap gap-2">
                {whats && (
                  <a href={whats} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-dark px-3.5 py-2 text-xs font-semibold text-cream">
                    <Icon name="chat" className="size-3.5" /> WhatsApp
                  </a>
                )}
                {menu.phone && (
                  <a href={`tel:${menu.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold">
                    <Icon name="phone" className="size-3.5" /> {menu.phone}
                  </a>
                )}
                {insta && (
                  <a href={`https://instagram.com/${insta}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold">
                    @{insta}
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
