import { useRef, useState } from 'react'

const MAX_SIDE = 1000 // px: nítido no celular e leve no 4G
const QUALITY = 0.82

/** Reduz a foto no próprio navegador e devolve um data URL JPEG (~100 KB em vez de vários MB da câmera). */
async function shrinkImage(file, maxSide = MAX_SIDE) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não foi possível abrir essa imagem. Tente uma foto JPG ou PNG.')
  })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // PNG transparente vira fundo branco no JPEG, e não preto
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', QUALITY)
}

/**
 * Campo de foto: botão para enviar (câmera ou galeria no celular) com prévia, e um link como alternativa.
 * `upload(dataUrl)` envia para a API e devolve `{ url }`. Sem `upload`, mostra só o campo de link.
 */
export default function ImageField({ label, value, onChange, upload, maxSide, hint, placeholder = 'https://…/foto.jpg' }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showLink, setShowLink] = useState(Boolean(value) && !value.startsWith('/api/img/'))

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { url } = await upload(await shrinkImage(file, maxSide))
      onChange(url)
    } catch (err) {
      setError(err.message || 'Não foi possível enviar a foto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <img src={value} alt="" className="size-14 shrink-0 rounded-xl border border-line object-cover" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-line text-[11px] text-muted" aria-hidden>
            Foto
          </span>
        )}
        {upload && (
          <>
            <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
            <button type="button" className="btn-outline text-sm" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? 'Enviando…' : value ? 'Trocar foto' : 'Enviar foto'}
            </button>
          </>
        )}
        {value && (
          <button type="button" className="text-xs text-muted underline" onClick={() => onChange('')}>
            Remover
          </button>
        )}
        {upload && !showLink && (
          <button type="button" className="text-xs text-muted underline" onClick={() => setShowLink(true)}>
            Usar um link
          </button>
        )}
      </div>
      {(showLink || !upload) && (
        <input
          className="input mt-2"
          inputMode="url"
          maxLength={500}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}
