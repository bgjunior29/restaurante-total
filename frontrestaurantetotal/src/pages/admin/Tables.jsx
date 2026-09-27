import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useState } from 'react'
import { useTenant } from '../../lib/tenant'

// Endereço publicado do cardápio (Vercel): os QR impressos abrem direto no celular, mesmo gerados no PC local.
const DEFAULT_PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || location.origin

export default function Tables({ toast }) {
  const { tapi, slug } = useTenant()
  const [tables, setTables] = useState([])
  const [baseUrl, setBaseUrl] = useState(DEFAULT_PUBLIC_URL)
  const [number, setNumber] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([tapi('/admin/tables'), tapi('/admin/settings')])
      setTables(t)
      if (s.publicUrl) setBaseUrl(s.publicUrl)
    } catch (e) {
      toast(e.message, 'error')
    }
  }, [toast, tapi])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function add(e) {
    e.preventDefault()
    try {
      await tapi('/admin/tables', { method: 'POST', body: { number: Number(number), label: '', seats: 4, active: true } })
      setNumber('')
      toast('Mesa criada.')
      refresh()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function update(t, patch, msg) {
    try {
      await tapi(`/admin/tables/${t.id}`, { method: 'PUT', body: { ...t, ...patch } })
      if (msg) toast(msg)
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function renewQr(t) {
    if (!confirm(`Gerar um QR novo para ${t.label}? O QR impresso atual para de funcionar e precisa ser trocado.`)) return
    try {
      await tapi(`/admin/tables/${t.id}/new-qr`, { method: 'POST' })
      toast(`QR novo gerado para ${t.label}. Imprima e troque na mesa.`)
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function remove(t) {
    if (!confirm(`Remover ${t.label}? Se já tiver pedidos, ela só será desativada.`)) return
    try {
      await tapi(`/admin/tables/${t.id}`, { method: 'DELETE' })
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  // A chave (k) prova que a pessoa está na mesa: sem ela, ninguém pede digitando outro número.
  const url = (t) => `${baseUrl.replace(/\/$/, '')}/r/${slug}/mesa/${t.number}?k=${encodeURIComponent(t.qrKey)}`
  const nextNumber = Math.max(0, ...tables.map((t) => t.number)) + 1

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-display text-2xl font-semibold">Mesas & QR codes</h2>
          <p className="mt-1 max-w-lg text-sm text-muted">
            Imprima e cole um QR em cada mesa. Os códigos apontam para <strong className="text-ink">{baseUrl}</strong> — ajuste o
            endereço público em Configurações. Cada QR tem uma chave própria: quem escaneia fica preso àquela mesa até a conta
            ser fechada.
          </p>
        </div>
        <div className="grid w-full grid-cols-[1fr_auto] gap-2 sm:flex sm:w-auto">
          <form onSubmit={add} className="flex min-w-0 gap-2">
            <input
              className="input min-w-0 py-2 sm:w-28"
              type="number"
              min={1}
              aria-label="Número da nova mesa"
              placeholder={`Nº ${nextNumber}`}
              required
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            <button className="btn-lime shrink-0 py-2 text-sm">+ Mesa</button>
          </form>
          <button className="btn-outline" onClick={() => window.print()}>
            Imprimir QRs
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 print:grid-cols-3">
        {tables.map((t) => (
          <div
            key={t.id}
            className={`min-w-0 rounded-2xl border border-line bg-dark p-3 text-center sm:p-4 print:break-inside-avoid print:border-black print:bg-white print:text-black ${
              t.active ? '' : 'opacity-40 print:hidden'
            }`}
          >
            <div className="mx-auto w-full max-w-[146px] rounded-xl bg-white p-3">
              <QRCodeSVG value={url(t)} size={120} className="h-auto w-full" />
            </div>
            <input
              key={t.label}
              aria-label={`Nome da mesa ${t.number}`}
              title="Clique para renomear"
              className="mt-3 w-full rounded-lg bg-transparent text-center font-display text-lg font-semibold outline-none hover:bg-panel focus:bg-panel focus:text-lime print:hover:bg-transparent"
              defaultValue={t.label}
              maxLength={40}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              onBlur={(e) => e.target.value.trim() !== t.label && update(t, { label: e.target.value.trim() }, 'Mesa renomeada.')}
            />
            <p className="truncate text-[10px] text-muted print:text-black">{url(t)}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-x-1 gap-y-1 print:hidden">
              <a className="act" href={url(t)} target="_blank" rel="noreferrer">
                Abrir
              </a>
              <button className="act" onClick={() => update(t, { active: !t.active })}>
                {t.active ? 'Desativar' : 'Ativar'}
              </button>
              <button className="act" onClick={() => renewQr(t)} title="Gera um QR novo; o antigo para de funcionar">
                Novo QR
              </button>
              <button className="act act-danger" onClick={() => remove(t)}>
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
