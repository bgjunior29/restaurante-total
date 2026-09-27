import { useCallback, useEffect, useState } from 'react'
import { Spinner } from '../../components/ui'
import { centsToInput, money, parseMoney } from '../../lib/format'
import { useTenant } from '../../lib/tenant'

let seq = 0 // chave das linhas novas (crypto.randomUUID não existe fora de HTTPS, ex.: celular na rede local)
const newOption = () => ({ key: `nova-${++seq}`, name: '', price: '0,00', available: true })
const EMPTY = { name: '', minSelect: 0, maxSelect: 1, sortOrder: 0, options: [newOption(), newOption()] }

function ruleText(g) {
  if (g.minSelect > 0) return g.maxSelect === 1 ? 'Obrigatório, escolhe 1' : `Obrigatório, de ${g.minSelect} a ${g.maxSelect}`
  return g.maxSelect === 1 ? 'Opcional, até 1' : `Opcional, até ${g.maxSelect}`
}

/** Grupos de adicionais/variações: "Ponto da carne" (obrigatório, 1), "Extras" (opcional, até 3)... */
export default function OptionGroups({ toast }) {
  const { tapi } = useTenant()
  const [groups, setGroups] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setGroups(await tapi('/admin/option-groups'))
    } catch (e) {
      toast(e.message, 'error')
    }
  }, [tapi, toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  const edit = (g) =>
    setForm({
      ...g,
      options: g.options.map((o) => ({ ...o, key: String(o.id), price: centsToInput(o.priceCents) })),
    })

  const setOption = (key, patch) =>
    setForm((f) => ({ ...f, options: f.options.map((o) => (o.key === key ? { ...o, ...patch } : o)) }))

  const moveOption = (index, delta) =>
    setForm((f) => {
      const options = [...f.options]
      const target = index + delta
      if (target < 0 || target >= options.length) return f
      ;[options[index], options[target]] = [options[target], options[index]]
      return { ...f, options }
    })

  async function save(e) {
    e.preventDefault()
    const options = []
    for (const o of form.options) {
      if (!o.name.trim()) continue // linha vazia é ignorada
      const priceCents = parseMoney(o.price || '0')
      if (!Number.isFinite(priceCents) || priceCents < 0) return toast(`Preço inválido em "${o.name}".`, 'error')
      options.push({ id: o.id, name: o.name.trim(), priceCents, available: o.available })
    }
    if (!options.length) return toast('Adicione pelo menos uma opção.', 'error')
    const body = {
      name: form.name,
      minSelect: Number(form.minSelect) || 0,
      maxSelect: Math.max(1, Number(form.maxSelect) || 1),
      sortOrder: Number(form.sortOrder) || 0,
      options,
    }
    setSaving(true)
    try {
      if (form.id) await tapi(`/admin/option-groups/${form.id}`, { method: 'PUT', body })
      else await tapi('/admin/option-groups', { method: 'POST', body })
      toast('Grupo salvo.')
      setForm(null)
      refresh()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function remove(g) {
    const warn = g.productCount ? ` Ele está em ${g.productCount} produto(s) e sairá deles.` : ''
    if (!confirm(`Excluir o grupo "${g.name}"?${warn}`)) return
    try {
      await tapi(`/admin/option-groups/${g.id}`, { method: 'DELETE' })
      toast('Grupo excluído.')
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  if (!groups) return <Spinner />

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Adicionais e variações</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Crie grupos como "Ponto da carne" (obrigatório) ou "Extras" (opcional, com preço). Depois ligue o grupo aos produtos em
            Cardápio → Editar.
          </p>
        </div>
        <button className="btn-lime py-2 text-sm" onClick={() => setForm({ ...EMPTY, options: [newOption(), newOption()] })}>
          + Novo grupo
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="mt-6 rounded-2xl border border-lime/40 bg-dark p-5">
          <p className="font-display text-lg font-semibold">{form.id ? `Editando: ${form.name}` : 'Novo grupo'}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Nome do grupo</label>
              <input
                className="input"
                required
                autoFocus
                maxLength={60}
                placeholder="Ex.: Ponto da carne"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Mínimo de escolhas</label>
              <input
                className="input"
                type="number"
                min={0}
                max={20}
                value={form.minSelect}
                onChange={(e) => setForm({ ...form, minSelect: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-muted">0 = opcional · 1 = obrigatório</p>
            </div>
            <div>
              <label className="label">Máximo de escolhas</label>
              <input
                className="input"
                type="number"
                min={1}
                max={20}
                value={form.maxSelect}
                onChange={(e) => setForm({ ...form, maxSelect: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-muted">1 = escolhe só uma opção</p>
            </div>
          </div>

          <p className="label mt-5">Opções</p>
          <ul className="space-y-2">
            {form.options.map((o, i) => (
              <li
                key={o.key}
                className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_130px_auto_auto] sm:border-0 sm:p-0"
              >
                <input
                  className="input col-span-2 py-2 sm:col-span-1"
                  placeholder="Nome da opção"
                  maxLength={60}
                  value={o.name}
                  onChange={(e) => setOption(o.key, { name: e.target.value })}
                />
                <div className="flex max-w-40 items-center rounded-xl border border-line bg-green2 pl-3 focus-within:border-lime sm:max-w-none">
                  <span className="text-xs text-muted">+R$</span>
                  <input
                    className="w-full min-w-0 bg-transparent px-2 py-2 text-ink outline-none"
                    inputMode="decimal"
                    aria-label="Preço adicional"
                    value={o.price}
                    onChange={(e) => setOption(o.key, { price: e.target.value })}
                  />
                </div>
                <label className="order-last col-span-2 flex items-center gap-1.5 px-1 text-xs text-muted sm:order-none sm:col-span-1 sm:px-0">
                  <input
                    type="checkbox"
                    className="accent-lime"
                    checked={o.available}
                    onChange={(e) => setOption(o.key, { available: e.target.checked })}
                  />
                  Disponível
                </label>
                <div className="flex items-center justify-end gap-1 text-xs">
                  <button type="button" aria-label="Subir" className="act px-2.5" onClick={() => moveOption(i, -1)}>
                    ↑
                  </button>
                  <button type="button" aria-label="Descer" className="act px-2.5" onClick={() => moveOption(i, 1)}>
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Remover opção"
                    className="act act-danger px-2.5"
                    onClick={() => setForm((f) => ({ ...f, options: f.options.filter((x) => x.key !== o.key) }))}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-lime"
            onClick={() => setForm((f) => ({ ...f, options: [...f.options, newOption()] }))}
          >
            + Adicionar opção
          </button>

          <div className="mt-6 flex gap-2">
            <button className="btn-lime py-2 text-sm" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar grupo'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {groups.length === 0 && !form ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
          Nenhum grupo ainda. Crie o primeiro, por exemplo "Ponto da carne".
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <article key={g.id} className="rounded-2xl border border-line bg-dark p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">{g.name}</h3>
                  <p className="text-xs text-muted">
                    {ruleText(g)} · em {g.productCount} produto{g.productCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  <button className="act" onClick={() => edit(g)}>
                    Editar
                  </button>
                  <button className="act act-danger" onClick={() => remove(g)}>
                    Excluir
                  </button>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                {g.options.map((o) => (
                  <li key={o.id} className={`rounded-lg bg-panel px-2.5 py-1.5 ${o.available ? '' : 'line-through opacity-50'}`}>
                    {o.name}
                    {o.priceCents > 0 && <span className="text-lime"> +{money(o.priceCents)}</span>}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
