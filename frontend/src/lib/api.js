// Cada área tem a sua sessão: um token por restaurante (scope = slug) e um para a plataforma (scope = 'platform').
const tokenKey = (scope) => `rt_token:${scope}`

export function getToken(scope) {
  try {
    return localStorage.getItem(tokenKey(scope))
  } catch {
    return null
  }
}

export function setToken(scope, token) {
  try {
    if (token) localStorage.setItem(tokenKey(scope), token)
    else localStorage.removeItem(tokenKey(scope))
  } catch {
    /* navegador sem storage: sessão dura só até recarregar */
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/**
 * Chama a API. `scope` define qual sessão manda o token (slug do restaurante ou 'platform');
 * sem scope, a chamada é pública.
 */
// Servidor instável ou acordando (Render/Neon grátis): leituras tentam de novo sozinhas.
const RETRY_STATUS = new Set([500, 502, 503, 504])
const RETRY_DELAYS = [1200, 3000] // ms entre as tentativas
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function api(path, { method = 'GET', body, scope } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = scope ? getToken(scope) : null
  if (token) headers.Authorization = `Bearer ${token}`
  // Só GET é repetido: repetir um POST poderia, por exemplo, criar a mesma comanda duas vezes.
  const attempts = method === 'GET' ? RETRY_DELAYS.length + 1 : 1

  let res
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(RETRY_DELAYS[i - 1])
    try {
      res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    } catch {
      if (i < attempts - 1) continue
      throw new ApiError('Sem conexão com o servidor. Tente novamente.', 0)
    }
    if (!RETRY_STATUS.has(res.status)) break
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && scope) {
      setToken(scope, null)
      window.dispatchEvent(new CustomEvent('rt:logout', { detail: scope }))
    }
    let message = data?.detail
    if (Array.isArray(message)) message = friendlyValidation(message)
    throw new ApiError(message || 'Algo deu errado. Tente novamente.', res.status)
  }
  // Resposta 200 sem JSON = não é a nossa API (ex.: hospedagem devolvendo o index.html).
  if (data === null) throw new ApiError('Servidor indisponível no momento. Tente novamente.', res.status)
  return data
}

function friendlyValidation(errors) {
  const first = errors[0]
  const msg = first?.msg?.replace(/^Value error, /, '')
  return msg && !/^(Field|Input|String)/.test(msg) ? msg : 'Confira os campos preenchidos.'
}
