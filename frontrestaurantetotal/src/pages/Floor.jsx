import { useCallback, useEffect, useState } from 'react'
import { Spinner, Stepper, useToast } from '../components/ui'
import Icon from '../components/Icon'
import { CALL_KINDS, minutesSince, money, STATUS, time } from '../lib/format'
import { useTenant } from '../lib/tenant'
import { beep, unlockAudio, useLive } from '../lib/useLive'
import { StaffTopbar, useNow } from './Panel'

/** Salão: mapa das mesas com a conta aberta, chamados e fechamento de conta (serviço + divisão). */
export default function Floor() {
  const { slug, info, tapi } = useTenant()
  const [toast, showToast] = useToast()
  const [tables, setTables] = useState(null)
  const [methods, setMethods] = useState([])
  const [open, setOpen] = useState(null) // id da mesa com a conta aberta no painel lateral
  const now = useNow()

  const refresh = useCallback(async () => {
    try {
      setTables(await tapi('/floor'))
    } catch (e) {
      showToast(e.message, 'error')
    }
  }, [tapi, showToast])

  useEffect(() => {
    refresh()
    tapi('/payment-methods').then(setMethods).catch(() => {})
  }, [refresh, tapi])

  useEffect(() => {
    document.title = `Salão · ${info.name}`
  }, [info.name])

  useLive(slug, (event) => {
    if (event === 'call_created') beep()
    refresh()
  })

  if (!tables) {
    return (
      <div className="min-h-screen">
        <StaffTopbar />
        <Spinner label="Montando o salão…" />
      </div>
    )
  }

  const busy = tables.filter((t) => t.bill)
  const total = busy.reduce((s, t) => s + t.bill.subtotalCents, 0)
  const selected = tables.find((t) => t.id === open)

  return (
    <div className="min-h-screen" onPointerDown={unlockAudio}>
      <StaffTopbar />
      <main className="mx-auto max-w-[1500px] px-[clamp(16px,5.7vw,96px)] py-8 md:py-12">
        <p className="eyebrow text-lime">Salão · ao vivo</p>
        <h1 className="mt-3 font-serif text-[clamp(32px,4vw,48px)]">
          {busy.length} de {tables.length} mesas ocupadas.
        </h1>
        <p className="mt-2 text-sm text-ink/75">
          Em aberto no salão: <strong className="text-lime">{money(total)}</strong>. Toque numa mesa para ver a conta e fechar.
        </p>

        <div className="mt-6 flex flex-wrap gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-2">
            <i className="size-3 rounded bg-panel" /> Livre
          </span>
          <span className="flex items-center gap-2">
            <i className="size-3 rounded bg-lime" /> Ocupada
          </span>
          <span className="flex items-center gap-2">
            <i className="size-3 rounded bg-red-400" /> Pediu a conta / chamou
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tables.map((t) => {
            const alert = t.calls.length > 0 || t.bill?.status === 'BILL_REQUESTED'
            const Tag = t.bill ? 'button' : 'div' // mesa livre não abre nada
            return (
              <Tag
                key={t.id}
                {...(t.bill ? { onClick: () => setOpen(t.id), 'aria-label': `${t.label}: abrir conta` } : {})}
                className={`relative flex min-h-[132px] flex-col rounded-2xl border-2 p-4 text-left transition ${
                  alert
                    ? 'border-red-400 bg-red-400/10'
                    : t.bill
                      ? 'border-lime bg-lime/10 hover:bg-lime/20'
                      : 'border-line bg-dark'
                }`}
              >
                <span className="font-display text-2xl font-bold">{t.label}</span>
                <span className="text-[11px] text-muted">{t.seats} lugares</span>
                {t.bill ? (
                  <span className="mt-auto">
                    <strong className="block font-display text-xl">{money(t.bill.subtotalCents)}</strong>
                    <span className="text-[11px] text-muted">
                      {t.bill.orders.length} pedido{t.bill.orders.length > 1 ? 's' : ''} · há {minutesSince(t.bill.openedAt, now)} min
                    </span>
                  </span>
                ) : (
                  <span className="mt-auto text-xs text-muted">Livre</span>
                )}
                {(t.calls.length > 0 || t.bill?.status === 'BILL_REQUESTED') && (
                  <span className="absolute top-3 right-3 flex gap-1 text-lime" title={t.calls.map((k) => CALL_KINDS[k].label).join(', ')}>
                    {[...new Set([...(t.bill?.status === 'BILL_REQUESTED' ? ['CONTA'] : []), ...t.calls])].map((k) => (
                      <Icon key={k} name={CALL_KINDS[k].icon} className="size-4" />
                    ))}
                  </span>
                )}
              </Tag>
            )
          })}
        </div>
      </main>

      {selected?.bill && (
        <CloseDrawer
          table={selected}
          methods={methods}
          tapi={tapi}
          onClose={() => setOpen(null)}
          onDone={(msg) => {
            setOpen(null)
            showToast(msg)
            refresh()
          }}
          showToast={showToast}
        />
      )}
      {toast}
    </div>
  )
}

function CloseDrawer({ table, methods, tapi, onClose, onDone, showToast }) {
  const bill = table.bill
  const [withService, setWithService] = useState(true)
  const [people, setPeople] = useState(bill.people || 1)
  const [methodId, setMethodId] = useState(methods[0]?.id ?? null)
  const [busy, setBusy] = useState(false)
  const service = withService ? bill.serviceCents : 0
  const total = bill.subtotalCents + service
  const perPerson = Math.ceil(total / people)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function close() {
    if (bill.pendingOrders > 0 && !confirm(`Há ${bill.pendingOrders} pedido(s) ainda em preparo. Fechar a conta assim mesmo?`)) return
    setBusy(true)
    try {
      await tapi(`/sessions/${bill.id}/close`, {
        method: 'POST',
        body: { paymentMethodId: methodId, includeService: withService, people },
      })
      onDone(`Conta da ${table.label} fechada: ${money(total)}.`)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Fechar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Conta da ${table.label}`}
        className="relative flex h-full w-full max-w-[460px] animate-[slide-in_.25s_ease-out] flex-col overflow-y-auto bg-dark p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow text-lime">Conta · aberta às {time(bill.openedAt)}</p>
            <h2 className="mt-1 font-serif text-3xl">{table.label}</h2>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="flex size-9 items-center justify-center rounded-full border border-line">
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {bill.orders.map((o) => (
            <div key={o.id} className={`rounded-2xl border border-line p-3 text-sm ${o.status === 'CANCELADO' ? 'opacity-40' : ''}`}>
              <div className="flex justify-between text-xs text-muted">
                <span>
                  {o.code} · {time(o.createdAt)}
                </span>
                <span className={`rounded-full px-2 py-0.5 ${STATUS[o.status].badge}`}>{STATUS[o.status].label}</span>
              </div>
              {o.items.map((i) => (
                <div key={i.id} className="mt-1 flex justify-between gap-3">
                  <span>
                    {i.quantity}× {i.name}
                  </span>
                  <span className="tabular-nums">{money(i.unitPriceCents * i.quantity)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3 rounded-2xl bg-panel p-4 text-sm">
          <div className="flex justify-between">
            <span>Consumo</span>
            <strong>{money(bill.subtotalCents)}</strong>
          </div>
          {bill.servicePct > 0 && (
            <label className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <input type="checkbox" className="accent-lime" checked={withService} onChange={(e) => setWithService(e.target.checked)} />
                Serviço ({bill.servicePct}%)
              </span>
              <strong>{money(service)}</strong>
            </label>
          )}
          <div className="flex justify-between border-t border-line pt-3 font-display text-2xl font-bold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Dividir por</span>
            <Stepper min={1} label="pessoas" value={people} onChange={setPeople} />
            <strong className="text-lime">{money(perPerson)} cada</strong>
          </div>
        </div>

        <p className="mt-5 text-xs font-semibold">Forma de pagamento</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              aria-pressed={methodId === m.id}
              onClick={() => setMethodId(m.id)}
              className={`rounded-xl border px-3 py-3 text-xs font-semibold ${methodId === m.id ? 'border-lime text-lime' : 'border-line text-ink/75 hover:border-ink/30 hover:text-ink'}`}
            >
              {m.name}
            </button>
          ))}
        </div>

        <button className="btn-lime mt-6" disabled={busy || !methodId} onClick={close}>
          {busy ? 'Fechando…' : `Fechar conta · ${money(total)}`}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted">A mesa fica livre e os chamados dela são encerrados.</p>
      </div>
    </div>
  )
}
