import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import IdentityForm, { AccentPicker, IdentityPreview, ThemePicker } from '../../components/IdentityForm'
import { Spinner, Topbar, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { centsToInput, money, parseMoney, slugify } from '../../lib/format'
import { THEMES } from '../../lib/themes'

const papi = (path, opts = {}) => api(`/platform${path}`, { ...opts, scope: 'platform' })

// Textos padrão da capa, só para a prévia do restaurante ainda não criado.
const DEFAULT_IDENTITY = {
  heroTitle: 'Sabor de verdade,',
  heroHighlight: 'direto na sua mesa.',
  heroText: 'Peça pelo celular, acompanhe o preparo e feche a conta sem esperar.',
  logoUrl: '',
}

const NEW_TENANT = {
  name: '',
  slug: '',
  slugTouched: false,
  plan: 'Padrão',
  price: '199,00',
  notes: '',
  adminName: 'Administrador',
  adminUsername: 'admin',
  adminPassword: '',
  starterContent: true,
  tagline: 'Restaurante · Cozinha · Encontros',
  theme: 'terra',
  accentColor: '#f6c35b',
}

const dateBR = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')

export default function Platform() {
  const { user, logout } = useAuth()
  const [toast, showToast] = useToast()
  const [tenants, setTenants] = useState(null)
  const [summary, setSummary] = useState(null)
  const [creating, setCreating] = useState(null)
  const [editing, setEditing] = useState(null)
  const [styling, setStyling] = useState(null) // { tenant, identity } do restaurante com a identidade aberta
  const [busy, setBusy] = useState(false)

  async function openIdentity(t) {
    try {
      const identity = await papi(`/tenants/${t.id}/identity`)
      setStyling({ tenant: t, identity })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function saveIdentity(values) {
    try {
      const saved = await papi(`/tenants/${styling.tenant.id}/identity`, { method: 'PUT', body: values })
      showToast(`Identidade de ${saved.name} salva. O cardápio dele já mostra as mudanças.`)
      setStyling(null)
      refresh()
      return saved
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const refresh = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([papi('/tenants'), papi('/summary')])
      setTenants(t)
      setSummary(s)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }, [showToast])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function create(e) {
    e.preventDefault()
    const planPriceCents = parseMoney(creating.price)
    if (!Number.isFinite(planPriceCents) || planPriceCents < 0) return showToast('Mensalidade inválida.', 'error')
    setBusy(true)
    try {
      const t = await papi('/tenants', {
        method: 'POST',
        body: {
          name: creating.name,
          slug: creating.slug,
          plan: creating.plan,
          planPriceCents,
          notes: creating.notes,
          adminName: creating.adminName,
          adminUsername: creating.adminUsername,
          adminPassword: creating.adminPassword,
          starterContent: creating.starterContent,
          tagline: creating.tagline,
          theme: creating.theme,
          accentColor: creating.accentColor,
        },
      })
      showToast(`Restaurante criado em /r/${t.slug}. Passe o login ao dono.`)
      setCreating(null)
      refresh()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function update(t, patch, msg) {
    const planPriceCents = patch.price != null ? parseMoney(patch.price) : t.planPriceCents
    if (!Number.isFinite(planPriceCents) || planPriceCents < 0) return showToast('Mensalidade inválida.', 'error')
    const body = {
      name: patch.name ?? t.name,
      slug: patch.slug ?? t.slug,
      plan: patch.plan ?? t.plan,
      planPriceCents,
      notes: patch.notes ?? t.notes,
      status: patch.status ?? t.status,
    }
    setBusy(true)
    try {
      await papi(`/tenants/${t.id}`, { method: 'PUT', body })
      showToast(msg || 'Restaurante atualizado.')
      setEditing(null)
      refresh()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function resetAdmin(t) {
    const username = prompt(`Usuário admin de ${t.name}:`, 'admin')
    if (!username) return
    const password = prompt(`Nova senha para "${username}" (mín. 6 caracteres):`)
    if (password == null) return
    if (password.length < 6) return showToast('A senha precisa ter pelo menos 6 caracteres.', 'error')
    try {
      const r = await papi(`/tenants/${t.id}/admin`, { method: 'POST', body: { username, password } })
      showToast(r.created ? `Admin "${username}" criado.` : `Senha de "${username}" redefinida.`)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div className="min-h-screen">
      <Topbar brand={{ name: 'Restaurante Total', tagline: 'Plataforma' }} to="/plataforma">
        <span className="hidden text-xs text-muted sm:inline">{user?.name}</span>
        <button onClick={logout} className="act">
          Sair
        </button>
      </Topbar>
      <main className="mx-auto max-w-[1300px] px-[clamp(16px,5.7vw,96px)] py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-lime">✳ &nbsp; Plataforma</p>
            <h1 className="mt-3 font-display text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.05em]">Seus restaurantes clientes.</h1>
          </div>
          <button className="btn-lime" onClick={() => setCreating({ ...NEW_TENANT })}>
            + Novo restaurante
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Restaurantes', summary?.tenants ?? '–'],
            ['Ativos', summary?.active ?? '–'],
            ['Suspensos', summary?.suspended ?? '–'],
            ['Receita recorrente / mês', summary ? money(summary.mrrCents) : '–'],
          ].map(([l, v], i) => (
            <div key={l} className="rounded-2xl border border-line bg-dark p-5">
              <p className="text-xs text-muted">{l}</p>
              <p className={`mt-3 font-display font-bold tabular-nums ${i === 3 ? 'text-2xl text-lime' : 'text-3xl'}`}>{v}</p>
            </div>
          ))}
        </div>

        {creating && (
          <form onSubmit={create} className="mt-8 rounded-2xl border border-lime/40 bg-dark p-5">
            <p className="font-display text-lg font-semibold">Novo restaurante</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="label">Nome do restaurante</label>
                <input
                  className="input"
                  required
                  autoFocus
                  maxLength={60}
                  value={creating.name}
                  onChange={(e) =>
                    setCreating({
                      ...creating,
                      name: e.target.value,
                      slug: creating.slugTouched ? creating.slug : slugify(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="label">Endereço (/r/…)</label>
                <input
                  className="input"
                  required
                  minLength={3}
                  maxLength={40}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Letras minúsculas, números e hífens"
                  value={creating.slug}
                  onChange={(e) => setCreating({ ...creating, slug: e.target.value.toLowerCase(), slugTouched: true })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Plano</label>
                  <input className="input" maxLength={30} value={creating.plan} onChange={(e) => setCreating({ ...creating, plan: e.target.value })} />
                </div>
                <div>
                  <label className="label">Mensalidade (R$)</label>
                  <input className="input" inputMode="decimal" value={creating.price} onChange={(e) => setCreating({ ...creating, price: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Nome do admin do restaurante</label>
                <input className="input" required maxLength={60} value={creating.adminName} onChange={(e) => setCreating({ ...creating, adminName: e.target.value })} />
              </div>
              <div>
                <label className="label">Usuário (login)</label>
                <input
                  className="input"
                  required
                  minLength={3}
                  maxLength={30}
                  autoCapitalize="none"
                  value={creating.adminUsername}
                  onChange={(e) => setCreating({ ...creating, adminUsername: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Senha inicial</label>
                <input
                  className="input"
                  required
                  minLength={6}
                  maxLength={100}
                  type="password"
                  autoComplete="new-password"
                  value={creating.adminPassword}
                  onChange={(e) => setCreating({ ...creating, adminPassword: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Anotações internas (opcional)</label>
                <input
                  className="input"
                  maxLength={500}
                  placeholder="Contato do dono, dia do vencimento…"
                  value={creating.notes}
                  onChange={(e) => setCreating({ ...creating, notes: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-3 text-sm">
                <input
                  type="checkbox"
                  className="accent-lime"
                  checked={creating.starterContent}
                  onChange={(e) => setCreating({ ...creating, starterContent: e.target.checked })}
                />
                Começar com cardápio de exemplo
              </label>
            </div>

            <div className="mt-6 grid gap-6 border-t border-line pt-5 lg:grid-cols-[1fr_320px]">
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold">Visual</p>
                <p className="mt-1 text-xs text-muted">Tudo isso pode ser mudado depois, no botão "Identidade" do restaurante ou pelo próprio dono.</p>
                <label className="label mt-4">Slogan (abaixo do nome)</label>
                <input
                  className="input"
                  maxLength={60}
                  value={creating.tagline}
                  onChange={(e) => setCreating({ ...creating, tagline: e.target.value })}
                />
                <p className="label mt-4">Tema</p>
                <ThemePicker value={creating.theme} onChange={(theme, accentColor) => setCreating({ ...creating, theme, accentColor })} />
                <p className="label mt-4">Cor de destaque</p>
                <AccentPicker value={creating.accentColor} onChange={(accentColor) => setCreating({ ...creating, accentColor })} />
              </div>
              <div>
                <p className="eyebrow mb-3 text-muted">Prévia</p>
                <IdentityPreview
                  form={{
                    ...DEFAULT_IDENTITY,
                    name: creating.name || 'Nome do restaurante',
                    tagline: creating.tagline,
                    theme: creating.theme,
                    accentColor: creating.accentColor,
                  }}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button className="btn-lime py-2 text-sm" disabled={busy}>
                {busy ? 'Criando…' : 'Criar restaurante'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setCreating(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {styling && (
          <section className="mt-8 rounded-2xl border border-lime/40 p-4 sm:p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-lime">Identidade</p>
                <h2 className="font-display text-2xl font-bold">{styling.tenant.name}</h2>
              </div>
              <button className="btn-outline" onClick={() => setStyling(null)}>
                ← Voltar aos restaurantes
              </button>
            </div>
            <IdentityForm
              key={styling.tenant.id}
              initial={styling.identity}
              onSave={saveIdentity}
              onCancel={() => setStyling(null)}
            />
          </section>
        )}

        {!tenants ? (
          <Spinner />
        ) : styling ? null : (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {tenants.map((t) => (
              <article key={t.id} className={`rounded-2xl border bg-dark p-5 ${t.status === 'ACTIVE' ? 'border-line' : 'border-red-900'}`}>
                {editing?.id === t.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      update(t, editing)
                    }}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <div>
                      <label className="label">Nome</label>
                      <input className="input py-2" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Endereço (/r/…)</label>
                      <input className="input py-2" required value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase() })} />
                    </div>
                    <div>
                      <label className="label">Plano</label>
                      <input className="input py-2" value={editing.plan} onChange={(e) => setEditing({ ...editing, plan: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Mensalidade (R$)</label>
                      <input className="input py-2" inputMode="decimal" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Anotações internas</label>
                      <input className="input py-2" maxLength={500} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                    </div>
                    {editing.slug !== t.slug && (
                      <p className="text-xs text-amber-300 sm:col-span-2">
                        Mudar o endereço invalida os QR codes já impressos desse restaurante. Ele vai precisar reimprimir.
                      </p>
                    )}
                    <div className="flex gap-2 sm:col-span-2">
                      <button className="btn-lime py-2 text-sm" disabled={busy}>
                        Salvar
                      </button>
                      <button type="button" className="btn-outline" onClick={() => setEditing(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          title={`Tema ${THEMES[t.theme]?.name ?? t.theme}`}
                          className="flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-line"
                          aria-hidden
                        >
                          <span className="w-1/2" style={{ background: THEMES[t.theme]?.colors.green }} />
                          <span className="w-1/2" style={{ background: t.accentColor }} />
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate font-display text-xl font-bold">{t.name}</h2>
                          <p className="truncate text-xs text-muted">
                            /r/{t.slug} · desde {dateBR(t.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                          t.status === 'ACTIVE' ? 'bg-lime/15 text-lime' : 'bg-red-950 text-red-300'
                        }`}
                      >
                        {t.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="text-muted">Plano</dt>
                        <dd className="font-semibold">
                          {t.plan} · {money(t.planPriceCents)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">Comandas (30 dias)</dt>
                        <dd className="font-semibold tabular-nums">{t.orders30d}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Vendido pelo restaurante (30 dias)</dt>
                        <dd className="font-semibold tabular-nums">{money(t.revenue30dCents)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Último pedido</dt>
                        <dd className="font-semibold">{dateBR(t.lastOrderAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Equipe · mesas</dt>
                        <dd className="font-semibold tabular-nums">
                          {t.users} · {t.tables}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">Pedidos</dt>
                        <dd className="font-semibold">{t.ordersOpen ? 'Abertos' : 'Pausados'}</dd>
                      </div>
                    </dl>
                    {t.notes && <p className="mt-3 rounded-lg bg-panel px-3 py-2 text-xs text-muted">{t.notes}</p>}
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                      <Link className="act text-lime" to={`/r/${t.slug}`} target="_blank">
                        Cardápio ↗
                      </Link>
                      <Link className="act text-lime" to={`/r/${t.slug}/equipe`} target="_blank">
                        Painel ↗
                      </Link>
                      <button className="act" onClick={() => setEditing({ ...t, price: centsToInput(t.planPriceCents) })}>
                        Editar
                      </button>
                      <button className="act text-lime" onClick={() => openIdentity(t)}>
                        Identidade (tema, cor, slogan)
                      </button>
                      <button className="act" onClick={() => resetAdmin(t)}>
                        Redefinir senha do admin
                      </button>
                      <button
                        className={t.status === 'ACTIVE' ? 'act act-danger' : 'act text-lime'}
                        disabled={busy}
                        onClick={() =>
                          t.status === 'ACTIVE'
                            ? confirm(`Suspender ${t.name}? O cardápio e o painel dele saem do ar até você reativar.`) &&
                              update(t, { status: 'SUSPENDED' }, `${t.name} suspenso.`)
                            : update(t, { status: 'ACTIVE' }, `${t.name} reativado.`)
                        }
                      >
                        {t.status === 'ACTIVE' ? 'Suspender' : 'Reativar'}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
      {toast}
    </div>
  )
}
