import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { api } from './api'
import { AuthProvider } from './auth'
import { load, save } from './storage'
import { applyTheme, resetTheme } from './themes'

const TenantContext = createContext(null)

/** Tudo dentro de /r/:slug. Carrega a identidade do restaurante e dá acesso à API dele. */
export function TenantLayout() {
  const { slug } = useParams()
  // Abre na hora com a identidade da última visita (guardada no aparelho) e confirma com o servidor por trás:
  // o celular não fica numa tela de "Abrindo…" enquanto a API acorda.
  const [info, setInfo] = useState(() => load(`rt_info:${slug}`, null))
  const [error, setError] = useState(null)

  const reloadInfo = useCallback(async () => {
    try {
      const data = await api(`/t/${slug}/info`)
      setInfo(data)
      setError(null)
      save(`rt_info:${slug}`, data)
      applyTheme(data.theme, data.accentColor)
    } catch (e) {
      // Com a identidade guardada, uma falha passageira não derruba a tela (404 sim: o endereço não existe).
      if (!load(`rt_info:${slug}`, null) || e.status === 404) setError(e)
    }
  }, [slug])

  useEffect(() => {
    const cached = load(`rt_info:${slug}`, null)
    setInfo(cached)
    if (cached) applyTheme(cached.theme, cached.accentColor)
    reloadInfo()
    return resetTheme
  }, [slug, reloadInfo])

  const value = useMemo(
    () => ({
      slug,
      info,
      reloadInfo,
      /** API do restaurante: tapi('/menu') → /api/t/<slug>/menu, com a sessão da equipe desse restaurante. */
      tapi: (path, opts = {}) => api(`/t/${slug}${path}`, { ...opts, scope: slug }),
      /** Caminho de tela dentro do restaurante: to('/equipe') → /r/<slug>/equipe */
      to: (path = '') => `/r/${slug}${path}`,
    }),
    [slug, info, reloadInfo],
  )

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-display text-2xl font-bold">{error.status === 404 ? 'Restaurante não encontrado.' : 'Não deu para abrir.'}</p>
        <p className="max-w-sm text-sm text-muted">
          {error.status === 404 ? 'Confira o endereço ou escaneie o QR code de novo.' : error.message}
        </p>
        {error.status !== 404 && (
          <button className="btn-lime" onClick={reloadInfo}>
            Tentar de novo
          </button>
        )}
      </div>
    )
  }
  if (!info) return <Spinner label="Abrindo…" />

  if (info.status !== 'ACTIVE') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="eyebrow text-lime">{info.name}</p>
        <p className="font-display text-3xl font-bold">Cardápio indisponível.</p>
        <p className="max-w-sm text-sm text-muted">Este cardápio está temporariamente fora do ar. Chame um atendente.</p>
      </div>
    )
  }

  return (
    <TenantContext.Provider value={value}>
      <AuthProvider scope={slug} base={`/t/${slug}`}>
        <Outlet />
      </AuthProvider>
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)
