import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api'

const AuthContext = createContext(null)

/**
 * Sessão de uma área. `scope` = slug do restaurante ou 'platform'; `base` = prefixo das rotas de login
 * dessa área na API ('/t/<slug>' ou '/platform').
 */
export function AuthProvider({ scope, base, children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(getToken(scope)))

  useEffect(() => {
    if (!getToken(scope)) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    api(`${base}/auth/me`, { scope })
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [scope, base])

  useEffect(() => {
    const onLogout = (e) => e.detail === scope && setUser(null)
    window.addEventListener('rt:logout', onLogout)
    return () => window.removeEventListener('rt:logout', onLogout)
  }, [scope])

  const login = useCallback(
    async (username, password) => {
      const res = await api(`${base}/auth/login`, { method: 'POST', body: { username, password } })
      setToken(scope, res.token)
      setUser(res.user)
      return res.user
    },
    [scope, base],
  )

  const logout = useCallback(() => {
    setToken(scope, null)
    setUser(null)
  }, [scope])

  return <AuthContext.Provider value={{ user, loading, login, logout, scope }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

/** Tela inicial de cada perfil da equipe: a cozinha vai direto para a fila de preparo. */
export const homeFor = (user) => (user?.role === 'KITCHEN' ? '/equipe/cozinha' : '/equipe')
