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

/** Marca do Restaurante Total: cloche (tampa de prato) em traço fino, nas cores do tema (a mesma do favicon). */
export function LogoMark({ className = 'size-10' }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={`shrink-0 ${className}`}>
      <circle cx="24" cy="24" r="23" fill="var(--color-dark)" stroke="color-mix(in srgb, var(--color-lime) 45%, transparent)" strokeWidth="1" />
      <g fill="none" stroke="var(--color-lime)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12.5 30.5a11.5 11.5 0 0 1 23 0" />
        <path d="M10 30.5h28M14 34h20" />
        <path d="M24 19v-2.2" />
      </g>
      <circle cx="24" cy="15.4" r="1.6" fill="var(--color-lime)" />
    </svg>
  )
}

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
          className="size-10 shrink-0 rounded-full object-cover ring-1 ring-lime/40 ring-offset-2 ring-offset-green"
        />
      ) : !brand || brand.platform ? (
        <LogoMark />
      ) : (
        // Restaurante sem logo: monograma com as iniciais em serifa, num anel fino da cor de destaque.
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-lime/50 bg-dark font-serif text-[19px] leading-none text-lime">
          {mark}
        </span>
      )}
      <span
        className={`min-w-0 font-serif text-[21px] leading-none sm:text-[23px] ${
          compact ? 'hidden sm:block' : ''
        }`}
      >
        <span className="block truncate">{name}</span>
        {tagline && (
          <small className="mt-1.5 block truncate font-sans text-[9px] font-medium tracking-[0.22em] text-muted uppercase">
            {tagline}
          </small>
        )}
      </span>
    </Link>
  )
}

export function Topbar({ brand, to, compact = false, children }) {
  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-line/60 bg-green/80 px-[clamp(16px,5.7vw,96px)] backdrop-blur-xl sm:h-[76px]">
      <Brand brand={brand} to={to} compact={compact} />
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">{children}</div>
    </header>
  )
}

/** Rodapé. No cardápio de um restaurante, `legalBase` aponta para os termos e a privacidade dele (/r/<slug>). */
export function Footer({ name = 'Restaurante Total', legalBase = '' }) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 bg-green px-[clamp(16px,5.7vw,96px)] py-8 text-[11px] text-muted">
      <span className="font-serif text-[15px] text-ink/80">{name}</span>
      <span className="flex gap-4">
        <Link to={`${legalBase}/termos`} className="hover:text-ink">Termos</Link>
        <Link to={`${legalBase}/privacidade`} className="hover:text-ink">Privacidade</Link>
        <span>© {new Date().getFullYear()}</span>
      </span>
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
      className={`fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-50 w-max max-w-[calc(100vw-32px)] rounded-xl border px-5 py-3 text-center text-sm font-medium shadow-[0_20px_50px_-12px_rgba(0,0,0,.6)] backdrop-blur animate-[pop-in_.2s_ease-out] ${
        msg.tone === 'error' ? 'border-red-400/30 bg-[#2a1416]/95 text-red-100' : 'border-lime/30 bg-dark/95 text-ink'
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
    ? 'border-[#ddd6c8] bg-card text-dark hover:border-olive'
    : 'border-line bg-white/[0.03] text-ink hover:border-ink/30'
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
      <span className="size-4 animate-spin rounded-full border-[1.5px] border-lime/80 border-t-transparent" />
      {label}
    </div>
  )
}
