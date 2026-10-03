import { useEffect, useRef, useState } from 'react'
import { money } from '../lib/format'
import { Stepper } from './ui'

/** Escolha de adicionais/variações de um produto, respeitando mínimo e máximo de cada grupo. */
export default function OptionsSheet({ product, onClose, onAdd }) {
  const [picked, setPicked] = useState(() => {
    // Grupo obrigatório com uma única opção já vem marcado.
    const start = []
    for (const g of product.optionGroups) if (g.minSelect >= 1 && g.options.length === 1) start.push(g.options[0].id)
    return start
  })
  const [quantity, setQuantity] = useState(1)
  const panel = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panel.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const toggle = (g, o) => {
    setPicked((cur) => {
      const inGroup = cur.filter((id) => g.options.some((x) => x.id === id))
      if (cur.includes(o.id)) return cur.filter((id) => id !== o.id)
      if (g.maxSelect === 1) return [...cur.filter((id) => !inGroup.includes(id)), o.id] // funciona como rádio
      if (inGroup.length >= g.maxSelect) return cur
      return [...cur, o.id]
    })
  }

  const missing = product.optionGroups.filter((g) => picked.filter((id) => g.options.some((o) => o.id === id)).length < g.minSelect)
  const extra = product.optionGroups.flatMap((g) => g.options).filter((o) => picked.includes(o.id)).reduce((s, o) => s + o.priceCents, 0)
  const unit = product.priceCents + extra

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button aria-label="Fechar" tabIndex={-1} className="absolute inset-0 animate-[fade-in_.2s_ease-out] bg-black/60" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Opções de ${product.name}`}
        className="relative flex max-h-[90vh] w-full max-w-lg animate-[rise_.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-cream text-dark outline-none sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-3">
          <div>
            <h2 className="font-serif text-2xl">{product.name}</h2>
            {product.description && <p className="mt-1 text-xs text-[#6b7266]">{product.description}</p>}
          </div>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#cfcab5] bg-card text-sm"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          {product.optionGroups.map((g) => {
            const count = picked.filter((id) => g.options.some((o) => o.id === id)).length
            const rule =
              g.minSelect > 0
                ? g.maxSelect === 1
                  ? 'Obrigatório · escolha 1'
                  : `Obrigatório · de ${g.minSelect} a ${g.maxSelect}`
                : g.maxSelect === 1
                  ? 'Opcional · até 1'
                  : `Opcional · até ${g.maxSelect}`
            return (
              <fieldset key={g.id} className="mb-5">
                <legend className="flex w-full items-baseline justify-between gap-3">
                  <span className="font-display font-semibold">{g.name}</span>
                  <span className={`text-[11px] font-semibold ${count < g.minSelect ? 'text-[#b4541f]' : 'text-olive'}`}>{rule}</span>
                </legend>
                <div className="mt-2 divide-y divide-[#e3dfcd] rounded-2xl border border-[#e3dfcd] bg-card">
                  {g.options.map((o) => {
                    const on = picked.includes(o.id)
                    const full = !on && g.maxSelect > 1 && count >= g.maxSelect
                    return (
                      <label
                        key={o.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm ${full ? 'opacity-40' : ''}`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type={g.maxSelect === 1 ? 'radio' : 'checkbox'}
                            name={`g${g.id}`}
                            className="size-4 accent-[#7d8f3f]"
                            checked={on}
                            disabled={full}
                            onChange={() => toggle(g, o)}
                            onClick={(e) => g.maxSelect === 1 && on && (e.preventDefault(), toggle(g, o))}
                          />
                          {o.name}
                        </span>
                        {o.priceCents > 0 && <span className="text-xs font-semibold text-[#5d6558]">+ {money(o.priceCents)}</span>}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}
        </div>
        <div className="flex items-center gap-3 border-t border-[#e3dfcd] p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <Stepper light min={1} label={product.name} value={quantity} onChange={setQuantity} />
          <button className="btn-lime flex-1" disabled={missing.length > 0} onClick={() => onAdd(picked, quantity)}>
            {missing.length ? `Escolha: ${missing[0].name.toLowerCase()}` : `Adicionar · ${money(unit * quantity)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
