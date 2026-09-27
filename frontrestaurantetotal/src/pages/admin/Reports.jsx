import { useCallback, useEffect, useState } from 'react'
import { useTenant } from '../../lib/tenant'
import { money, ORDER_TYPES, todayISO } from '../../lib/format'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export default function Reports({ toast }) {
  const { tapi } = useTenant()
  const [start, setStart] = useState(daysAgo(6))
  const [end, setEnd] = useState(todayISO())
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await tapi(`/admin/report?start=${start}&end=${end}`))
    } catch (e) {
      toast(e.message, 'error')
    }
  }, [start, end, toast, tapi])

  useEffect(() => {
    load()
  }, [load])

  const maxDay = Math.max(1, ...(data?.byDay || []).map((d) => d.revenueCents))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold">Relatórios</h2>
        <div className="flex w-full flex-col gap-2 text-xs sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid grid-cols-3 gap-2 sm:flex">
            {[
              ['Hoje', 0],
              ['7 dias', 6],
              ['30 dias', 29],
            ].map(([l, n]) => (
              <button
                key={l}
                className="btn-outline py-2"
                onClick={() => {
                  setStart(daysAgo(n))
                  setEnd(todayISO())
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input
              type="date"
              aria-label="De"
              className="input min-w-0 px-3 py-2 [color-scheme:dark]"
              value={start}
              onChange={(e) => e.target.value && setStart(e.target.value)}
            />
            <span className="text-muted">até</span>
            <input
              type="date"
              aria-label="Até"
              className="input min-w-0 px-3 py-2 [color-scheme:dark]"
              value={end}
              onChange={(e) => e.target.value && setEnd(e.target.value)}
            />
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Pedidos', data.orders],
              ['Faturamento', money(data.revenueCents)],
              ['Recebido', money(data.paidCents)],
              ['Ticket médio', money(data.averageTicketCents)],
              ['Taxa de serviço', money(data.serviceCents)],
              ['Taxas de entrega', money(data.deliveryFeesCents)],
              ['Descontos (cupons)', money(data.discountCents)],
              ['Avaliação', data.rating.average != null ? `${data.rating.average.toFixed(1)} ★ (${data.rating.count})` : '—'],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl border border-line bg-dark p-5">
                <p className="text-xs text-muted">{l}</p>
                <p className="mt-3 font-display text-2xl font-bold">{v}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-dark p-5">
              <h3 className="font-display text-lg font-semibold">Faturamento por dia</h3>
              {data.byDay.length === 0 && <p className="mt-4 text-sm text-muted">Sem vendas no período.</p>}
              <ul className="mt-4 space-y-2">
                {data.byDay.map((d) => (
                  <li key={d.day} className="grid grid-cols-[70px_1fr_90px] items-center gap-3 text-xs">
                    <span className="text-muted">{d.day.slice(8, 10)}/{d.day.slice(5, 7)}</span>
                    <div className="h-4 rounded bg-panel">
                      <div className="h-4 rounded bg-lime" style={{ width: `${(d.revenueCents / maxDay) * 100}%` }} />
                    </div>
                    <span className="text-right tabular-nums">{money(d.revenueCents)}</span>
                  </li>
                ))}
              </ul>
              {Object.keys(data.byType).length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 text-xs">
                  {Object.entries(data.byType).map(([k, v]) => (
                    <span key={k} className="rounded-lg bg-panel px-3 py-1.5">
                      {ORDER_TYPES[k]?.icon} {ORDER_TYPES[k]?.short ?? k}: <strong>{v.orders}</strong> · {money(v.revenueCents)}
                    </span>
                  ))}
                </div>
              )}
              {Object.keys(data.byPaymentMethod).length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 text-xs">
                  {Object.entries(data.byPaymentMethod).map(([k, v]) => (
                    <span key={k} className="rounded-lg bg-panel px-3 py-1.5">
                      {k}: <strong>{money(v)}</strong>
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-line bg-dark p-5">
              <h3 className="font-display text-lg font-semibold">Mais vendidos</h3>
              <table className="mt-4 w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 text-right font-medium">Qtd.</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.topItems.map((i) => (
                    <tr key={i.name}>
                      <td className="py-2">{i.name}</td>
                      <td className="py-2 text-right tabular-nums">{i.quantity}</td>
                      <td className="py-2 text-right tabular-nums">{money(i.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
