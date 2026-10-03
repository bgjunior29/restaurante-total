import { useCallback, useEffect, useState } from 'react'
import { useTenant } from '../../lib/tenant'
import { useAuth } from '../../lib/auth'

const EMPTY = { username: '', name: '', password: '', role: 'STAFF' }
const ROLES = { STAFF: 'Atendente / garçom', KITCHEN: 'Cozinha', ADMIN: 'Administrador' }

export default function Team({ toast }) {
  const { tapi } = useTenant()
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY)

  const refresh = useCallback(async () => {
    try {
      setUsers(await tapi('/admin/users'))
    } catch (e) {
      toast(e.message, 'error')
    }
  }, [toast, tapi])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function create(e) {
    e.preventDefault()
    try {
      await tapi('/admin/users', { method: 'POST', body: form })
      setForm(EMPTY)
      toast('Usuário criado.')
      refresh()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function patch(u, body, msg) {
    try {
      await tapi(`/admin/users/${u.id}`, { method: 'PATCH', body })
      if (msg) toast(msg)
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  function resetPassword(u) {
    const password = prompt(`Nova senha para ${u.name} (mín. 6 caracteres):`)
    if (password == null) return
    if (password.length < 6) return toast('A senha precisa ter pelo menos 6 caracteres.', 'error')
    patch(u, { password }, 'Senha alterada.')
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section className="min-w-0">
        <h2 className="font-serif text-2xl">Equipe</h2>
        <p className="mt-1 text-sm text-muted">Atendentes cuidam dos pedidos e do salão. Cozinha vê só a fila de preparo. Administradores também acessam a gestão.</p>
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-dark">
          {users.map((u) => (
            <li key={u.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${u.active ? '' : 'opacity-50'}`}>
              <div>
                <p className="font-semibold">
                  {u.name} {u.id === me.id && <span className="text-xs text-lime">(você)</span>}
                </p>
                <p className="text-xs text-muted">
                  @{u.username} · {ROLES[u.role]}
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <button className="act" onClick={() => resetPassword(u)}>
                  Trocar senha
                </button>
                {u.id !== me.id && (
                  <>
                    <select
                      aria-label={`Perfil de ${u.name}`}
                      className="rounded-lg border border-line bg-green2 px-2 py-1 text-xs"
                      value={u.role}
                      onChange={(e) => patch(u, { role: e.target.value }, 'Perfil alterado.')}
                    >
                      {Object.entries(ROLES).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button className="act act-danger" onClick={() => patch(u, { active: !u.active })}>
                      {u.active ? 'Desativar' : 'Reativar'}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={create} className="h-fit rounded-2xl border border-line bg-dark p-5">
        <h3 className="font-serif text-lg">Novo usuário</h3>
        <label className="label mt-4">Nome</label>
        <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="label mt-3">Usuário (login)</label>
        <input className="input" required minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <label className="label mt-3">Senha</label>
        <input className="input" type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <label className="label mt-3">Perfil</label>
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {Object.entries(ROLES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <button className="btn-lime mt-5 w-full py-2.5 text-sm">Criar usuário</button>
      </form>
    </div>
  )
}
