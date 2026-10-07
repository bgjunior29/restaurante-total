import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { money } from '../lib/format'

/** Pix com o valor certo: QR para ler com outro aparelho e código copia e cola para o próprio celular. */
export default function PixBox({ code, total, title = 'Pague com Pix', note = 'Assim que o restaurante confirmar o recebimento, o pedido aparece como pago aqui.' }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-lime/40 bg-dark p-5">
      <h2 className="font-serif text-lg">
        {title} · {money(total)}
      </h2>
      <p className="mt-1 text-xs text-muted">Copie o código e cole no app do seu banco, em Pix → Copia e cola. O valor já vem preenchido.</p>
      <div className="mx-auto mt-4 w-44 rounded-xl bg-white p-3">
        <QRCodeSVG value={code} size={160} className="h-auto w-full" />
      </div>
      <p className="mt-4 break-all rounded-lg bg-panel px-3 py-2 font-mono text-[10px] leading-relaxed text-ink/80 select-all">{code}</p>
      <button className="btn-lime mt-3 w-full py-2.5 text-sm" onClick={copy}>
        {copied ? 'Código copiado ✓' : 'Copiar código Pix'}
      </button>
      {note && <p className="mt-2 text-center text-[11px] text-muted">{note}</p>}
    </section>
  )
}
