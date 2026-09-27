import { useCallback, useEffect, useState } from 'react'
import { Spinner } from '../../components/ui'
import { useTenant } from '../../lib/tenant'

/**
 * CRUD de lista simples (cupons, formas de pagamento...). Cada tela informa:
 * - endpoint: rota da API ('/admin/games')
 * - empty: registro novo; toForm/toBody: conversão entre API e formulário
 * - Fields: campos do formulário; Row: como cada item aparece na lista
 */
export default function SimpleCrud({ toast, title, intro, noun, endpoint, empty, toForm = (x) => x, toBody, Fields, Row, deleteHint }) {
  const { tapi } = useTenant()
  const [items, setItems] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setItems(await tapi(endpoint))
    } catch (e) {
      toast(e.message, 'error')
    }
  }, [tapi, endpoint, toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function save(e) {
    e.preventDefault()
    let body
    try {
      body = toBody(form)
    } catch (err) {
      return toast(err.message, 'error')
    }
    setSaving(true)
    try {
      if (form.id) await tapi(`${endpoint}/${form.id}`, { method: 'PUT', body })
      else await tapi(endpoint, { method: 'POST', body })
      toast(`${noun} salvo(a).`)
      setForm(null)
      refresh()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const label = (item) => item.name ?? item.code

  async function patch(item, changes, msg) {
    try {
      await tapi(`${endpoint}/${item.id}`, { method: 'PUT', body: toBody({ ...toForm(item), ...changes }) })
      if (msg) toast(msg)
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function remove(item) {
    if (!confirm(`Excluir "${label(item)}"?${deleteHint ? ` ${deleteHint}` : ''}`)) return
    try {
      await tapi(`${endpoint}/${item.id}`, { method: 'DELETE' })
      toast(`${noun} excluído(a).`)
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  if (!items) return <Spinner />

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">{intro}</p>
        </div>
        <button className="btn-lime py-2 text-sm" onClick={() => setForm({ ...empty, sortOrder: items.length })}>
          + Novo(a) {noun.toLowerCase()}
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-2xl border border-lime/40 bg-dark p-5 sm:grid-cols-2">
          <p className="font-display text-lg font-semibold sm:col-span-2">{form.id ? `Editando: ${form.name}` : `Novo(a) ${noun.toLowerCase()}`}</p>
          <Fields form={form} setForm={setForm} />
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

      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-dark">
        {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nada cadastrado ainda.</li>}
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className={`min-w-0 ${item.active ? '' : 'opacity-50'}`}>
              <Row item={item} />
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => patch(item, { active: !item.active }, item.active ? `"${label(item)}" desativado(a).` : `"${label(item)}" ativado(a).`)}
                className={`rounded-full px-3 py-1 font-semibold ${item.active ? 'bg-lime text-dark' : 'bg-panel text-muted'}`}
              >
                {item.active ? 'Ativo' : 'Inativo'}
              </button>
              <button className="act" onClick={() => setForm(toForm(item))}>
                Editar
              </button>
              <button className="act act-danger" onClick={() => remove(item)}>
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
