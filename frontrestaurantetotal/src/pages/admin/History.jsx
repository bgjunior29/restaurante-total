import { useCallback, useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import { Spinner } from '../../components/ui'
import { money, ORDER_TYPES, STATUS, time, todayISO } from '../../lib/format'
import { useTenant } from '../../lib/tenant'

function shiftDay(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const STATUS_FILTERS = [
  ['all', 'Todos'],
  ['done', 'Concluídos'],
  ['canceled', 'Cancelados'],
]
const TYPE_FILTERS = [['', 'Todos'], ...Object.entries(ORDER_TYPES).map(([k, t]) => [k, t.short])]

/** Histórico (só admin): pedidos que já terminaram saem das telas da equipe e ficam aqui, por dia. */
export default function History({ toast }) {
  const { tapi } = useTenant()
  const [day, setDay] = useState(todayISO())
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('') // aplicado depois de uma pausa na digitação
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(null) // id do pedido aberto

  useEffect(() => {
    const t = setTimeout(() => setSearch(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ day, status, ...(type && { type }), ...(search.trim() && { q: search.trim() }) })
      setData(await tapi(`/admin/history?${params}`))
    } catch (e) {
      toast(e.message, 'error')
    }
  }, [tapi, toast, day, status, type, search])

  useEffect(() => {
    load()
  }, [load])

  const today = todayISO()
  const chip = (active) =>
    `rounded-lg border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-ink/80 bg-ink text-green' : 'border-line text-ink/75 hover:text-ink'}`

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl">Histórico de pedidos</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Quando um pedido termina (entregue e pago, ou cancelado) ele sai das telas da equipe e fica guardado aqui. Só administradores veem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-outline px-3 py-2 text-xs" aria-label="Dia anterior" onClick={() => setDay(shiftDay(day, -1))}>
            ←
          </button>
          <input
            type="date"
            aria-label="Dia"
            className="input w-auto py-2 [color-scheme:dark]"
            value={day}
            max={today}
            onChange={(e) => e.target.value && setDay(e.target.value)}
          />
          <button className="btn-outline px-3 py-2 text-xs" aria-label="Próximo dia" disabled={day >= today} onClick={() => setDay(shiftDay(day, 1))}>
            →
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map(([k, label]) => (
          <button key={k} className={chip(status === k)} aria-pressed={status === k} onClick={() => setStatus(k)}>
            {label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        {TYPE_FILTERS.map(([k, label]) => (
          <button key={k || 'all'} className={chip(type === k)} aria-pressed={type === k} onClick={() => setType(k)}>
            {label}
          </button>
        ))}
        <input
          className="input ml-auto w-full py-2 text-sm sm:w-64"
          type="search"
          placeholder="Buscar por código, nome ou telefone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {data === null ? (
        <Spinner />
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Concluídos', data.summary.done],
              ['Cancelados', data.summary.canceled],
              ['Total dos concluídos', money(data.summary.totalCents)],
              ['Recebido', money(data.summary.paidCents)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line/80 p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {data.orders.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">Nenhum pedido terminado neste dia com esses filtros.</p>
          ) : (
            <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {data.orders.map((o) => (
                <HistoryRow key={o.id} order={o} open={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function HistoryRow({ order: o, open, onToggle }) {
  const t = ORDER_TYPES[o.type]
  const st = STATUS[o.status]
  return (
    <li className="bg-dark">
      {/* Celular: código, hora e status em cima; onde/cliente e total embaixo. Telas maiores: uma linha só. */}
      <button
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-left text-sm hover:bg-white/[0.02] sm:grid-cols-[4rem_6rem_minmax(0,1fr)_auto_6rem]"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="text-xs text-muted tabular-nums sm:order-none">
          <span className="font-semibold text-ink sm:hidden">{o.code} · </span>
          {time(o.createdAt)}
        </span>
        <span className={`justify-self-end rounded-md px-2 py-0.5 text-[11px] font-medium sm:order-4 sm:justify-self-start ${st.badge}`}>{st.label}</span>
        <span className="hidden font-semibold sm:order-2 sm:block">{o.code}</span>
        <span className="flex min-w-0 items-center gap-2 sm:order-3">
          <Icon name={t.icon} className="size-4 shrink-0 text-muted" />
          <span className="truncate">
            {o.table ? o.table.label : t.short}
            {o.customerName && <span className="text-muted"> · {o.customerName}</span>}
          </span>
        </span>
        <strong className="text-right tabular-nums sm:order-5">{money(o.totalCents)}</strong>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-line bg-white/[0.015] px-4 py-4 text-sm md:grid-cols-2">
          <ul className="divide-y divide-line">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-1.5">
                <span>
                  {i.quantity}× {i.name}
                  {i.details && <span className="block text-xs text-muted">↳ {i.details}</span>}
                </span>
                <span className="tabular-nums">{money(i.unitPriceCents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1.5 text-xs text-ink/80">
            {o.customerPhone && <p>Telefone: {o.customerPhone}</p>}
            {o.address && (
              <p>
                Endereço: {o.address}
                {o.addressRef && ` (${o.addressRef})`}
              </p>
            )}
            <p>
              Pagamento: {o.paymentMethod || (o.type === 'MESA' ? 'conta da mesa' : '—')} · {o.paid ? 'pago' : 'não pago'}
              {o.changeForCents > 0 && ` · troco p/ ${money(o.changeForCents)}`}
            </p>
            {o.discountCents > 0 && (
              <p>
                Cupom {o.couponCode}: − {money(o.discountCents)}
              </p>
            )}
            {o.deliveryFeeCents > 0 && <p>Entrega: {money(o.deliveryFeeCents)}</p>}
            {o.notes && <p>Obs.: {o.notes}</p>}
            {o.finishedAt && <p>Concluído às {time(o.finishedAt)}</p>}
            {o.review && (
              <p className="text-lime">
                Avaliação: {'★'.repeat(o.review.rating)}
                {o.review.comment && ` — “${o.review.comment}”`}
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
