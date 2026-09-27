import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Spinner, Topbar, useToast } from '../components/ui'
import { useAuth } from '../lib/auth'
import { CALL_KINDS, minutesSince, money, nextStep, ORDER_TYPES, STATUS, time, todayISO, waLink } from '../lib/format'
import { load, save } from '../lib/storage'
import { useTenant } from '../lib/tenant'
import { beep, unlockAudio, useLive } from '../lib/useLive'

const FILTERS = [
  ['ABERTOS', 'Em aberto'],
  ['RECEBIDO', 'Recebido'],
  ['EM_PREPARO', 'Em preparo'],
  ['PRONTO', 'Pronto'],
  ['SAIU_ENTREGA', 'Em entrega'],
  ['ENTREGUE', 'Entregue'],
  ['CANCELADO', 'Cancelado'],
  ['TODOS', 'Todos do dia'],
]
const TYPE_FILTERS = [['', 'Todos'], ...Object.entries(ORDER_TYPES).map(([k, t]) => [k, `${t.icon} ${t.short}`])]

// Em aberto: o que precisa de ação primeiro, e dentro de cada status o pedido mais antigo no topo.
const PRIORITY = { RECEBIDO: 0, EM_PREPARO: 1, PRONTO: 2, SAIU_ENTREGA: 3, ENTREGUE: 4, CANCELADO: 5 }
const byPriority = (a, b) => PRIORITY[a.status] - PRIORITY[b.status] || a.createdAt.localeCompare(b.createdAt)

const ACTIVE = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'SAIU_ENTREGA']

export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

const navClass = ({ isActive }) =>
  `rounded-full border px-3 py-2 text-xs font-bold transition sm:px-4 sm:py-2.5 ${
    isActive ? 'border-lime text-lime' : 'border-line text-ink hover:border-lime hover:text-lime'
  }`

export function StaffTopbar() {
  const { user, logout } = useAuth()
  const { info, to } = useTenant()
  const floor = user?.role !== 'KITCHEN'
  return (
    <Topbar brand={info} to={to()} compact>
      <nav className="flex items-center gap-1.5 sm:gap-2">
        {floor && (
          <NavLink to={to('/equipe')} end className={navClass}>
            Pedidos
          </NavLink>
        )}
        {floor && (
          <NavLink to={to('/equipe/salao')} className={navClass}>
            Salão
          </NavLink>
        )}
        <NavLink to={to('/equipe/cozinha')} className={navClass}>
          Cozinha
        </NavLink>
        {user?.role === 'ADMIN' && (
          <NavLink to={to('/equipe/admin')} className={navClass}>
            Gestão
          </NavLink>
        )}
        <button onClick={logout} className="act" title={`Sair (${user?.name})`}>
          Sair
        </button>
      </nav>
    </Topbar>
  )
}

/** Mensagem pronta de WhatsApp para o cliente, conforme o status do pedido. */
function whatsText(order, restaurant) {
  const step = {
    RECEBIDO: 'recebemos seu pedido e ele já está na fila',
    EM_PREPARO: 'seu pedido está sendo preparado',
    PRONTO: order.type === 'RETIRADA' ? 'seu pedido está pronto para retirada' : 'seu pedido está pronto',
    SAIU_ENTREGA: 'seu pedido saiu para entrega',
    ENTREGUE: 'obrigado pelo pedido! Bom apetite',
    CANCELADO: 'seu pedido foi cancelado',
  }[order.status]
  return `*${restaurant}* · pedido ${order.code}\nOlá${order.customerName ? `, ${order.customerName}` : ''}! ${step}.`
}

export default function Panel() {
  const { slug, info, tapi } = useTenant()
  const [toast, showToast] = useToast()
  const [filter, setFilter] = useState('ABERTOS')
  const [type, setType] = useState('')
  const [day, setDay] = useState(todayISO())
  const [orders, setOrders] = useState(null)
  const [calls, setCalls] = useState([])
  const [stats, setStats] = useState(null)
  const [online, setOnline] = useState(true)
  const [methods, setMethods] = useState([])
  const [fresh, setFresh] = useState(() => new Set()) // pedidos que acabaram de chegar (destaque)
  const [sound, setSound] = useState(() => load('rt_sound', true))
  const soundRef = useRef(sound)
  const reqId = useRef(0)

  useEffect(() => {
    soundRef.current = sound
    save('rt_sound', sound)
  }, [sound])

  const refresh = useCallback(async () => {
    const id = ++reqId.current
    try {
      const base = filter === 'ABERTOS' ? '?open_only=true' : `?day=${day}${filter !== 'TODOS' ? `&status=${filter}` : ''}`
      const q = `${base}${type ? `&type=${type}` : ''}`
      const [o, s, c] = await Promise.all([tapi(`/orders${q}`), tapi(`/stats?day=${day}`), tapi('/calls')])
      if (id !== reqId.current) return // chegou a resposta de um filtro antigo: ignora
      setOrders(filter === 'ABERTOS' ? [...o].sort(byPriority) : o)
      setStats(s)
      setCalls(c)
      setOnline(true)
    } catch (e) {
      if (id !== reqId.current) return
      if (e.status === 0) setOnline(false)
      else showToast(e.message, 'error')
    }
  }, [filter, type, day, showToast, tapi])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    tapi('/payment-methods').then(setMethods).catch(() => {})
  }, [tapi])

  useLive(slug, (event, data) => {
    if (event === 'order_created') {
      if (soundRef.current) beep()
      showToast(`Novo pedido ${data.code} · ${data.where}`)
      setFresh((f) => new Set(f).add(data.id))
      setTimeout(
        () =>
          setFresh((f) => {
            const next = new Set(f)
            next.delete(data.id)
            return next
          }),
        8000,
      )
    }
    if (event === 'call_created') {
      if (soundRef.current) beep()
      showToast(`${CALL_KINDS[data.kind].icon} ${data.table}: ${CALL_KINDS[data.kind].label.toLowerCase()}`)
    }
    if (event === 'stock_low') showToast(`Estoque baixo: ${data.products.join(', ')}`, 'error')
    refresh()
  })

  const openCount = orders?.filter((o) => ACTIVE.includes(o.status)).length ?? 0
  useEffect(() => {
    const pending = openCount + calls.length
    document.title = filter === 'ABERTOS' && pending ? `(${pending}) Pedidos · ${info.name}` : `Pedidos · ${info.name}`
    return () => {
      document.title = `Pedidos · ${info.name}`
    }
  }, [openCount, calls.length, filter, info.name])

  /** Atualiza a tela na hora e confirma com o servidor; se falhar, volta ao estado real. */
  async function act(order, path, body, uiPatch = body) {
    setOrders((list) => list?.map((o) => (o.id === order.id ? { ...o, ...uiPatch } : o)))
    try {
      await tapi(`/orders/${order.id}/${path}`, { method: 'PATCH', body })
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      refresh()
    }
  }

  async function doneCall(c) {
    setCalls((list) => list.filter((x) => x.id !== c.id))
    try {
      await tapi(`/calls/${c.id}/done`, { method: 'PATCH' })
    } catch (e) {
      showToast(e.message, 'error')
      refresh()
    }
  }

  return (
    <div className="min-h-screen" onPointerDown={unlockAudio}>
      <StaffTopbar />
      <main className="mx-auto max-w-[1500px] px-[clamp(16px,5.7vw,96px)] py-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow flex items-center gap-2 text-lime">
              <i className={`size-[7px] rounded-full ${online ? 'animate-pulse bg-lime' : 'bg-amber-400'}`} title={online ? 'Conectado' : 'Sem conexão'} />
              {online ? 'Central de operações · ao vivo' : 'Sem conexão · tentando de novo'}
            </p>
            <h1 className="mt-3 font-display text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.05em]">Pedidos em movimento.</h1>
            <p className="mt-2 max-w-md text-sm text-ink/75">
              Mesa, retirada e delivery chegam aqui em tempo real. Avance cada etapa e avise o cliente.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                unlockAudio()
                setSound((s) => !s)
              }}
              aria-pressed={sound}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${sound ? 'border-lime text-lime' : 'border-line text-muted'}`}
            >
              {sound ? '🔔 Som ligado' : '🔕 Som desligado'}
            </button>
            <input
              type="date"
              aria-label="Dia"
              className="input w-auto py-2 [color-scheme:dark]"
              value={day}
              max={todayISO()}
              onChange={(e) => e.target.value && setDay(e.target.value)}
            />
          </div>
        </div>

        {calls.length > 0 && (
          <section aria-label="Chamados das mesas" className="mt-6 flex flex-wrap gap-2">
            {calls.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-lime bg-lime/10 py-2 pr-2 pl-4 text-sm">
                <span>
                  {CALL_KINDS[c.kind].icon} <strong>{c.table?.label}</strong> · {CALL_KINDS[c.kind].label.toLowerCase()}
                  <span className="ml-2 text-xs text-muted">{time(c.createdAt)}</span>
                </span>
                <button className="rounded-xl bg-lime px-3 py-1.5 text-xs font-bold text-dark" onClick={() => doneCall(c)}>
                  Atendido
                </button>
              </div>
            ))}
          </section>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Pedidos no dia', stats?.orders ?? '–'],
            ['Em andamento', stats?.active ?? '–'],
            ['Mesas abertas · para levar', stats ? `${stats.openTables} · ${stats.delivery}` : '–'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-dark p-4 sm:p-5">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums sm:mt-3">{value}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-line bg-dark p-4 sm:p-5">
            <p className="text-xs text-muted">Recebido · a receber</p>
            <p className="mt-2 font-display text-lg font-bold tabular-nums sm:mt-3">{stats ? money(stats.revenuePaidCents) : '–'}</p>
            <p className="font-display text-sm font-semibold text-[#f4d9a6] tabular-nums">{stats ? `+ ${money(stats.revenuePendingCents)}` : ''}</p>
          </div>
        </div>

        <div className="no-scrollbar -mx-[clamp(16px,5.7vw,96px)] mt-8 flex gap-2 overflow-x-auto px-[clamp(16px,5.7vw,96px)] sm:flex-wrap">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                filter === k ? 'border-lime bg-lime text-dark' : 'border-line text-ink hover:border-lime'
              }`}
            >
              {label}
              {k === 'ABERTOS' && openCount > 0 && filter === 'ABERTOS' && (
                <span className="ml-2 rounded-full bg-dark px-1.5 py-0.5 text-[10px] text-lime">{openCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TYPE_FILTERS.map(([k, label]) => (
            <button
              key={k || 'all'}
              onClick={() => setType(k)}
              aria-pressed={type === k}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${type === k ? 'bg-panel text-lime' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {orders === null ? (
          <Spinner label="Carregando pedidos…" />
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
            {filter === 'ABERTOS' ? (
              <>
                <p className="font-display text-lg text-ink">Tudo em dia. 🍽️</p>
                <p className="mt-1">Nenhum pedido esperando. Os novos aparecem aqui sozinhos.</p>
              </>
            ) : (
              'Nenhum pedido aqui por enquanto.'
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} act={act} methods={methods} fresh={fresh.has(o.id)} lateAfter={info.lateAfterMin} restaurant={info.name} />
            ))}
          </div>
        )}
      </main>
      {toast}
    </div>
  )
}

function OrderCard({ order: o, act, methods, fresh, lateAfter, restaurant }) {
  const now = useNow()
  const [busy, setBusy] = useState(false)
  const [paying, setPaying] = useState(false) // escolhendo a forma de pagamento
  const st = STATUS[o.status]
  const next = nextStep(o)
  const closed = o.status === 'ENTREGUE' || o.status === 'CANCELADO'
  const minutes = minutesSince(o.createdAt, now)
  const late = !closed && minutes >= lateAfter
  const whats = o.customerPhone ? waLink(o.customerPhone, whatsText(o, restaurant)) : null
  const t = ORDER_TYPES[o.type]

  async function run(path, body, uiPatch) {
    if (busy) return
    setBusy(true)
    await act(o, path, body, uiPatch)
    setBusy(false)
  }

  const pay = (m) => {
    setPaying(false)
    run('payment', { paid: true, paymentMethodId: m.id }, { paid: true, paymentMethod: m.name })
  }

  return (
    <article
      className={`flex flex-col rounded-[20px] border bg-dark p-5 transition ${late ? 'border-amber-500/70' : 'border-line'} ${
        closed && (o.paid || o.type === 'MESA') ? 'opacity-70' : ''
      } ${fresh ? 'animate-[flash_1.2s_ease-out_3]' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow text-[10px] text-muted">
            {o.code} · {time(o.createdAt)}
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold">
            {t.icon} {o.table ? o.table.label : t.short}
          </h3>
          <p className="truncate text-xs text-muted">
            {o.customerName || 'Sem nome'}
            {o.customerPhone && ` · ${o.customerPhone}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${st.badge}`}>{st.label}</span>
          {!closed && (
            <span className={`text-[11px] font-semibold tabular-nums ${late ? 'text-amber-300' : 'text-muted'}`}>
              {minutes < 1 ? 'agora' : `há ${minutes} min`}
            </span>
          )}
        </div>
      </div>

      {o.address && (
        <p className="mt-3 rounded-lg bg-panel px-3 py-2 text-xs">
          📍 {o.address}
          {o.addressRef && <span className="block text-muted">{o.addressRef}</span>}
        </p>
      )}

      <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
        {o.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 py-2">
            <span className="min-w-0">
              <strong className="text-lime">{i.quantity}×</strong> {i.name}
              {i.details && <span className="block text-xs text-[#f4e3a6]">↳ {i.details}</span>}
            </span>
            <span className="shrink-0 tabular-nums">{money(i.unitPriceCents * i.quantity)}</span>
          </li>
        ))}
      </ul>
      {o.notes && <p className="mt-3 rounded-lg bg-[#3a3520] px-3 py-2 text-xs text-[#f4e3a6]">Obs.: {o.notes}</p>}

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        {o.type === 'MESA' ? (
          <span className="rounded-lg bg-panel px-2.5 py-1.5">{o.paid ? `Pago na conta · ${o.paymentMethod}` : 'Na conta da mesa'}</span>
        ) : (
          <>
            <span className="rounded-lg bg-panel px-2.5 py-1.5">
              {o.paymentMethod}
              {o.changeForCents > 0 && ` · troco p/ ${money(o.changeForCents)}`}
            </span>
            <span className={`rounded-lg px-2.5 py-1.5 font-semibold ${o.paid ? 'bg-lime text-dark' : 'bg-[#4a3a1f] text-[#f4d9a6]'}`}>
              {o.paid ? 'Pago' : 'A receber'}
            </span>
          </>
        )}
        {o.couponCode && <span className="rounded-lg bg-panel px-2.5 py-1.5">Cupom {o.couponCode}</span>}
        {o.review && <span className="rounded-lg bg-panel px-2.5 py-1.5 text-lime">{'★'.repeat(o.review.rating)}</span>}
      </div>

      {paying ? (
        <div className="mt-4 rounded-xl border border-lime/40 p-3">
          <p className="text-xs font-semibold">Recebido como?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                disabled={busy}
                onClick={() => pay(m)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition hover:border-lime ${
                  m.name === o.paymentMethod ? 'border-lime text-lime' : 'border-line'
                }`}
              >
                {m.name}
              </button>
            ))}
            <button onClick={() => setPaying(false)} className="px-2 text-xs text-muted hover:text-ink">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <strong className="font-display text-xl tabular-nums">{money(o.totalCents)}</strong>
          <div className="flex flex-wrap gap-2">
            {whats && (
              <a href={whats} target="_blank" rel="noreferrer" className="rounded-xl border border-line px-3 py-2 text-xs font-semibold hover:border-lime" title="Abre o WhatsApp com a mensagem pronta">
                WhatsApp
              </a>
            )}
            {o.type !== 'MESA' && o.status !== 'CANCELADO' && (
              <button
                disabled={busy}
                className="rounded-xl border border-line px-3 py-2 text-xs font-semibold hover:border-lime"
                onClick={() => (o.paid ? run('payment', { paid: false }) : methods.length > 1 ? setPaying(true) : run('payment', { paid: true }))}
              >
                {o.paid ? 'Desfazer pago' : 'Marcar pago'}
              </button>
            )}
            {next && (
              <button disabled={busy} className="btn-lime py-2 text-sm" onClick={() => run('status', { status: next.status })}>
                {next.action} →
              </button>
            )}
          </div>
        </div>
      )}
      {!closed && !paying && (
        <button
          disabled={busy}
          className="mt-3 self-end text-[11px] text-muted hover:text-red-300"
          onClick={() => confirm(`Cancelar o pedido ${o.code}? Os itens voltam ao estoque.`) && run('status', { status: 'CANCELADO' })}
        >
          Cancelar pedido
        </button>
      )}
    </article>
  )
}
