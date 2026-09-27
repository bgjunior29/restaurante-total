import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

/** Iniciais para o selo redondo quando o restaurante não tem logo: "Cantina da Nonna" → "CN". */
const initials = (name) =>
  name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÀ-Ú]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || name.slice(0, 2).toUpperCase()

/** `compact`: no celular mostra só o selo (quando o topo precisa de espaço para botões). */
export function Brand({ brand, to = '/', compact = false }) {
  const name = brand?.name ?? 'Restaurante Total'
  const tagline = brand?.tagline ?? 'Salão · Cozinha · Delivery'
  const [logoFailed, setLogoFailed] = useState(false)
  const mark = initials(name)
  return (
    <Link to={to} className="flex min-w-0 items-center gap-3">
      {brand?.logoUrl && !logoFailed ? (
        <img
          src={brand.logoUrl}
          alt=""
          onError={() => setLogoFailed(true)}
          className="size-[46px] shrink-0 rounded-full border border-lime object-cover"
        />
      ) : (
        <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full border border-lime font-display text-lg font-bold tracking-[-2px] text-lime">
          {mark[0]}
          <span className="text-ink">{mark.slice(1)}</span>
        </span>
      )}
      <span
        className={`min-w-0 font-display text-base leading-none font-extrabold tracking-[0.06em] uppercase sm:text-lg sm:tracking-[0.11em] ${
          compact ? 'hidden sm:block' : ''
        }`}
      >
        <span className="block truncate">{name}</span>
        {tagline && (
          <small className="mt-[7px] block truncate font-sans text-[8px] font-semibold tracking-[0.19em] text-muted">
            {tagline}
          </small>
        )}
      </span>
    </Link>
  )
}

export function Topbar({ brand, to, compact = false, children }) {
  return (
    <header className="relative z-10 flex h-[72px] items-center justify-between gap-3 border-b border-line/70 bg-green px-[clamp(16px,5.7vw,96px)] sm:h-[86px]">
      <Brand brand={brand} to={to} compact={compact} />
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">{children}</div>
    </header>
  )
}

export function Footer({ name = 'Restaurante Total' }) {
  return (
    <footer className="flex flex-wrap justify-between gap-2 bg-green px-[clamp(16px,5.7vw,96px)] py-7 text-[11px] tracking-[0.08em] text-muted">
      <span className="uppercase">
        {name} <span className="mx-2 text-lime">✳</span> Feito para boas refeições
      </span>
      <span>© {new Date().getFullYear()}</span>
    </footer>
  )
}

/** Hook de toast simples: const [toast, show] = useToast() */
export function useToast() {
  const [msg, setMsg] = useState(null)
  const show = useCallback((text, tone = 'ok') => setMsg({ text, tone, id: Date.now() }), [])
  useEffect(() => {
    if (!msg) return
    // Erros ficam mais tempo na tela: dá tempo de ler.
    const t = setTimeout(() => setMsg(null), msg.tone === 'error' ? 4500 : 2600)
    return () => clearTimeout(t)
  }, [msg])
  const node = msg ? (
    <div
      key={msg.id}
      role={msg.tone === 'error' ? 'alert' : 'status'}
      className={`fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-50 w-max max-w-[calc(100vw-32px)] rounded-2xl px-5 py-3 text-center text-sm font-semibold shadow-xl animate-[pop-in_.2s_ease-out] ${
        msg.tone === 'error' ? 'bg-red-200 text-red-950' : 'bg-lime text-dark'
      }`}
      style={{ transform: 'translateX(-50%)' }}
    >
      {msg.text}
    </div>
  ) : null
  return [node, show]
}

export function Stepper({ value, onChange, min = 0, max = 50, light = false, label = '' }) {
  const base = light
    ? 'border-[#c9ccb6] bg-card text-dark hover:border-olive'
    : 'border-line bg-green2 text-ink hover:border-lime'
  const suffix = label ? ` ${label}` : ''
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label ? `Quantidade de ${label}` : 'Quantidade'}>
      <button
        type="button"
        aria-label={`Diminuir${suffix}`}
        className={`flex size-9 items-center justify-center rounded-full border text-base transition active:scale-90 ${base}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Aumentar${suffix}`}
        className={`flex size-9 items-center justify-center rounded-full border text-base transition active:scale-90 ${base}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}

export function Spinner({ label = 'Carregando…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-lime border-t-transparent" />
      {label}
    </div>
  )
}
