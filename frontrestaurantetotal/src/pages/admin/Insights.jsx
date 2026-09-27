import { useCallback, useEffect, useState } from 'react'
import { Spinner } from '../../components/ui'
import { money, ORDER_TYPES } from '../../lib/format'
import { useTenant } from '../../lib/tenant'

function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-line bg-dark p-5 ${className}`}>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-dark p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

/** Barras verticais simples (sem biblioteca): pedidos por hora ou por dia da semana. */
function Bars({ data, labelOf, valueOf, highlight }) {
  const max = Math.max(1, ...data.map(valueOf))
  return (
    <div className="flex h-40 items-end gap-1">
      {data.map((d, i) => {
        const v = valueOf(d)
        return (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${labelOf(d)}: ${v}`}>
            <div
              className={`w-full rounded-t ${highlight?.(d) ? 'bg-lime' : 'bg-lime/40'}`}
              style={{ height: `${(v / max) * 100}%`, minHeight: v ? 3 : 0 }}
            />
            <span className="text-[9px] text-muted">{labelOf(d)}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Inteligência operacional (evolução da camada Python do sistema integrado): previsão do dia,
 * pico de horário, tempo de preparo, combos, produtos parados, estoque e avaliações.
 */
export default function Insights({ toast }) {
  const { tapi } = useTenant()
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await tapi(`/admin/insights?days=${days}`))
    } catch (e) {
      toast(e.message, 'error')
    }
  }, [tapi, days, toast])

  useEffect(() => {
    load()
  }, [load])

  if (!data) return <Spinner label="Analisando os pedidos…" />
  const f = data.forecast
  const peakHour = data.byHour.reduce((a, b) => (b.orders > a.orders ? b : a), data.byHour[0])
  const busyHours = data.byHour.filter((h) => h.hour >= 10 || h.orders > 0)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Inteligência</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">Calculado a partir dos seus pedidos reais. Quanto mais pedidos, mais precisas as previsões.</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} aria-pressed={days === d} onClick={() => setDays(d)} className={`btn-outline py-2 ${days === d ? 'border-lime text-lime' : ''}`}>
              {d} dias
            </button>
          ))}
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-lime/50 bg-lime/10 p-5">
        <p className="eyebrow text-lime">✳ Recomendações</p>
        <ul className="mt-3 space-y-2 text-sm">
          {data.tips.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-lime">→</span>
              {t}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={`Previsão para hoje (${f.weekday})`}
          value={f.expectedOrders != null ? `${f.expectedOrders} pedido${f.expectedOrders === 1 ? '' : 's'}` : '—'}
          hint={f.expectedRevenueCents != null ? `≈ ${money(f.expectedRevenueCents)} · base: ${f.basedOnDays} ${f.weekday.toLowerCase()}(s)` : 'Sem histórico desse dia ainda'}
        />
        <Stat label="Horário de pico" value={peakHour.orders ? `${peakHour.hour}h` : '—'} hint={peakHour.orders ? `${peakHour.orders} pedido${peakHour.orders === 1 ? '' : 's'} no período` : ''} />
        <Stat
          label="Tempo médio de preparo"
          value={data.prep.avgMinutes != null ? `${data.prep.avgMinutes} min` : '—'}
          hint={data.prep.measured ? `${data.prep.lateCount} de ${data.prep.measured} passaram de ${data.prep.lateAfterMin} min` : 'Use "Marcar pronto" para medir'}
        />
        <Stat
          label="Avaliação média"
          value={data.rating.average != null ? `${data.rating.average.toFixed(1)} ★` : '—'}
          hint={`${data.rating.count} avaliação(ões)`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Pedidos por hora">
          <Bars data={busyHours} labelOf={(d) => d.hour} valueOf={(d) => d.orders} highlight={(d) => d.hour === peakHour.hour} />
        </Card>
        <Card title="Média de pedidos por dia da semana">
          <Bars data={data.byWeekday} labelOf={(d) => d.weekday.slice(0, 3)} valueOf={(d) => d.avgOrders} highlight={(d) => d.weekday === f.weekday} />
        </Card>

        <Card title="Mais vendidos">
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-muted">Sem vendas no período.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {data.topProducts.map((p) => (
                <li key={p.name} className="flex justify-between py-2">
                  <span>{p.name}</span>
                  <span className="tabular-nums text-muted">
                    {p.quantity}× · <strong className="text-ink">{money(p.revenueCents)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Combos que vendem juntos">
          {data.pairs.length === 0 ? (
            <p className="text-sm text-muted">Ainda não há pares frequentes. Eles aparecem com mais pedidos.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.pairs.map((p) => (
                <li key={`${p.a}-${p.b}`} className="rounded-xl bg-panel px-3 py-2">
                  {p.a} <span className="text-lime">+</span> {p.b}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted">O cardápio já sugere esses itens ao cliente ("Combina com seu pedido").</p>
        </Card>

        <Card title="Estoque baixo">
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-muted">Nada em alerta. 👌</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <span>{p.name}</span>
                  <strong className={p.stockQty === 0 ? 'text-red-300' : 'text-amber-300'}>{p.stockQty === 0 ? 'Esgotado' : `${p.stockQty} restantes`}</strong>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Sem vendas no período">
          {data.slowProducts.length === 0 ? (
            <p className="text-sm text-muted">Todos os produtos venderam. 🎉</p>
          ) : (
            <div className="flex flex-wrap gap-2 text-xs">
              {data.slowProducts.map((n) => (
                <span key={n} className="rounded-full bg-panel px-3 py-1.5">
                  {n}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card title="Pedidos por canal">
          <ul className="space-y-2 text-sm">
            {Object.entries(ORDER_TYPES).map(([k, t]) => {
              const n = data.byType[k] || 0
              return (
                <li key={k} className="grid grid-cols-[110px_1fr_40px] items-center gap-3">
                  <span>
                    {t.icon} {t.short}
                  </span>
                  <div className="h-3 rounded bg-panel">
                    <div className="h-3 rounded bg-lime" style={{ width: `${data.orders ? (n / data.orders) * 100 : 0}%` }} />
                  </div>
                  <span className="text-right tabular-nums">{n}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[11px] text-muted">
            {data.cancelled} cancelado(s) · ticket médio {money(data.averageTicketCents)}
          </p>
        </Card>

        <Card title="Últimas avaliações">
          {data.reviews.length === 0 ? (
            <p className="text-sm text-muted">Os clientes avaliam pelo link de acompanhamento depois de receber.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {data.reviews.map((r) => (
                <li key={`${r.code}-${r.createdAt}`}>
                  <span className="text-lime">{'★'.repeat(r.rating)}</span>
                  <span className="ml-2 text-xs text-muted">{r.code}</span>
                  {r.comment && <p className="text-ink/80">“{r.comment}”</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
