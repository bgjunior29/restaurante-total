import { useState } from 'react'
import { DAYS, WEEK_ORDER } from '../lib/hours'
import { THEMES, themeVars } from '../lib/themes'
import ImageField from './ImageField'
import { Brand } from './ui'

// Cores claras: o texto dos botões é escuro, então a cor de destaque precisa ser clara para ter contraste.
const PRESETS = ['#d4b483', '#d9a47a', '#e2b6a6', '#cbc196', '#b4c8d6', '#cfbad8', '#e3cfa6', '#ece6da']

/** Contraste aproximado do texto escuro dos botões sobre a cor escolhida (WCAG). */
function contrastWithDark(hex) {
  const lum = (h) => {
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 21
  return (lum(hex) + 0.05) / (lum('#162017') + 0.05)
}

/** Seletor de tema: cada opção mostra as cores de verdade do tema. */
export function ThemePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Object.entries(THEMES).map(([key, t]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key, t.accent)}
          className={`flex items-center gap-3 rounded-xl border p-2 text-left text-xs font-semibold transition ${
            value === key ? 'border-lime ring-2 ring-lime/40' : 'border-line text-ink/75 hover:border-ink/30 hover:text-ink'
          }`}
        >
          <span className="flex h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10" aria-hidden>
            <span className="w-1/2" style={{ background: t.colors.green }} />
            <span className="w-1/4" style={{ background: t.colors.cream }} />
            <span className="w-1/4" style={{ background: t.accent }} />
          </span>
          {t.name}
        </button>
      ))}
    </div>
  )
}

/** Cor de destaque: presets claros + seletor livre, com aviso de contraste. */
export function AccentPicker({ value, onChange }) {
  const lowContrast = contrastWithDark(value) < 4.5
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Cor ${c}`}
            aria-pressed={value.toLowerCase() === c}
            onClick={() => onChange(c)}
            className={`size-9 rounded-full border-2 transition ${value.toLowerCase() === c ? 'scale-110 border-ink' : 'border-transparent'}`}
            style={{ background: c }}
          />
        ))}
        <label className="ml-1 flex items-center gap-2 text-xs text-muted">
          <input
            type="color"
            className="size-9 cursor-pointer rounded border border-line bg-transparent"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          Outra
        </label>
      </div>
      {lowContrast && (
        <p className="mt-2 text-xs text-amber-300">Cor escura demais: o texto dos botões fica difícil de ler. Prefira uma cor clara.</p>
      )}
    </>
  )
}

/** Prévia do cardápio com o tema aplicado só dentro dela (não mexe no resto da página). */
export function IdentityPreview({ form }) {
  return (
    <div style={themeVars(form.theme, form.accentColor)} className="overflow-hidden rounded-2xl border border-line bg-green text-ink">
      <div className="border-b border-line p-4">
        <Brand brand={form} to="#" />
      </div>
      <div className="p-4">
        <p className="eyebrow flex items-center gap-2 text-[10px] text-lime"><span className="h-px w-5 bg-lime/60" />Boas-vindas à sua mesa 01</p>
        <p className="mt-3 font-serif text-[34px] leading-[1]">
          {form.heroTitle}
          <br />
          <span className="text-lime">{form.heroHighlight}</span>
        </p>
        {form.heroText && <p className="mt-3 text-sm text-ink/75">{form.heroText}</p>}
      </div>
      <div className="bg-cream p-4 text-dark">
        <p className="eyebrow text-[9px] text-olive">Cardápio da casa</p>
        <div className="mt-2 rounded-2xl border border-black/10 bg-card p-3">
          <p className="font-display font-semibold">Burger da Casa</p>
          <div className="mt-2 flex items-center justify-between">
            <strong className="font-display">R$ 38,90</strong>
            <span className="flex size-8 items-center justify-center rounded-full bg-dark text-lg text-cream">+</span>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-dark p-3 text-ink">
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>R$ 38,90</span>
          </div>
          <span className="btn-lime mt-3 block text-center text-sm">Ver comanda →</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Formulário completo de identidade (usado na Gestão do restaurante e no painel da plataforma).
 * `initial` = valores atuais; `onSave(valores)` salva e devolve os valores gravados;
 * `onUpload(dataUrl)` envia o logo e devolve `{ url }`.
 */
const EMPTY_WEEK = () => [[], ...Array.from({ length: 5 }, () => [{ open: '11:30', close: '15:00' }]), []]

/** Horário de atendimento por dia: aberto/fechado e até 3 intervalos (almoço, jantar…). */
export function HoursEditor({ value, onChange }) {
  const week = value?.length === 7 ? value : null
  if (!week) {
    return (
      <div className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
        Com os horários por dia, o cardápio mostra sozinho "Aberto agora" ou "Loja fechada, abre amanhã às 11h30".
        <button type="button" className="btn-outline mt-3 block text-sm" onClick={() => onChange(EMPTY_WEEK())}>
          Definir horários por dia
        </button>
      </div>
    )
  }
  const setDay = (d, ranges) => onChange(week.map((r, i) => (i === d ? ranges : r)))
  return (
    <div className="divide-y divide-line rounded-xl border border-line">
      {WEEK_ORDER.map((d) => {
        const ranges = week[d]
        const open = ranges.length > 0
        return (
          <div key={d} className="flex flex-wrap items-start gap-x-4 gap-y-2 p-3">
            <label className="flex w-32 shrink-0 items-center gap-2 pt-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 accent-lime"
                checked={open}
                onChange={(e) => setDay(d, e.target.checked ? [{ open: '11:30', close: '15:00' }] : [])}
              />
              {DAYS[d]}
            </label>
            {open ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {ranges.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <input
                      type="time"
                      aria-label={`${DAYS[d]}: abre`}
                      className="input w-auto py-1.5 [color-scheme:dark]"
                      value={r.open}
                      required
                      onChange={(e) => setDay(d, ranges.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))}
                    />
                    <span className="text-muted">às</span>
                    <input
                      type="time"
                      aria-label={`${DAYS[d]}: fecha`}
                      className="input w-auto py-1.5 [color-scheme:dark]"
                      value={r.close}
                      required
                      onChange={(e) => setDay(d, ranges.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))}
                    />
                    {ranges.length > 1 && (
                      <button type="button" className="text-xs text-muted hover:text-red-300" onClick={() => setDay(d, ranges.filter((_, j) => j !== i))}>
                        Remover
                      </button>
                    )}
                  </div>
                ))}
                {ranges.length < 3 && (
                  <button
                    type="button"
                    className="self-start text-xs font-semibold text-lime hover:underline"
                    onClick={() => setDay(d, [...ranges, { open: '19:00', close: '23:00' }])}
                  >
                    + outro horário
                  </button>
                )}
              </div>
            ) : (
              <span className="pt-2 text-sm text-muted">Fechado</span>
            )}
          </div>
        )
      })}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs text-muted">
        <span>Fechamento antes da abertura (ex.: 18:00 às 02:00) = passa da meia-noite.</span>
        <button type="button" className="underline hover:text-ink" onClick={() => onChange([])}>
          Não informar horários
        </button>
      </div>
    </div>
  )
}

export default function IdentityForm({ initial, onSave, onUpload, submitLabel = 'Salvar identidade', onCancel }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await onSave(form)
      if (saved) setForm(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-line bg-dark p-5">
          <h2 className="font-serif text-2xl">Tema e cor</h2>
          <p className="mt-1 text-xs text-muted">O tema muda as cores de fundo do cardápio, do painel e da gestão. A cor de destaque vai nos botões e títulos.</p>
          <p className="label mt-4">Tema</p>
          <ThemePicker value={form.theme} onChange={(theme, accent) => setForm({ ...form, theme, accentColor: accent })} />
          <p className="label mt-5">Cor de destaque</p>
          <AccentPicker value={form.accentColor} onChange={(accentColor) => setForm({ ...form, accentColor })} />
        </section>

        <section className="rounded-2xl border border-line bg-dark p-5">
          <h2 className="font-serif text-2xl">Marca</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome do restaurante</label>
              <input className="input" required maxLength={60} value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="label">Slogan (abaixo do nome)</label>
              <input className="input" maxLength={60} placeholder="Restaurante · Cozinha · Encontros" value={form.tagline} onChange={set('tagline')} />
            </div>
            <div className="sm:col-span-2">
              <ImageField
                label="Logo (opcional)"
                value={form.logoUrl}
                onChange={(logoUrl) => setForm((f) => ({ ...f, logoUrl }))}
                upload={onUpload}
                maxSide={400}
                placeholder="https://…/logo.png"
                hint="Imagem quadrada. Pode enviar o arquivo ou colar o link da foto de perfil do Instagram."
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-dark p-5">
          <h2 className="font-serif text-2xl">Capa do cardápio</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Título</label>
              <input className="input" maxLength={60} value={form.heroTitle} onChange={set('heroTitle')} />
            </div>
            <div>
              <label className="label">Título em destaque (na cor)</label>
              <input className="input" maxLength={60} value={form.heroHighlight} onChange={set('heroHighlight')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Texto de apresentação</label>
              <textarea className="input resize-none" rows={3} maxLength={240} value={form.heroText} onChange={set('heroText')} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-dark p-5">
          <h2 className="font-serif text-2xl">Informações</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Horário de atendimento</label>
              <HoursEditor value={form.weeklyHours} onChange={(weeklyHours) => setForm({ ...form, weeklyHours })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observação sobre o horário (opcional)</label>
              <input className="input" maxLength={200} placeholder="Ex.: feriados abrimos só no almoço" value={form.openingHours} onChange={set('openingHours')} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" maxLength={30} inputMode="tel" value={form.phone} onChange={set('phone')} />
            </div>
            <div>
              <label className="label">WhatsApp (botão para o cliente falar com vocês)</label>
              <input className="input" maxLength={20} inputMode="tel" placeholder="(11) 98888-7777" value={form.whatsapp ?? ''} onChange={set('whatsapp')} />
            </div>
            <div>
              <label className="label">Instagram</label>
              <input className="input" maxLength={60} placeholder="@seurestaurante" value={form.instagram} onChange={set('instagram')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Endereço</label>
              <input className="input" maxLength={160} value={form.address} onChange={set('address')} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <button className="btn-lime" disabled={saving}>
            {saving ? 'Salvando…' : submitLabel}
          </button>
          {onCancel && (
            <button type="button" className="btn-outline" onClick={onCancel}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <aside className="h-fit lg:sticky lg:top-6">
        <p className="eyebrow mb-3 text-muted">Prévia</p>
        <IdentityPreview form={form} />
      </aside>
    </form>
  )
}
