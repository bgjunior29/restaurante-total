import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useState } from 'react'
import { time } from '../../lib/format'
import { useTenant } from '../../lib/tenant'

const DEFAULT_PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || location.origin

/** Gestão do delivery: link e QR para divulgar e telefones bloqueados (trote, calote). */
export default function DeliveryAdmin({ toast }) {
  const { tapi, slug } = useTenant()
  const [baseUrl, setBaseUrl] = useState(DEFAULT_PUBLIC_URL)
  const [blocked, setBlocked] = useState(null)
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')
  const link = `${baseUrl.replace(/\/$/, '')}/r/${slug}/delivery`

  const refresh = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([tapi('/admin/settings'), tapi('/admin/blocked-phones')])
      if (s.publicUrl) setBaseUrl(s.publicUrl)
      setBlocked(b)
    } catch (e) {
      toast(e.message, 'error')
    }
  }, [tapi, toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function add(e) {
    e.preventDefault()
    try {
      await tapi('/admin/blocked-phones', { method: 'POST', body: { phone, reason } })
      setPhone('')
      setReason('')
      toast('Telefone bloqueado.')
      refresh()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function remove(b) {
    if (!confirm(`Desbloquear ${b.phone}? Ele volta a conseguir pedir pelo site.`)) return
    try {
      await tapi(`/admin/blocked-phones/${b.id}`, { method: 'DELETE' })
      toast('Telefone desbloqueado.')
      refresh()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      toast('Link copiado.')
    } catch {
      prompt('Copie o link do delivery:', link)
    }
  }

  return (
    <div className="grid max-w-5xl gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-line bg-dark p-6">
        <h3 className="font-serif text-lg">Link do delivery</h3>
        <p className="mt-2 text-sm text-muted">
          Divulgue no Instagram, no WhatsApp e no Google. Quem abre esse link vai direto para o delivery, mesmo que já tenha sentado numa mesa antes. O QR
          das mesas continua só para o salão.
        </p>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="w-36 shrink-0 rounded-xl bg-white p-3">
            <QRCodeSVG value={link} size={120} className="h-auto w-full" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="font-mono text-xs break-all text-ink">{link}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button className="btn-lime text-sm" onClick={copy}>
                Copiar link
              </button>
              <a className="btn-outline text-sm" href={link} target="_blank" rel="noreferrer">
                Abrir
              </a>
            </div>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-muted">Taxa, pedido mínimo, tempo e região ficam em Configurações → Retirada e delivery.</p>
      </section>

      <section className="rounded-2xl border border-line bg-dark p-6">
        <h3 className="font-serif text-lg">Proteções do delivery</h3>
        <ul className="mt-3 space-y-2 text-sm text-ink/80">
          <li>• Telefone com DDD válido; números falsos como 99999-9999 são recusados.</li>
          <li>• No máximo 3 pedidos em andamento e 6 por hora no mesmo telefone.</li>
          <li>• Limite de pedidos por aparelho e de 80 itens por pedido.</li>
          <li>• Robôs são barrados por um campo invisível no formulário.</li>
          <li>• A cozinha não vê telefone nem endereço, e só marca preparo e pronto.</li>
          <li>• Telefone bloqueado não pede delivery nem retirada pelo site.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-dark p-6 lg:col-span-2">
        <h3 className="font-serif text-lg">Telefones bloqueados</h3>
        <p className="mt-2 text-sm text-muted">Trote ou calote? Bloqueie pela comanda (Delivery → Bloquear telefone) ou digite aqui.</p>
        <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
          <input className="input" type="tel" inputMode="tel" required placeholder="(11) 98888-7777" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input" placeholder="Motivo (opcional)" maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn-lime text-sm">Bloquear</button>
        </form>
        {blocked === null ? null : blocked.length === 0 ? (
          <p className="mt-5 text-sm text-muted">Nenhum telefone bloqueado.</p>
        ) : (
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {blocked.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <strong className="font-semibold tabular-nums">{b.phone}</strong>
                  <span className="block text-xs text-muted">
                    {b.reason || 'Sem motivo'} · {b.createdBy || 'equipe'} · {new Date(b.createdAt).toLocaleDateString('pt-BR')} {time(b.createdAt)}
                  </span>
                </span>
                <button className="text-xs text-muted underline hover:text-ink" onClick={() => remove(b)}>
                  Desbloquear
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
