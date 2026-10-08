import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Spinner, Stepper, Topbar, useToast } from '../components/ui'
import Icon from '../components/Icon'
import PixBox from '../components/PixBox'
import { money, STATUS, time } from '../lib/format'
import { forgetBill, myTable } from '../lib/storage'
import { useTenant } from '../lib/tenant'
import { useLive } from '../lib/useLive'

/** Conta da mesa vista pelo cliente: rodadas, taxa de serviço, divisão e "pedir a conta". */
export default function Bill() {
  const { token } = useParams()
  const { slug, info, tapi, to } = useTenant()
  const [toast, showToast] = useToast()
  const [bill, setBill] = useState(null)
  const [error, setError] = useState('')
  const [people, setPeople] = useState(1)
  const [withService, setWithService] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pix, setPix] = useState(null) // { amountCents, code } do valor escolhido (serviço e divisão)

  const refresh = useCallback(() => {
    tapi(`/bill/${token}`)
      .then((b) => {
        setBill(b)
        setError('')
        if (b.status === 'CLOSED') forgetBill(slug)
      })
      .catch((e) => setError(e.message))
  }, [tapi, token, slug])

  useEffect(refresh, [refresh])
  useLive(slug, (event) => event !== 'order_created' && event !== 'call_created' && refresh(), 20000)

  // O código Pix acompanha o total da tela: com/sem serviço e a parte de cada um na divisão.
  const pixOn = Boolean(bill?.pixEnabled) && bill?.status !== 'CLOSED' && bill?.subtotalCents > 0
  useEffect(() => {
    if (!pixOn) return
    let alive = true
    tapi(`/bill/${token}/pix?service=${withService}&people=${people}`)
      .then((p) => alive && setPix(p))
      .catch(() => alive && setPix(null))
    return () => {
      alive = false
    }
  }, [pixOn, tapi, token, withService, people, bill?.subtotalCents])

  async function requestBill() {
    setBusy(true)
    try {
      setBill(await tapi(`/bill/${token}/request`, { method: 'POST' }))
      showToast('Pedimos a conta! O garçom já vem até a sua mesa.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function callWaiter() {
    try {
      await tapi('/calls', { method: 'POST', body: { tableNumber: bill.table.number, tableKey: myTable(slug)?.key ?? '', kind: 'GARCOM' } })
      showToast('Garçom chamado!')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

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
  if (!bill) return <Spinner label="Abrindo a conta…" />

  const closed = bill.status === 'CLOSED'
  const service = closed ? bill.serviceCents : withService ? bill.serviceCents : 0
  const total = bill.subtotalCents + service
  const split = closed ? bill.people : people
  const perPerson = Math.ceil(total / split)
  const cancelled = bill.orders.filter((o) => o.status === 'CANCELADO').length

  return (
    <div className="min-h-screen">
      <Topbar brand={info} to={to()} compact>
        {!closed && (
          <Link to={to(`/mesa/${bill.table.number}`)} className="btn-outline">
            Pedir mais <span className="ml-1">＋</span>
          </Link>
        )}
      </Topbar>
      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="eyebrow text-lime">
          Conta · {bill.table.label} · aberta às {time(bill.openedAt)}
        </p>
        <h1 className="mt-3 font-serif text-4xl">
          {closed ? 'Conta fechada. Obrigado!' : bill.status === 'BILL_REQUESTED' ? 'Conta pedida.' : 'Sua conta.'}
        </h1>
        <p className="mt-3 text-ink/75">
          {closed
            ? `Pago com ${bill.paymentMethod}. Volte sempre.`
            : bill.status === 'BILL_REQUESTED'
              ? `O garçom já foi avisado. Pague ${bill.pixEnabled ? 'com o Pix abaixo ou ' : ''}em dinheiro no balcão.`
              : `Todas as rodadas da mesa ficam aqui. Quando terminar, pague ${bill.pixEnabled ? 'com o Pix abaixo ou ' : ''}em dinheiro no balcão.`}
        </p>

        <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted">
          {bill.orders.length} pedido{bill.orders.length === 1 ? '' : 's'} nesta conta
          {cancelled > 0 && ` · ${cancelled} cancelado${cancelled > 1 ? 's' : ''}`}
        </p>
        <section className="mt-3 space-y-3">
          {bill.orders.map((o) => (
            <div key={o.id} className={`rounded-2xl border border-line bg-dark p-4 ${o.status === 'CANCELADO' ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">
                  {o.code} · {time(o.createdAt)}
                  {o.customerName && ` · ${o.customerName}`}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 font-semibold ${STATUS[o.status].badge}`}>{STATUS[o.status].label}</span>
              </div>
              <ul className="mt-2 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3 py-1">
                    <span>
                      {i.quantity}× {i.name}
                      {i.details && <span className="block text-xs text-muted">{i.details}</span>}
                    </span>
                    <span className="tabular-nums">{money(i.unitPriceCents * i.quantity)}</span>
                  </li>
                ))}
                {o.discountCents > 0 && (
                  <li className="flex justify-between py-1 text-xs text-lime">
                    <span>Cupom {o.couponCode}</span>
                    <span>− {money(o.discountCents)}</span>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl bg-cream p-5 text-dark">
          <div className="flex justify-between text-sm">
            <span>Consumo</span>
            <strong>{money(bill.subtotalCents)}</strong>
          </div>
          {bill.servicePct > 0 && (
            <label className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                {!closed && <input type="checkbox" className="accent-[#8a6d3b]" checked={withService} onChange={(e) => setWithService(e.target.checked)} />}
                Serviço ({bill.servicePct}%{!closed && ', opcional'})
              </span>
              <strong>{money(service)}</strong>
            </label>
          )}
          <div className="mt-3 flex justify-between border-t border-[#d7d5c4] pt-3 font-display text-2xl font-bold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-sage px-4 py-3">
            <span className="text-sm">
              Dividir por
              {closed ? <strong> {split}</strong> : null}
            </span>
            {!closed && <Stepper light min={1} label="pessoas" value={people} onChange={setPeople} />}
            <strong className="font-display text-lg">{money(perPerson)} / pessoa</strong>
          </div>
        </section>

        {pixOn && pix && (
          <PixBox
            code={pix.code}
            total={pix.amountCents}
            title={people > 1 ? 'Sua parte no Pix' : 'Pague com Pix'}
            note="Depois de pagar, mostre o comprovante ao garçom ou no balcão para fechar a conta."
          />
        )}
        {!closed && (
          <p className="mt-4 rounded-2xl border border-line p-4 text-center text-sm text-ink/75">
            <Icon name="receipt" className="mr-1.5 size-[1.1em] text-lime" />
            Prefere dinheiro? Pague no <strong className="text-ink">balcão</strong>.
          </p>
        )}

        {!closed && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button className="btn-outline inline-flex items-center justify-center gap-2 py-3" onClick={callWaiter}>
              <Icon name="hand" /> Chamar garçom
            </button>
            <button className="btn-lime" disabled={busy || bill.status === 'BILL_REQUESTED'} onClick={requestBill}>
              {bill.status === 'BILL_REQUESTED' ? 'Conta já pedida' : 'Pedir a conta'}
            </button>
          </div>
        )}
        {!closed && bill.pendingOrders > 0 && (
          <p className="mt-3 text-center text-xs text-muted">
            {bill.pendingOrders} pedido{bill.pendingOrders > 1 ? 's' : ''} ainda em preparo.
          </p>
        )}
      </main>
      {toast}
    </div>
  )
}
