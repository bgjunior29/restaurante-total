import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PixBox from '../components/PixBox'
import { Spinner, Topbar, useToast } from '../components/ui'
import { FLOWS, money, ORDER_TYPES, pad2, STATUS, time, waLink } from '../lib/format'
import { myBill } from '../lib/storage'
import { useTenant } from '../lib/tenant'
import { useLive } from '../lib/useLive'

const MESSAGES = {
  MESA: {
    RECEBIDO: 'Recebemos seu pedido! Já já ele entra em preparo.',
    EM_PREPARO: 'A cozinha está preparando seu pedido.',
    PRONTO: 'Pronto! Já está saindo para a sua mesa.',
    ENTREGUE: 'Servido. Bom apetite! Quando quiser, peça a conta pelo celular.',
  },
  RETIRADA: {
    RECEBIDO: 'Recebemos seu pedido! Avisamos quando estiver pronto.',
    EM_PREPARO: 'A cozinha está preparando seu pedido.',
    PRONTO: 'Pronto para retirada! Passe no balcão e informe o código do pedido.',
    ENTREGUE: 'Pedido retirado. Bom apetite!',
  },
  DELIVERY: {
    RECEBIDO: 'Recebemos seu pedido! Já já ele entra em preparo.',
    EM_PREPARO: 'A cozinha está preparando seu pedido.',
    PRONTO: 'Pronto! Aguardando o entregador.',
    SAIU_ENTREGA: 'Seu pedido saiu para entrega. Fique de olho!',
    ENTREGUE: 'Pedido entregue. Bom apetite!',
  },
}

export default function Track() {
  const { token } = useParams()
  const { slug, info, tapi, to } = useTenant()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  const loaded = useRef(false)

  const refresh = useCallback(() => {
    tapi(`/track/${token}`)
      .then((o) => {
        loaded.current = true
        setOrder(o)
        setOffline(false)
      })
      .catch((e) => {
        // Falha passageira (rede, servidor acordando) não derruba a página: mantém o último status.
        if (loaded.current && e.status !== 404) setOffline(true)
        else setError(e.message)
      })
  }, [token, tapi])

  useEffect(refresh, [refresh])
  useLive(slug, (event, data) => {
    if (event === 'order_created' || event === 'call_created') return
    if (event !== 'order_updated' || data?.id === order?.id) refresh()
  }, 15000)

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted">{error}</p>
        <Link to={to()} className="btn-lime">
          Voltar ao cardápio
        </Link>
      </div>
    )
  }
  if (!order) return <Spinner />

  const steps = FLOWS[order.type] || FLOWS.MESA
  const current = steps.findIndex(([s]) => s === order.status)
  const cancelled = order.status === 'CANCELADO'
  const finished = order.status === 'ENTREGUE'
  const bill = order.type === 'MESA' ? myBill(slug) : null
  const eta = order.estimate ? new Date(new Date(order.createdAt).getTime() + order.estimate * 60000) : null
  const whats = waLink(info.whatsapp, `Olá! Sobre o pedido ${order.code}:`)
  const back = order.table ? to(`/mesa/${order.table.number}`) : to()

  return (
    <div className="min-h-screen">
      <Topbar brand={info} to={to()} compact>
        {bill && (
          <Link to={to(`/conta/${bill.token}`)} className="btn-outline">
            Minha conta
          </Link>
        )}
        <Link to={back} className="btn-outline">
          Pedir mais <span className="ml-1">＋</span>
        </Link>
      </Topbar>
      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="eyebrow text-lime">
          Pedido {order.code} · {order.table ? order.table.label : ORDER_TYPES[order.type].label} · {time(order.createdAt)}
        </p>
        <h1 className="mt-3 font-serif text-4xl">
          {cancelled ? 'Pedido cancelado.' : `${steps[current]?.[1] ?? STATUS[order.status].label}.`}
        </h1>
        <p className="mt-3 text-ink/75">
          {cancelled ? 'Este pedido foi cancelado. Fale com a gente se tiver dúvidas.' : MESSAGES[order.type]?.[order.status]}
        </p>
        {eta && !cancelled && !finished && (
          <p className="mt-2 text-sm text-lime">
            Previsão: {order.type === 'DELIVERY' ? 'chegar' : 'ficar pronto'} por volta das {time(eta.toISOString())}
          </p>
        )}

        {!cancelled && (
          <ol className="mt-8 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Andamento do pedido">
            {steps.map(([s, label], i) => (
              <li key={s} aria-current={i === current ? 'step' : undefined}>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full bg-lime transition-[width] duration-700 ease-out ${
                      i === current && current < steps.length - 1 ? 'animate-pulse' : ''
                    }`}
                    style={{ width: i <= current ? '100%' : '0%' }}
                  />
                </div>
                <p className={`mt-2 text-[11px] font-semibold transition-colors ${i <= current ? 'text-lime' : 'text-muted'}`}>{label}</p>
              </li>
            ))}
          </ol>
        )}

        <section className="mt-8 rounded-2xl border border-line bg-dark p-5">
          <ul className="divide-y divide-line text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2.5">
                <span>
                  {i.quantity}× {i.name}
                  {i.details && <span className="block text-xs text-muted">{i.details}</span>}
                </span>
                <span>{money(i.unitPriceCents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          {order.notes && <p className="mt-3 text-xs text-muted">Obs.: {order.notes}</p>}
          {order.address && <p className="mt-3 text-xs text-muted">Entrega em: {order.address}</p>}
          <dl className="mt-4 space-y-1 border-t border-line pt-4 text-xs text-muted">
            {(order.discountCents > 0 || order.deliveryFeeCents > 0) && (
              <div className="flex justify-between">
                <dt>Produtos</dt>
                <dd>{money(order.subtotalCents)}</dd>
              </div>
            )}
            {order.discountCents > 0 && (
              <div className="flex justify-between text-lime">
                <dt>Cupom {order.couponCode}</dt>
                <dd>− {money(order.discountCents)}</dd>
              </div>
            )}
            {order.deliveryFeeCents > 0 && (
              <div className="flex justify-between">
                <dt>Entrega</dt>
                <dd>{money(order.deliveryFeeCents)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-2 flex justify-between font-display text-xl font-semibold">
            <span>Total</span>
            <span>{money(order.totalCents)}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            {order.type === 'MESA' ? (
              <span className="rounded-lg bg-panel px-3 py-1.5">Na conta da mesa</span>
            ) : (
              <>
                <span className="rounded-lg bg-panel px-3 py-1.5">
                  Pagamento: {order.paymentMethod}
                  {order.changeForCents > 0 && ` · troco para ${money(order.changeForCents)}`}
                </span>
                <span className={`rounded-lg px-3 py-1.5 ${order.paid ? 'bg-emerald-300/[0.08] text-emerald-200 ring-1 ring-inset ring-emerald-300/25' : 'bg-amber-200/[0.06] text-amber-100 ring-1 ring-inset ring-amber-200/25'}`}>
                  {order.paid ? 'Pago' : 'Pagamento pendente'}
                </span>
              </>
            )}
          </div>
        </section>

        {!cancelled && !order.paid && order.pixCode && <PixBox code={order.pixCode} total={order.totalCents} />}
        {!cancelled && bill && (
          <Link to={to(`/conta/${bill.token}`)} className="mt-6 block rounded-2xl border border-lime/40 bg-dark p-5 text-sm">
            <strong className="block font-serif text-lg">Pagar a conta da mesa</strong>
            <span className="mt-1 block text-ink/75">Abra sua conta para pagar com Pix (QR e copia e cola) ou pague em dinheiro no balcão. →</span>
          </Link>
        )}
        {!cancelled && !order.paid && order.paymentKind === 'CASH' && (
          <p className="mt-6 rounded-2xl border border-lime/40 bg-dark p-5 text-sm">
            <strong className="block font-serif text-lg">Pagamento em dinheiro</strong>
            <span className="mt-1 block text-ink/75">
              {order.type === 'DELIVERY'
                ? `Pague ${money(order.totalCents)} ao entregador, na entrega.`
                : `Pague ${money(order.totalCents)} no balcão ao retirar o pedido. Informe o código ${order.code}.`}
            </span>
          </p>
        )}

        {finished && <ReviewBox order={order} token={token} tapi={tapi} onDone={refresh} />}

        {whats && (
          <a href={whats} target="_blank" rel="noreferrer" className="btn-outline mt-6 block text-center">
            Falar com o restaurante no WhatsApp
          </a>
        )}

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] text-muted" aria-live="polite">
          <i className={`size-[6px] rounded-full ${offline ? 'bg-amber-400' : 'animate-pulse bg-lime'}`} />
          {offline
            ? 'Sem conexão no momento — tentando de novo…'
            : `Esta página atualiza sozinha.${order.table ? ` Mesa ${pad2(order.table.number)}.` : ''}`}
        </p>
      </main>
    </div>
  )
}

/** Avaliação depois de receber (vai para Gestão → Inteligência). */
function ReviewBox({ order, token, tapi, onDone }) {
  const [toast, showToast] = useToast()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  if (order.review) {
    return (
      <p className="mt-6 rounded-2xl border border-line p-4 text-center text-sm text-muted">
        Sua nota: <span className="text-lime">{'★'.repeat(order.review.rating)}</span> — obrigado pela avaliação!
      </p>
    )
  }

  async function send() {
    setBusy(true)
    try {
      await tapi(`/track/${token}/review`, { method: 'POST', body: { rating, comment } })
      showToast('Obrigado pela avaliação!')
      onDone()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-lime/40 bg-dark p-5">
      <h2 className="font-serif text-lg">Como foi?</h2>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
            onClick={() => setRating(n)}
            className={`text-3xl transition ${n <= rating ? 'text-lime' : 'text-line hover:text-lime/60'}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="input mt-3 resize-none text-sm"
        rows={2}
        maxLength={400}
        placeholder="Conte o que achou (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button className="btn-lime mt-3 w-full py-2.5 text-sm" disabled={!rating || busy} onClick={send}>
        {busy ? 'Enviando…' : 'Enviar avaliação'}
      </button>
      {toast}
    </section>
  )
}
