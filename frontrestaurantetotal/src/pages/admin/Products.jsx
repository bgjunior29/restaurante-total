import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTenant } from '../../lib/tenant'
import { centsToInput, money, parseMoney, STATIONS } from '../../lib/format'
import ImageField from '../../components/ImageField'

const EMPTY = {
  name: '',
  description: '',
  imageUrl: '',
  price: '',
  categoryId: '',
  available: true,
  controlStock: false,
  stockQty: '',
  lowStockAt: 5,
  sortOrder: 0,
  optionGroupIds: [],
}

const toForm = (p) => ({
  ...p,
  price: centsToInput(p.priceCents),
  controlStock: p.stockQty !== null,
  stockQty: p.stockQty ?? '',
})

export default function Products({ toast }) {
  const { tapi, to } = useTenant()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [groups, setGroups] = useState([])
  const [form, setForm] = useState(null) // null | {id?, ...}
  const [newCat, setNewCat] = useState('')
  const [newStation, setNewStation] = useState('COZINHA')
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const formKey = form ? (form.id ?? 'novo') : null

  // Ao abrir o formulário (novo ou editando um item lá embaixo), leva a tela até ele.
  useEffect(() => {
    if (formKey) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [formKey])

  const refresh = useCallback(async () => {
    try {
      const [c, p, g] = await Promise.all([tapi('/admin/categories'), tapi('/admin/products'), tapi('/admin/option-groups')])
      setCategories(c)
      setProducts(p)
      setGroups(g)
    } catch (e) {
      toast(e.message, 'error')
    }
  }, [toast, tapi])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function saveProduct(e) {
    e.preventDefault()
    const priceCents = parseMoney(form.price)
    if (!Number.isFinite(priceCents) || priceCents < 0) return toast('Preço inválido.', 'error')
    const stockQty = form.controlStock ? Number(form.stockQty) : null
    if (form.controlStock && !(Number.isInteger(stockQty) && stockQty >= 0)) return toast('Estoque inválido.', 'error')
    const body = {
      name: form.name,
      description: form.description,
      imageUrl: form.imageUrl.trim(),
      priceCents,
      stockQty,
      lowStockAt: Number(form.lowStockAt) || 0,
      categoryId: Number(form.categoryId),
      available: form.available,
      sortOrder: Number(form.sortOrder) || 0,
      optionGroupIds: form.optionGroupIds,
    }
    setSaving(true)
    try {
      if (form.id) await tapi(`/admin/products/${form.id}`, { method: 'PUT', body })
      else await tapi('/admin/products', { method: 'POST', body })
      setForm(null)
      toast('Produto salvo.')
      refresh()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(p) {
    try {
      if (!p.available && p.stockQty === 0) return toast('Sem estoque: edite o produto e informe a quantidade.', 'error')
      await tapi(`/admin/products/${p.id}`, { method: 'PUT', body: { ...p, available: !p.available } })
      toast(p.available ? `"${p.name}" marcado como esgotado.` : `"${p.name}" de volta ao cardápio.`)
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function remove(p) {
    if (!confirm(`Excluir "${p.name}"? Se já tiver vendas, ele só será desativado.`)) return
    try {
      await tapi(`/admin/products/${p.id}`, { method: 'DELETE' })
      toast('Produto removido.')
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function addCategory(e) {
    e.preventDefault()
    try {
      await tapi('/admin/categories', { method: 'POST', body: { name: newCat.trim(), station: newStation, sortOrder: categories.length } })
      setNewCat('')
      refresh()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function updateCategory(c, patch) {
    try {
      await tapi(`/admin/categories/${c.id}`, {
        method: 'PUT',
        body: { name: c.name, station: c.station, sortOrder: c.sortOrder, ...patch },
      })
      toast('Categoria atualizada.')
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function removeCategory(c) {
    if (!confirm(`Excluir a categoria "${c.name}"?`)) return
    try {
      await tapi(`/admin/categories/${c.id}`, { method: 'DELETE' })
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <section className="min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Produtos</h2>
          <button className="btn-lime py-2 text-sm" onClick={() => setForm({ ...EMPTY, categoryId: categories[0]?.id ?? '' })} disabled={!categories.length}>
            + Novo produto
          </button>
        </div>

        {form && (
          <form
            ref={formRef}
            onSubmit={saveProduct}
            onKeyDown={(e) => e.key === 'Escape' && setForm(null)}
            className="mt-5 grid gap-4 rounded-2xl border border-lime/40 bg-dark p-5 sm:grid-cols-2"
          >
            <p className="font-display text-lg font-semibold sm:col-span-2">{form.id ? `Editando: ${form.name}` : 'Novo produto'}</p>
            <div className="sm:col-span-2">
              <label className="label">Nome</label>
              <input className="input" required autoFocus maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descrição</label>
              <input className="input" maxLength={240} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <ImageField
                label="Foto (opcional)"
                value={form.imageUrl}
                onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))}
                upload={(dataBase64) => tapi('/admin/images', { method: 'POST', body: { dataBase64 } })}
                hint="Tire a foto pelo celular ou escolha da galeria. Ela é reduzida automaticamente."
              />
            </div>
            <div>
              <label className="label">Preço (R$)</label>
              <input className="input" required inputMode="decimal" placeholder="0,00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ordem de exibição</label>
              <input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 self-end pb-3 text-sm">
              <input type="checkbox" className="accent-lime" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
              Disponível no cardápio
            </label>
            <div className="rounded-xl bg-panel p-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="accent-lime"
                  checked={form.controlStock}
                  onChange={(e) => setForm({ ...form, controlStock: e.target.checked })}
                />
                Controlar estoque deste produto
              </label>
              {form.controlStock && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Quantidade em estoque</label>
                    <input className="input" type="number" min={0} required value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Avisar quando chegar a</label>
                    <input className="input" type="number" min={0} value={form.lowStockAt} onChange={(e) => setForm({ ...form, lowStockAt: e.target.value })} />
                  </div>
                  <p className="col-span-2 text-[11px] text-muted">
                    Cada pedido baixa o estoque. Chegou a zero, o produto sai do cardápio sozinho; pedido cancelado devolve.
                  </p>
                </div>
              )}
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="label">Adicionais e variações deste produto</legend>
              {groups.length === 0 ? (
                <p className="text-xs text-muted">
                  Nenhum grupo criado ainda. Crie em{' '}
                  <Link to={to('/equipe/admin/adicionais')} className="text-lime underline">
                    Adicionais
                  </Link>{' '}
                  (ex.: ponto da carne, sabores, extras).
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => {
                    const on = form.optionGroupIds.includes(g.id)
                    return (
                      <label
                        key={g.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          on ? 'border-lime text-lime' : 'border-line text-muted hover:border-lime'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-lime"
                          checked={on}
                          onChange={() =>
                            setForm({
                              ...form,
                              optionGroupIds: on ? form.optionGroupIds.filter((id) => id !== g.id) : [...form.optionGroupIds, g.id],
                            })
                          }
                        />
                        {g.name}
                        <span className="font-normal text-muted">({g.options.length})</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </fieldset>
            <div className="flex gap-2 sm:col-span-2">
              <button className="btn-lime py-2 text-sm" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setForm(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {categories.map((c) => {
          const list = products.filter((p) => p.categoryId === c.id)
          return (
            <div key={c.id} className="mt-8">
              <p className="eyebrow text-muted">
                {c.name} <span className="ml-1 text-lime/70">· {STATIONS[c.station]}</span>
              </p>
              {list.length === 0 && <p className="mt-2 text-sm text-muted/70">Nenhum produto.</p>}
              <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-dark">
                {list.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className={`flex min-w-0 items-center gap-3 ${p.available ? '' : 'opacity-50'}`}>
                      {p.imageUrl && <img src={p.imageUrl} alt="" className="size-12 shrink-0 rounded-xl object-cover" />}
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {p.name}
                          {p.stockQty !== null && (
                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                p.stockQty <= p.lowStockAt ? 'bg-amber-900/70 text-amber-200' : 'bg-panel text-muted'
                              }`}
                            >
                              {p.stockQty} em estoque
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted">{p.description}</p>
                        {p.optionGroupIds.length > 0 && (
                          <p className="mt-1 text-[11px] text-lime">
                            + {groups.filter((g) => p.optionGroupIds.includes(g.id)).map((g) => g.name).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <strong className="font-display text-base">{money(p.priceCents)}</strong>
                      <button onClick={() => toggle(p)} className={`rounded-full px-3 py-1 font-semibold ${p.available ? 'bg-lime text-dark' : 'bg-panel text-muted'}`}>
                        {p.available ? 'Disponível' : 'Esgotado'}
                      </button>
                      <button className="act" onClick={() => setForm(toForm(p))}>
                        Editar
                      </button>
                      <button className="act act-danger" onClick={() => remove(p)}>
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      <aside>
        <h2 className="font-display text-2xl font-semibold">Categorias</h2>
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-dark">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="min-w-0 truncate">{c.name}</span>
              <select
                aria-label={`Estação de ${c.name}`}
                className="ml-auto rounded-lg border border-line bg-green2 px-2 py-1 text-xs"
                value={c.station}
                onChange={(e) => updateCategory(c, { station: e.target.value })}
              >
                {Object.entries(STATIONS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
              <button className="act act-danger" onClick={() => removeCategory(c)}>
                Excluir
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addCategory} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input className="input py-2" placeholder="Nova categoria" required maxLength={40} value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button className="btn-lime row-span-2 py-2 text-sm">+</button>
          <select aria-label="Estação da nova categoria" className="input py-2 text-sm" value={newStation} onChange={(e) => setNewStation(e.target.value)}>
            {Object.entries(STATIONS).map(([k, l]) => (
              <option key={k} value={k}>
                Preparo: {l}
              </option>
            ))}
          </select>
        </form>
        <p className="mt-2 text-[11px] text-muted">A estação define em qual tela da cozinha os itens aparecem (cozinha, bar, confeitaria…).</p>
      </aside>
    </div>
  )
}
