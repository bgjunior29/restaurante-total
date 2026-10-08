import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { Spinner, useToast } from '../components/ui'
import { useAuth } from '../lib/auth'
import { money, ORDER_TYPES, time } from '../lib/format'
import { load, save } from '../lib/storage'
import { useTenant } from '../lib/tenant'
import { beep, unlockAudio, useLive } from '../lib/useLive'
import { OrderCard, StaffTopbar } from './Panel'

const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || location.origin

// Colunas da comanda: cada pedido fica na etapa em que está, mais antigo no topo.
const COLUMNS = {
  DELIVERY: [
    ['RECEBIDO', 'Novos'],
    ['EM_PREPARO', 'Em preparo'],
    ['PRONTO', 'Prontos para sair'],
    ['SAIU_ENTREGA', 'Em rota'],
  ],
  RETIRADA: [
    ['RECEBIDO', 'Novos'],
    ['EM_PREPARO', 'Em preparo'],
    ['PRONTO', 'Prontos para retirar'],
  ],
}

/**
 * Comandas de delivery (e retirada): separadas das contas das mesas, que ficam no Salão.
 * Cada comanda tem endereço com mapa, pagamento e troco, impressão para o entregador e bloqueio de telefone.
 */
export default function Delivery() {
  const { slug, info, tapi, to } = useTenant()
  const { user } = useAuth()
  const [toast, showToast] = useToast()
  const [type, setType] = useState('DELIVERY')
  const [orders, setOrders] = useState(null)
  const [methods, setMethods] = useState([])
  const [online, setOnline] = useState(true)
  const [fresh, setFresh] = useState(() => new Set())
  const [ticket, setTicket] = useState(null) // comanda sendo impressa
  const [sound, setSound] = useState(() => load('rt_sound', true))
  const soundRef = useRef(sound)
  const reqId = useRef(0)
  const link = `${PUBLIC_URL.replace(/\/$/, '')}/r/${slug}/delivery`

  useEffect(() => {
    soundRef.current = sound
    save('rt_sound', sound)
  }, [sound])

  const refresh = useCallback(async () => {
    const id = ++reqId.current
    try {
      const list = await tapi(`/orders?open_only=true&type=${type}`)
      if (id !== reqId.current) return
      setOrders(list.filter((o) => o.status !== 'CANCELADO'))
      setOnline(true)
    } catch (e) {
      if (id !== reqId.current) return
      if (e.status === 0) setOnline(false)
      else showToast(e.message, 'error')
    }
  }, [tapi, type, showToast])

  useEffect(() => {
    setOrders(null)
    refresh()
  }, [refresh])

  useEffect(() => {
    tapi('/payment-methods').then(setMethods).catch(() => {})
  }, [tapi])

  useEffect(() => {
    document.title = `Delivery · ${info.name}`
  }, [info.name])

  useLive(slug, (event, data) => {
    if (event === 'order_created' && data.type !== 'MESA') {
      if (soundRef.current) beep()
      showToast(`Novo pedido ${data.code} · ${data.where}`)
      setFresh((f) => new Set(f).add(data.id))
      setTimeout(() => setFresh((f) => new Set([...f].filter((x) => x !== data.id))), 8000)
    }
    if (event !== 'call_created') refresh()
  })

  // Imprime só a comanda (o resto da tela fica escondido na impressão).
  useEffect(() => {
    if (!ticket) return
    const done = () => setTicket(null)
    window.addEventListener('afterprint', done, { once: true })
    const t = setTimeout(() => window.print(), 50)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', done)
    }
  }, [ticket])

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

  async function block(o) {
    const reason = prompt(
      `Bloquear ${o.customerPhone}?\nEste telefone não vai conseguir pedir delivery nem retirada pelo site (o gestor desbloqueia em Gestão → Delivery).\n\nMotivo (opcional):`,
      'Trote',
    )
    if (reason === null) return
    try {
      await tapi(`/orders/${o.id}/block-phone`, { method: 'POST', body: { reason } })
      showToast(`Telefone ${o.customerPhone} bloqueado.`)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      showToast('Link do delivery copiado. Cole no Instagram, WhatsApp ou Google.')
    } catch {
      prompt('Copie o link do delivery:', link)
    }
  }

  // Entregue mas ainda não pago continua aqui até receber; depois vai para o histórico.
  const columns = [...COLUMNS[type], ...(orders?.some((o) => o.status === 'ENTREGUE') ? [['ENTREGUE', 'Entregues, falta receber']] : [])]
  const toReceive = orders?.filter((o) => !o.paid && o.status !== 'CANCELADO').reduce((s, o) => s + o.totalCents, 0) ?? 0
  const card = (o) => (
    <OrderCard
      key={o.id}
      order={o}
      act={act}
      methods={methods}
      fresh={fresh.has(o.id)}
      lateAfter={info.lateAfterMin}
      restaurant={info.name}
      onPrint={setTicket}
      onBlock={block}
    />
  )

  return (
    <div className="min-h-screen" onPointerDown={unlockAudio}>
      <div className="print:hidden">
        <StaffTopbar />
        <main className="mx-auto max-w-[1800px] px-[clamp(16px,4vw,72px)] py-8 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow flex items-center gap-2 text-lime">
                <i className={`size-1.5 rounded-full ${online ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,.15)]' : 'bg-amber-400'}`} />
                {online ? 'Comandas de delivery · ao vivo' : 'Sem conexão · tentando de novo'}
              </p>
              <h1 className="mt-3 font-serif text-[clamp(30px,4vw,46px)]">Delivery, longe das mesas.</h1>
              <p className="mt-2 max-w-lg text-sm text-ink/75">
                Pedidos que chegam pelo link do restaurante. Não entram na conta de nenhuma mesa: cada um é uma comanda própria, com endereço,
                pagamento e troco.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-medium hover:border-lime" title={link}>
                <Icon name="link" /> Copiar link do delivery
              </button>
              <button
                onClick={() => {
                  unlockAudio()
                  setSound((s) => !s)
                }}
                aria-pressed={sound}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${sound ? 'border-lime/40 text-lime' : 'border-line text-muted'}`}
              >
                <Icon name="bell" />
                {sound ? 'Som ligado' : 'Som desligado'}
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-xl border border-line/70 bg-dark/60 p-1">
              {['DELIVERY', 'RETIRADA'].map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition ${type === t ? 'bg-white/[0.08] text-ink' : 'text-muted hover:text-ink'}`}
                >
                  <Icon name={ORDER_TYPES[t].icon} /> {ORDER_TYPES[t].short}
                </button>
              ))}
            </div>
            {user?.role === 'ADMIN' && (
              <Link to={to('/equipe/admin/historico')} className="text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
                Pedidos concluídos ficam no Histórico →
              </Link>
            )}
          </div>

          {orders && (
            <p className="mt-4 text-xs text-muted">
              {orders.length} {orders.length === 1 ? 'comanda aberta' : 'comandas abertas'} · a receber <strong className="text-ink">{money(toReceive)}</strong>
            </p>
          )}

          {orders === null ? (
            <Spinner label="Carregando comandas…" />
          ) : orders.length === 0 ? (
            <Empty
              title="Nenhuma comanda aberta."
              text={`Os pedidos de ${type === 'DELIVERY' ? 'delivery' : 'retirada'} aparecem aqui sozinhos, com aviso sonoro.`}
            />
          ) : (
            // Celular: uma coluna por etapa, uma embaixo da outra. Telas grandes: quadro lado a lado.
            <div className={`mt-5 grid items-start gap-5 md:grid-cols-2 ${columns.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
              {columns.map(([status, label]) => {
                const list = orders.filter((o) => o.status === status).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                return (
                  <section key={status} aria-label={label} className="min-w-0 rounded-2xl border border-line/60 bg-white/[0.015] p-3">
                    <h2 className="flex items-center justify-between px-2 pt-1 pb-3 text-sm font-semibold">
                      {label}
                      <span className="rounded-md bg-panel px-2 py-0.5 text-xs tabular-nums text-muted">{list.length}</span>
                    </h2>
                    <div className="grid gap-3">{list.length ? list.map(card) : <p className="px-2 pb-3 text-xs text-muted">Nada aqui.</p>}</div>
                  </section>
                )
              })}
            </div>
          )}
        </main>
      </div>
      {ticket && <Ticket order={ticket} restaurant={info.name} />}
      {toast}
    </div>
  )
}

function Empty({ title, text }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
      {title && <p className="font-serif text-2xl text-ink">{title}</p>}
      <p className="mt-1">{text}</p>
    </div>
  )
}

/** Comanda impressa (bobina de 80 mm): o que a cozinha monta e o entregador leva. */
function Ticket({ order: o, restaurant }) {
  return (
    <div className="hidden bg-white p-2 font-mono text-[12px] leading-snug text-black print:block print:w-[72mm]">
      <p className="text-center text-[14px] font-bold">{restaurant}</p>
      <p className="text-center">{ORDER_TYPES[o.type].label.toUpperCase()}</p>
      <p className="my-1 text-center text-[20px] font-bold">{o.code}</p>
      <p className="text-center">
        Pedido às {time(o.createdAt)} · impresso às {time(new Date().toISOString())}
      </p>
      <hr className="my-2 border-dashed border-black" />
      <p className="font-bold">{o.customerName}</p>
      <p>{o.customerPhone}</p>
      {o.address && (
        <>
          <p className="mt-1">{o.address}</p>
          {o.addressRef && <p>Ref.: {o.addressRef}</p>}
        </>
      )}
      <hr className="my-2 border-dashed border-black" />
      {o.items.map((i) => (
        <div key={i.id} className="mb-1">
          <div className="flex justify-between gap-2">
            <span className="font-bold">
              {i.quantity}x {i.name}
            </span>
            <span>{money(i.unitPriceCents * i.quantity)}</span>
          </div>
          {i.details && <p className="pl-3">+ {i.details}</p>}
        </div>
      ))}
      {o.notes && <p className="mt-1 border border-black p-1">OBS: {o.notes}</p>}
      <hr className="my-2 border-dashed border-black" />
      <Row label="Produtos" value={money(o.subtotalCents)} />
      {o.discountCents > 0 && <Row label={`Cupom ${o.couponCode}`} value={`- ${money(o.discountCents)}`} />}
      {o.type === 'DELIVERY' && <Row label="Entrega" value={o.deliveryFeeCents ? money(o.deliveryFeeCents) : 'Grátis'} />}
      <Row label="TOTAL" value={money(o.totalCents)} bold />
      <hr className="my-2 border-dashed border-black" />
      <p>
        Pagamento: <strong>{o.paymentMethod}</strong> · {o.paid ? 'JÁ PAGO' : 'A RECEBER'}
      </p>
      {o.changeForCents > 0 && (
        <p>
          Troco para {money(o.changeForCents)} → levar <strong>{money(o.changeForCents - o.totalCents)}</strong>
        </p>
      )}
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-[14px] font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
