/** localStorage com try/catch: se falhar, o app segue funcionando só em memória. */
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* sem storage disponível */
  }
}

// Carrinho, pedidos e conta ficam separados por restaurante: o mesmo celular pode visitar vários.
const myOrdersKey = (slug) => `rt_my_orders:${slug}`
const billKey = (slug) => `rt_bill:${slug}`

/** Pedidos feitos neste aparelho, neste restaurante, nas últimas 12h (para o cliente acompanhar). */
export function myOrders(slug) {
  const limit = Date.now() - 12 * 3600 * 1000
  return load(myOrdersKey(slug), []).filter((o) => new Date(o.createdAt).getTime() > limit)
}

export function rememberOrder(slug, order) {
  save(
    myOrdersKey(slug),
    [{ token: order.token, code: order.code, type: order.type, createdAt: order.createdAt }, ...myOrders(slug)].slice(0, 20),
  )
  if (order.sessionToken) rememberBill(slug, order.sessionToken, order.table?.number)
}

/** Conta da mesa aberta neste celular (vale por 8h). */
export function myBill(slug) {
  const b = load(billKey(slug), null)
  return b && Date.now() - b.at < 8 * 3600 * 1000 ? b : null
}

export function rememberBill(slug, token, table) {
  save(billKey(slug), { token, table, at: Date.now() })
}

export const forgetBill = (slug) => save(billKey(slug), null)
