import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Footer, Topbar } from '../components/ui'
import { money } from '../lib/format'

// Taxas aproximadas dos marketplaces (comissão + pagamento online). Cada contrato é diferente: o dono ajusta na tela.
const PRESETS = [
  { label: 'Marketplace · entrega própria', pct: 15 },
  { label: 'Marketplace · entrega deles', pct: 27 },
]
const PLAN_CENTS = 17900 // mensalidade usada na conta; ajuste para o seu plano

const toNumber = (s) => Number(String(s).replace(/\./g, '').replace(',', '.')) || 0

function Field({ label, suffix, prefix, value, onChange, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center rounded-xl border border-line bg-green2 px-4 focus-within:border-lime">
        {prefix && <span className="text-sm text-muted">{prefix}</span>}
        <input
          className="min-w-0 flex-1 bg-transparent px-2 py-3 text-lg text-ink outline-none"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

function Stat({ label, value, strong }) {
  return (
    <div className={`rounded-2xl border p-5 ${strong ? 'border-lime bg-lime/10' : 'border-line bg-dark'}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold tracking-tight ${strong ? 'text-lime' : ''}`}>{value}</p>
    </div>
  )
}

/** Calculadora para a venda: quanto o restaurante paga de comissão e quanto economiza levando parte dos pedidos para o canal próprio. */
export default function Savings() {
  const [revenue, setRevenue] = useState('20.000')
  const [pct, setPct] = useState('27')
  const [moved, setMoved] = useState('30')

  const monthly = toNumber(revenue) * 100 // centavos
  const fee = Math.min(100, toNumber(pct)) / 100
  const share = Math.min(100, toNumber(moved)) / 100
  const commission = monthly * fee
  const saved = monthly * share * fee
  const net = saved - PLAN_CENTS
  const multiple = saved / PLAN_CENTS

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar>
        <Link to="/" className="btn-outline">
          Conhecer o sistema
        </Link>
      </Topbar>
      <main className="mx-auto w-full max-w-5xl flex-1 px-[clamp(16px,5.7vw,96px)] py-12">
        <p className="eyebrow text-lime">✳ &nbsp; Calculadora de economia</p>
        <h1 className="mt-4 font-display text-[clamp(32px,5vw,60px)] leading-[1] font-bold tracking-[-0.05em]">
          Quanto a comissão do aplicativo
          <br />
          <em className="text-lime not-italic">custa para você?</em>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/75">
          No canal próprio (QR na mesa, link no Instagram e no WhatsApp) não existe comissão por pedido. Você paga só a mensalidade.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-5">
            <Field label="Quanto você vende por mês nos aplicativos?" prefix="R$" value={revenue} onChange={setRevenue} />
            <div>
              <Field
                label="Comissão + taxa de pagamento"
                suffix="%"
                value={pct}
                onChange={setPct}
                hint="Valores aproximados. Confira o percentual no seu contrato ou no extrato do aplicativo."
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPct(String(p.pct))}
                    className={`rounded-full border px-3 py-1 text-xs ${toNumber(pct) === p.pct ? 'border-lime text-lime' : 'border-line text-muted'}`}
                  >
                    {p.label} · ~{p.pct}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Quanto dos pedidos você leva para o canal próprio? ({toNumber(moved)}%)</label>
              <input type="range" min="0" max="100" step="5" value={toNumber(moved)} onChange={(e) => setMoved(e.target.value)} className="w-full accent-[var(--color-lime)]" />
              <p className="mt-1 text-[11px] text-muted">Clientes que já conhecem o restaurante costumam aceitar pedir direto, principalmente com um cupom.</p>
            </div>
          </div>

          <div className="grid content-start gap-4 sm:grid-cols-2">
            <Stat label="Você paga de comissão por mês" value={money(commission)} />
            <Stat label="Por ano" value={money(commission * 12)} />
            <Stat label="Economia por mês no canal próprio" value={money(saved)} strong />
            <Stat label="Economia por ano" value={money(saved * 12)} strong />
            <div className="rounded-2xl border border-line bg-dark p-5 sm:col-span-2">
              {net > 0 ? (
                <p className="text-sm leading-relaxed">
                  Descontando a mensalidade de <strong>{money(PLAN_CENTS)}</strong>, sobram{' '}
                  <strong className="text-lime">{money(net)} por mês</strong> no seu caixa. O sistema se paga{' '}
                  <strong className="text-lime">{multiple.toFixed(1).replace('.', ',')}×</strong>.
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-ink/80">
                  Com esses números a economia ainda não cobre a mensalidade de {money(PLAN_CENTS)}. Mas o canal próprio também traz o QR na mesa,
                  a conta dividida e a tela da cozinha.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
