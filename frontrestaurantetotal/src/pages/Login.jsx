import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Brand } from '../components/ui'
import { homeFor, useAuth } from '../lib/auth'
import { useTenant } from '../lib/tenant'

/** Formulário de login reaproveitado pela equipe do restaurante e pela plataforma. */
export function LoginForm({ brand, brandTo, eyebrow, title, onSuccess, footer }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const u = await login(username, password)
      onSuccess(u)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[24px] border border-line bg-dark p-7">
        <Brand brand={brand} to={brandTo} />
        <p className="eyebrow mt-8 text-lime">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.05em]">{title}</h1>
        <label className="label mt-6" htmlFor="u">
          Usuário
        </label>
        <input
          id="u"
          className="input"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <label className="label mt-4" htmlFor="p">
          Senha
        </label>
        <div className="relative">
          <input
            id="p"
            type={show ? 'text' : 'password'}
            className="input pr-20"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-3 my-auto h-fit text-xs font-semibold text-muted hover:text-lime"
          >
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <button className="btn-lime mt-6 w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar →'}
        </button>
        {footer}
      </form>
    </div>
  )
}

export default function Login() {
  const { user } = useAuth()
  const { info, to } = useTenant()
  const navigate = useNavigate()

  if (user) return <Navigate to={to(homeFor(user))} replace />

  return (
    <LoginForm
      brand={info}
      brandTo={to()}
      eyebrow="Área da equipe"
      title="Entrar na operação."
      onSuccess={(u) => navigate(to(homeFor(u)))}
      footer={
        <Link to={to()} className="mt-4 block text-center text-xs text-muted hover:text-lime">
          ← Voltar ao cardápio
        </Link>
      }
    />
  )
}
