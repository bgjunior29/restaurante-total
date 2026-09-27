import { useCallback, useEffect, useRef, useState } from 'react'
import { Spinner, useToast } from '../components/ui'
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
            <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.05em]">
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
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  station === k ? 'border-lime bg-lime text-dark' : 'border-line hover:border-lime'
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
              className={`rounded-full border px-3 py-2 text-xs font-semibold ${sound ? 'border-lime text-lime' : 'border-line text-muted'}`}
            >
              {sound ? '🔔' : '🔕'}
            </button>
          </div>
        </div>

        {orders === null ? (
          <Spinner label="Carregando a fila…" />
        ) : orders.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="font-display text-3xl font-bold">Fila vazia. 👩‍🍳</p>
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
                  className={`flex flex-col rounded-[20px] border-2 bg-dark p-4 ${
                    late ? 'border-red-400' : warn ? 'border-amber-400' : preparing ? 'border-lime/60' : 'border-line'
                  }`}
                >
                  <header className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-2xl font-bold">
                        {o.table ? o.table.label : `${ORDER_TYPES[o.type].icon} ${ORDER_TYPES[o.type].short}`}
                      </p>
                      <p className="text-xs text-muted">
                        {o.code} · {time(o.createdAt)}
                        {o.customerName && ` · ${o.customerName}`}
                      </p>
                    </div>
                    <span
                      className={`rounded-xl px-3 py-1.5 font-display text-lg font-bold tabular-nums ${
                        late ? 'bg-red-400 text-dark' : warn ? 'bg-amber-400 text-dark' : 'bg-panel'
                      }`}
                    >
                      {min}′
                    </span>
                  </header>
                  <ul className="mt-3 flex-1 space-y-2">
                    {o.items.map((i) => (
                      <li key={i.id} className="rounded-xl bg-panel px-3 py-2">
                        <p className="text-lg leading-tight">
                          <strong className="text-lime">{i.quantity}×</strong> {i.name}
                        </p>
                        {i.details && <p className="text-sm text-[#f4e3a6]">↳ {i.details}</p>}
                        {!station && <p className="text-[10px] text-muted uppercase">{STATIONS[i.station]}</p>}
                      </li>
                    ))}
                  </ul>
                  {o.notes && <p className="mt-2 rounded-lg bg-[#3a3520] px-3 py-2 text-sm text-[#f4e3a6]">⚠ {o.notes}</p>}
                  <div className="mt-3 grid gap-2">
                    {preparing ? (
                      <button className="btn-lime py-3 text-base" onClick={() => advance(o, 'PRONTO')}>
                        ✓ Pronto
                      </button>
                    ) : (
                      <button className="rounded-xl border border-lime py-3 font-display font-semibold text-lime" onClick={() => advance(o, 'EM_PREPARO')}>
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
