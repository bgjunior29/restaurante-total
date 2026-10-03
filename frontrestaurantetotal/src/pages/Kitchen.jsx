import { useCallback, useEffect, useRef, useState } from 'react'
import { Spinner, useToast } from '../components/ui'
import Icon from '../components/Icon'
import { minutesSince, ORDER_TYPES, STATIONS, time } from '../lib/format'
import { load, save } from '../lib/storage'
import { useTenant } from '../lib/tenant'
import { beep, unlockAudio, useLive } from '../lib/useLive'
import { StaffTopbar, useNow } from './Panel'

/**
 * Tela da cozinha (KDS): fila de pedidos recebidos e em preparo, mais antigos primeiro,
 * filtrada por estação. Pensada para ficar aberta num tablet/TV na cozinha ou no bar.
 */
export default function Kitchen() {
  const { slug, info, tapi } = useTenant()
  const [toast, showToast] = useToast()
  const [station, setStation] = useState(() => load('rt_station', ''))
  const [orders, setOrders] = useState(null)
  const [sound, setSound] = useState(() => load('rt_sound', true))
  const soundRef = useRef(sound)
  const now = useNow(15000)

  useEffect(() => {
    soundRef.current = sound
    save('rt_sound', sound)
  }, [sound])
  useEffect(() => save('rt_station', station), [station])

  const refresh = useCallback(async () => {
    try {
      setOrders(await tapi(`/kitchen${station ? `?station=${station}` : ''}`))
    } catch (e) {
      showToast(e.message, 'error')
    }
  }, [tapi, station, showToast])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    document.title = `Cozinha${orders?.length ? ` (${orders.length})` : ''} · ${info.name}`
  }, [orders, info.name])

  useLive(slug, (event) => {
    if (event === 'order_created' && soundRef.current) beep()
    if (event === 'order_created' || event === 'order_updated' || event === 'session_closed' || event === 'tick' || event === 'reconnected') refresh()
  }, 15000)

  async function advance(o, status) {
    setOrders((list) => list?.map((x) => (x.id === o.id ? { ...x, status } : x)).filter((x) => status !== 'PRONTO' || x.id !== o.id))
    try {
      await tapi(`/orders/${o.id}/status`, { method: 'PATCH', body: { status } })
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      refresh()
    }
  }

  return (
    <div className="min-h-screen" onPointerDown={unlockAudio}>
      <StaffTopbar />
      <main className="mx-auto max-w-[1800px] px-[clamp(16px,3vw,48px)] py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-lime">Tela da cozinha · ao vivo</p>
            <h1 className="mt-2 font-serif text-3xl">
              {orders ? `${orders.length} na fila` : 'Fila de preparo'}
              {station && <span className="text-lime"> · {STATIONS[station]}</span>}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[['', 'Todas'], ...Object.entries(STATIONS)].map(([k, label]) => (
              <button
                key={k || 'all'}
                aria-pressed={station === k}
                onClick={() => setStation(k)}
                className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition ${
                  station === k ? 'border-ink/80 bg-ink text-green' : 'border-line text-ink/75 hover:border-ink/30 hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => {
                unlockAudio()
                setSound((s) => !s)
              }}
              aria-pressed={sound}
              className={`rounded-lg border px-3 py-2 text-sm ${sound ? 'border-lime/40 text-lime' : 'border-line text-muted'}`}
              aria-label={sound ? 'Som ligado' : 'Som desligado'}
            >
              <Icon name={sound ? 'bell' : 'bell-off'} />
            </button>
          </div>
        </div>

        {orders === null ? (
          <Spinner label="Carregando a fila…" />
        ) : orders.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="font-serif text-4xl">Fila vazia.</p>
            <p className="mt-2 text-sm text-muted">Os novos pedidos aparecem aqui sozinhos, com aviso sonoro.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {orders.map((o) => {
              const min = minutesSince(o.createdAt, now)
              const late = min >= info.lateAfterMin
              const warn = !late && min >= info.lateAfterMin * 0.7
              const preparing = o.status === 'EM_PREPARO'
              return (
                <article
                  key={o.id}
                  className={`flex flex-col rounded-2xl border bg-dark p-4 shadow-[0_24px_48px_-24px_rgba(0,0,0,.6)] ${
                    late ? 'border-red-400/70' : warn ? 'border-amber-300/60' : preparing ? 'border-lime/50' : 'border-line'
                  }`}
                >
                  <header className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-serif text-[28px] leading-tight">
                        {o.table ? o.table.label : ORDER_TYPES[o.type].short}
                      </p>
                      <p className="text-xs text-muted">
                        {o.code} · {time(o.createdAt)}
                        {o.customerName && ` · ${o.customerName}`}
                      </p>
                    </div>
                    <span
                      className={`rounded-lg px-3 py-1.5 font-display text-lg font-semibold tabular-nums ${
                        late ? 'bg-red-400/15 text-red-300 ring-1 ring-red-400/40' : warn ? 'bg-amber-300/10 text-amber-200 ring-1 ring-amber-300/40' : 'bg-panel text-ink/80'
                      }`}
                    >
                      {min}′
                    </span>
                  </header>
                  <ul className="mt-3 flex-1 space-y-2">
                    {o.items.map((i) => (
                      <li key={i.id} className="rounded-lg border border-line/70 bg-panel/60 px-3 py-2">
                        <p className="text-lg leading-tight">
                          <strong className="font-semibold text-lime">{i.quantity}×</strong> {i.name}
                        </p>
                        {i.details && <p className="text-sm text-lime/80">↳ {i.details}</p>}
                        {!station && <p className="text-[10px] text-muted uppercase">{STATIONS[i.station]}</p>}
                      </li>
                    ))}
                  </ul>
                  {o.notes && <p className="mt-2 flex gap-2 rounded-lg border border-amber-200/15 bg-amber-200/[0.05] px-3 py-2 text-sm text-amber-100">
                      <Icon name="alert" className="mt-0.5 size-4" /> {o.notes}
                    </p>}
                  <div className="mt-3 grid gap-2">
                    {preparing ? (
                      <button className="btn-lime py-3 text-base" onClick={() => advance(o, 'PRONTO')}>
                        <Icon name="check" className="mr-1.5" /> Pronto
                      </button>
                    ) : (
                      <button className="rounded-lg border border-lime/50 py-3 font-semibold text-lime transition hover:bg-lime/[0.06]" onClick={() => advance(o, 'EM_PREPARO')}>
                        Começar preparo
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
      {toast}
    </div>
  )
}
