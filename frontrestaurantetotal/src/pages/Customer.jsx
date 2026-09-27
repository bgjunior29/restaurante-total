import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CheckoutDrawer from '../components/Checkout'
import OptionsSheet from '../components/OptionsSheet'
import { Footer, Spinner, Stepper, Topbar, useToast } from '../components/ui'
import { money, pad2, waLink } from '../lib/format'
import { load, myBill, myOrders, rememberOrder, save } from '../lib/storage'
import { useTenant } from '../lib/tenant'

function HeroArt() {
  return (
    <div
      aria-hidden
      className="relative hidden h-[345px] overflow-hidden rounded-[160px_160px_28px_28px] border border-line md:block"
      style={{ background: 'radial-gradient(circle at 52% 42%, color-mix(in srgb, var(--color-olive) 55%, var(--color-panel)) 0%, var(--color-panel) 55%, var(--color-dark) 100%)' }}
    >
      <span className="eyebrow absolute top-12 left-16 text-ink/90">Mesa posta</span>
      <div className="absolute top-[-12%] left-[16%] size-[520px] rounded-full border border-lime/20" />
      {/* prato */}
      <div className="absolute top-[22%] left-[30%] size-[230px] rounded-full bg-[#f3ece0] shadow-[0_22px_48px_rgba(0,0,0,.4)]" />
      <div className="absolute top-[29%] left-[35.5%] size-[160px] rounded-full border-[3px] border-[#e2d8c6] bg-[#faf6ee]" />
      <div className="absolute top-[36%] left-[41%] size-[92px] rounded-full bg-[radial-gradient(circle_at_40%_35%,#e9a15b,#b8612c_60%,#7d3b17)] shadow-inner" />
      <div className="absolute top-[40%] left-[48%] size-[26px] rounded-full bg-[radial-gradient(circle_at_40%_35%,#9bc46b,#4f7a33)]" />
      {/* talheres */}
      <div className="absolute top-[18%] left-[22%] h-[250px] w-[9px] rounded-full bg-gradient-to-b from-[#d9d4c7] to-[#9f9a8d] shadow-lg" />
      <div className="absolute top-[18%] left-[74%] h-[250px] w-[11px] rounded-full bg-gradient-to-b from-[#d9d4c7] to-[#9f9a8d] shadow-lg" />
      <span className="eyebrow absolute bottom-7 left-6 text-[10px] text-lime/80">Boa comida. Boas conversas.</span>
    </div>
  )
}

function TableSelect({ tables, table, onChange, className = '' }) {
  return (
    <select className={className} value={table ?? ''} onChange={(e) => onChange(Number(e.target.value))}>
      {table == null && (
        <option value="" disabled>
          Escolha sua mesa…
        </option>
      )}
      {tables.map((t) => (
        <option key={t.number} value={t.number}>
          {t.label}
        </option>
      ))}
    </select>
  )
}

/** Chave da linha do carrinho: mesmo produto com adicionais diferentes = linhas diferentes. */
const lineKey = (productId, optionIds) => `${productId}:${[...optionIds].sort((a, b) => a - b).join(',')}`

export default function Customer() {
  const { numero } = useParams()
  const navigate = useNavigate()
  const { slug, tapi, to } = useTenant()
  const [toast, showToast] = useToast()
  const cartKey = `rt_cart:${slug}`

  const [menu, setMenu] = useState(null)
  const [tables, setTables] = useState([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [picked, setPicked] = useState(() => Number(numero) || load(cartKey, {}).table || null)
  const [cart, setCart] = useState(() => load(cartKey, {}).lines || {}) // { key: {productId, optionIds, quantity} }
  const [drawer, setDrawer] = useState(null) // null | 'review' | 'checkout'
  const [choosing, setChoosing] = useState(null) // produto com adicionais sendo configurado
  const [calling, setCalling] = useState(false)
  const [recent] = useState(() => myOrders(slug))
  const bill = myBill(slug)

  const loadMenu = useCallback(async () => {
    try {
      const [m, t] = await Promise.all([tapi('/menu'), tapi('/tables')])
      setMenu(m)
      setTables(t)
      setError('')
      document.title = `${m.name} — cardápio`
    } catch (e) {
      setError(e.message)
    }
  }, [tapi])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  // Nunca "chuta" uma mesa: se a do QR/da última visita não existe mais, o cliente escolhe.
  const isTable = (n) => tables.some((t) => t.number === n)
  const urlTable = Number(numero) || null
  const table = isTable(urlTable) ? urlTable : isTable(picked) ? picked : null
  const badTable = menu && urlTable && !isTable(urlTable) ? urlTable : null
  const atTable = Boolean(urlTable && table === urlTable)

  useEffect(() => save(cartKey, { lines: cart, table: table ?? picked }), [cartKey, cart, table, picked])

  const products = useMemo(() => {
    const list = []
    for (const c of menu?.categories || []) for (const p of c.products) list.push({ ...p, category: c.name })
    return list
  }, [menu])
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products])

  /** Monta a linha com nome, adicionais e preço atuais; null se algo saiu do cardápio. */
  const describe = useCallback(
    (line) => {
      const p = byId[line.productId]
      if (!p) return null
      const opts = []
      for (const g of p.optionGroups) for (const o of g.options) if (line.optionIds.includes(o.id)) opts.push(o)
      if (opts.length !== line.optionIds.length) return null
      const unit = p.priceCents + opts.reduce((s, o) => s + o.priceCents, 0)
      return { ...line, name: p.name, details: opts.map((o) => o.name).join(', '), unit }
    },
    [byId],
  )

  // Remove do carrinho o que saiu do cardápio (produto ou adicional).
  useEffect(() => {
    if (!menu) return
    setCart((c) => Object.fromEntries(Object.entries(c).filter(([, l]) => l.quantity > 0 && describe(l))))
  }, [menu, describe])

  const lines = Object.entries(cart)
    .map(([key, l]) => {
      const d = describe(l)
      return d && d.quantity > 0 ? { key, ...d } : null
    })
    .filter(Boolean)
  const subtotal = lines.reduce((s, l) => s + l.unit * l.quantity, 0)
  const count = lines.length
  const units = lines.reduce((s, l) => s + l.quantity, 0)
  const qtyOf = (productId) => lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.quantity, 0)

  // "Combina com seu pedido": produtos que costumam sair junto com os do carrinho.
  const inCart = new Set(lines.map((l) => l.productId))
  const score = new Map()
  for (const l of lines) {
    for (const id of byId[l.productId]?.pairsWith || []) {
      if (!inCart.has(id) && byId[id]) score.set(id, (score.get(id) || 0) + 1)
    }
  }
  const suggestions = [...score.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3)
    .map(([id]) => byId[id])

  const setLineQty = (key, q) =>
    setCart((c) => (c[key] ? { ...c, [key]: { ...c[key], quantity: Math.max(0, Math.min(50, q)) } } : c))
  const addLine = (productId, optionIds, quantity = 1) => {
    const key = lineKey(productId, optionIds)
    setCart((c) => ({
      ...c,
      [key]: { productId, optionIds, quantity: Math.min(50, (c[key]?.quantity || 0) + quantity) },
    }))
  }

  const onAdd = (p) => {
    if (p.optionGroups.length) setChoosing(p)
    else {
      addLine(p.id, [])
      if (drawer) showToast(`${p.name} na comanda.`)
    }
  }

  const chooseTable = (n) => {
    setPicked(n)
    navigate(to(`/mesa/${n}`), { replace: true })
  }

  async function callStaff(kind) {
    setCalling(false)
    try {
      await tapi('/calls', { method: 'POST', body: { tableNumber: table, kind } })
      showToast(kind === 'GARCOM' ? 'Garçom chamado! Já já alguém vem até você.' : 'Pedido de ajuda enviado à equipe.')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  if (error && !menu) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted">{error}</p>
        <button className="btn-lime" onClick={loadMenu}>
          Tentar de novo
        </button>
      </div>
    )
  }
  if (!menu) return <Spinner label="Abrindo o cardápio…" />

  const categories = ['Todos', ...menu.categories.filter((c) => c.products.length).map((c) => c.name)]
  const visible = filter === 'Todos' ? products : products.filter((p) => p.category === filter)
  const contacts = [menu.openingHours, menu.address, menu.phone, menu.instagram && `@${menu.instagram.replace(/^@/, '')}`].filter(
    Boolean,
  )
  const whats = waLink(menu.whatsapp, `Olá, ${menu.name}!`)
  const billHere = bill && (!table || bill.table === table) ? bill : null
  const offers = [menu.pickupEnabled && 'retirada', menu.deliveryEnabled && 'delivery'].filter(Boolean)

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar brand={menu} to={to()} compact>
        <span className="eyebrow hidden items-center gap-2 text-[10px] text-lime lg:flex">
          <i className={`size-[7px] rounded-full ${menu.ordersOpen ? 'bg-lime' : 'bg-red-400'}`} />
          {menu.ordersOpen ? 'Aberto para pedidos' : 'Pedidos pausados'}
        </span>
        {billHere && (
          <Link to={to(`/conta/${billHere.token}`)} className="btn-outline">
            Minha conta
          </Link>
        )}
        {!billHere && recent.length > 0 && (
          <Link to={to(`/pedido/${recent[0].token}`)} className="btn-outline">
            Meu pedido <span className="ml-1">↗</span>
          </Link>
        )}
        {atTable && (
          <div className="relative">
            <button className="btn-outline border-lime text-lime" onClick={() => setCalling((v) => !v)} aria-expanded={calling}>
              🙋 <span className="hidden sm:inline">Chamar</span>
            </button>
            {calling && (
              <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-dark text-sm shadow-xl">
                <button className="block w-full px-4 py-3 text-left hover:bg-panel" onClick={() => callStaff('GARCOM')}>
                  🙋 Chamar o garçom
                </button>
                <button className="block w-full px-4 py-3 text-left hover:bg-panel" onClick={() => callStaff('AJUDA')}>
                  ❓ Preciso de ajuda
                </button>
                {billHere && (
                  <Link className="block px-4 py-3 hover:bg-panel" to={to(`/conta/${billHere.token}`)}>
                    🧾 Ver e pedir a conta
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </Topbar>

      <main className="flex-1">
        {/* HERO */}
        <section className="mx-auto max-w-[1500px] px-[clamp(16px,5.7vw,96px)]">
          <div className="grid items-center gap-[4vw] py-8 md:min-h-[450px] md:grid-cols-[1.05fr_.95fr] md:py-12">
            <div>
              <p className="eyebrow text-lime">
                ✳ &nbsp; {atTable ? `Boas-vindas à mesa ${pad2(table)}` : offers.length ? `Salão, ${offers.join(' e ')}` : 'Boas-vindas'}
              </p>
              <h1 className="my-5 font-display text-[clamp(40px,6.5vw,102px)] leading-[.94] font-bold tracking-[-0.068em] md:my-6">
                {menu.heroTitle}
                {menu.heroHighlight && (
                  <>
                    <br />
                    <em className="text-lime not-italic">{menu.heroHighlight}</em>
                  </>
                )}
              </h1>
              {menu.heroText && <p className="max-w-[440px] leading-[1.65] text-ink/75">{menu.heroText}</p>}
              {contacts.length > 0 && (
                <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {contacts.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#cardapio" className="btn-lime inline-block md:hidden">
                  Ver cardápio ↓
                </a>
                {whats && (
                  <a href={whats} target="_blank" rel="noreferrer" className="btn-outline">
                    WhatsApp do restaurante
                  </a>
                )}
              </div>
            </div>
            <HeroArt />
          </div>
          <ol className="hidden gap-4 pb-12 sm:grid sm:grid-cols-3">
            {(atTable
              ? ['Monte seu pedido', 'Acompanhe o preparo', 'Peça a conta pelo celular']
              : ['Monte seu pedido', 'Escolha mesa, retirada ou delivery', 'Acompanhe até chegar']
            ).map((t, i) => (
              <li key={t} className="flex items-baseline gap-4 border-t border-line pt-4 text-sm text-ink/80">
                <span className="font-display text-2xl font-bold text-lime">{pad2(i + 1)}</span>
                {t}
              </li>
            ))}
          </ol>
        </section>

        {/* CARDÁPIO */}
        <section id="cardapio" className="scroll-mt-2 bg-cream text-dark">
          <div className="mx-auto max-w-[1500px] px-[clamp(16px,5.7vw,96px)] py-10 md:py-14">
            {!menu.ordersOpen && (
              <div className="mb-8 rounded-2xl bg-[#f3d9c4] px-5 py-4 text-sm font-medium text-[#6b2f12]">
                No momento não estamos recebendo pedidos pelo cardápio. Chame um atendente. 🙂
              </div>
            )}
            {badTable && (
              <div role="alert" className="mb-6 rounded-2xl bg-[#f3d9c4] px-5 py-4 text-sm font-medium text-[#6b2f12]">
                A mesa {pad2(badTable)} não está disponível. Escolha sua mesa abaixo ou chame um atendente.
              </div>
            )}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-6 md:mb-8">
              <div>
                <p className="eyebrow text-olive">Cardápio da casa</p>
                <h2 className="mt-2 font-display text-[clamp(30px,3.4vw,44px)] font-bold tracking-[-0.04em]">O que vai ser hoje?</h2>
              </div>
              {tables.length > 0 && (
                <label className="rounded-2xl border border-[#d8d3bd] bg-card px-4 py-2.5">
                  <span className="eyebrow block text-[9px] text-olive">{table ? 'Sua mesa' : 'Está no salão?'}</span>
                  <TableSelect
                    tables={tables}
                    table={table}
                    onChange={chooseTable}
                    className="min-w-32 bg-transparent font-display text-lg font-semibold outline-none"
                  />
                </label>
              )}
            </div>

            <div className="grid items-start gap-7 lg:grid-cols-[1fr_380px]">
              <div>
                <div
                  role="tablist"
                  aria-label="Categorias"
                  className="no-scrollbar sticky top-0 z-20 -mx-[clamp(16px,5.7vw,96px)] mb-5 flex gap-2 overflow-x-auto bg-cream/95 px-[clamp(16px,5.7vw,96px)] py-3 backdrop-blur lg:static lg:mx-0 lg:flex-wrap lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none"
                >
                  {categories.map((c) => (
                    <button
                      key={c}
                      role="tab"
                      aria-selected={filter === c}
                      onClick={() => setFilter(c)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        filter === c ? 'border-dark bg-dark text-ink' : 'border-[#cdc9b5] bg-transparent text-[#4a5347] hover:border-dark'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {visible.length === 0 && <p className="text-sm text-[#6b7266]">Nenhum item disponível agora.</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  {visible.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      qty={qtyOf(p.id)}
                      onAdd={() => onAdd(p)}
                      onQty={(q) => setLineQty(lineKey(p.id, []), q)}
                    />
                  ))}
                </div>

                {recent.length > 0 && (
                  <div className="mt-10">
                    <p className="eyebrow mb-3 text-olive">Seus pedidos de hoje</p>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((o) => (
                        <Link
                          key={o.token}
                          to={to(`/pedido/${o.token}`)}
                          className="rounded-full border border-[#cdc9b5] px-4 py-2 text-xs font-semibold hover:border-dark"
                        >
                          {o.code} →
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
                {(menu.pickupEnabled || menu.deliveryEnabled) && (
                  <div className="rounded-[20px] bg-sage p-5 text-sm">
                    <h3 className="font-display text-xl font-semibold">Também para levar</h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-[#5d6558]">
                      {menu.pickupEnabled && <li>🛍️ Retirada no balcão · pronto em ~{menu.prepTimeMin} min</li>}
                      {menu.deliveryEnabled && (
                        <li>
                          🛵 Delivery · ~{menu.deliveryTimeMin} min · taxa {money(menu.deliveryFeeCents)}
                          {menu.freeDeliveryAboveCents > 0 && ` (grátis acima de ${money(menu.freeDeliveryAboveCents)})`}
                        </li>
                      )}
                      {menu.deliveryEnabled && menu.deliveryArea && <li>Atendemos: {menu.deliveryArea}</li>}
                    </ul>
                  </div>
                )}

                <div className="hidden rounded-[20px] bg-dark p-5 text-ink lg:block">
                  <h3 className="font-display text-xl font-semibold">Seu pedido</h3>
                  {count === 0 ? (
                    <p className="mt-3 text-xs leading-relaxed text-muted">Tudo começa com uma boa escolha. Adicione itens ao pedido.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-line border-b border-line text-xs">
                      {lines.map((l) => (
                        <li key={l.key} className="flex justify-between gap-3 py-2">
                          <span className="min-w-0">
                            {l.quantity}× {l.name}
                            {l.details && <span className="block truncate text-muted">{l.details}</span>}
                          </span>
                          <span className="shrink-0">{money(l.unit * l.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex justify-between font-display text-lg font-semibold">
                    <span className="text-base">Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <button
                    className="btn-lime mt-4 w-full disabled:bg-olive disabled:opacity-100"
                    disabled={count === 0}
                    onClick={() => setDrawer('review')}
                  >
                    Ver pedido · {units} {units === 1 ? 'item' : 'itens'} →
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <Footer name={menu.name} />
      <div className={`bg-green text-center ${count > 0 ? 'pb-28 lg:pb-6' : 'pb-6'}`}>
        <Link to={to('/equipe')} className="text-[11px] text-muted/60 hover:text-lime">
          Área da equipe
        </Link>
      </div>

      {/* Barra do pedido no celular: sempre à mão, sem precisar rolar até o fim. */}
      {count > 0 && !drawer && !choosing && (
        <div className="fixed inset-x-0 bottom-0 z-30 animate-[rise_.25s_ease-out] p-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
          <button
            onClick={() => setDrawer('review')}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-lime px-5 py-4 font-display font-semibold text-dark shadow-[0_12px_32px_rgba(0,0,0,.35)] transition active:scale-[.99]"
          >
            <span className="flex items-center gap-3">
              <span key={units} className="flex size-7 animate-[bump_.3s_ease-out] items-center justify-center rounded-full bg-dark text-xs text-lime">
                {units}
              </span>
              Ver pedido
            </span>
            <span>{money(subtotal)} →</span>
          </button>
        </div>
      )}

      {choosing && (
        <OptionsSheet
          product={choosing}
          onClose={() => setChoosing(null)}
          onAdd={(optionIds, quantity) => {
            addLine(choosing.id, optionIds, quantity)
            showToast(`${quantity}× ${choosing.name} no pedido.`)
            setChoosing(null)
          }}
        />
      )}

      {drawer && (
        <CheckoutDrawer
          step={drawer}
          setStep={setDrawer}
          menu={menu}
          tapi={tapi}
          table={table}
          atTable={atTable}
          tables={tables}
          chooseTable={chooseTable}
          lines={lines}
          setLineQty={setLineQty}
          subtotal={subtotal}
          suggestions={suggestions}
          onSuggest={onAdd}
          sessionToken={billHere?.token}
          onDone={(order) => {
            rememberOrder(slug, order)
            setCart({})
            navigate(to(`/pedido/${order.token}`))
          }}
          onStale={loadMenu}
          showToast={showToast}
        />
      )}
      {toast}
    </div>
  )
}

function ProductCard({ product: p, qty, onAdd, onQty }) {
  const simple = !p.optionGroups.length
  return (
    <article
      className={`flex min-h-[126px] overflow-hidden rounded-[20px] border bg-card shadow-[0_1px_0_rgba(0,0,0,.02)] transition-colors ${
        qty > 0 ? 'border-olive' : 'border-[#e3dfcd]'
      }`}
    >
      {p.imageUrl && (
        <img src={p.imageUrl} alt="" loading="lazy" className="w-28 shrink-0 object-cover sm:w-32" onError={(e) => e.currentTarget.remove()} />
      )}
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <span className="eyebrow flex items-center gap-2 text-[8px] text-[#6b7266]">
          {p.category}
          {p.lastUnits && <span className="rounded-full bg-[#f3d9c4] px-2 py-0.5 text-[8px] text-[#6b2f12]">Últimas unidades</span>}
        </span>
        <h3 className="mt-2 font-display text-[17px] font-semibold">{p.name}</h3>
        {p.description && <p className="mt-1 max-w-[260px] text-xs leading-snug text-[#6b7266]">{p.description}</p>}
        {!simple && (
          <p className="mt-1 text-[11px] font-semibold text-olive">
            {p.optionGroups.some((g) => g.minSelect > 0) ? 'Escolha as opções' : 'Com adicionais'}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between pt-3">
          <strong className="font-display text-lg">
            {!simple && <span className="mr-1 text-xs font-medium text-[#6b7266]">a partir de</span>}
            {money(p.priceCents)}
          </strong>
          {simple && qty > 0 ? (
            <Stepper light label={p.name} value={qty} onChange={onQty} />
          ) : (
            <div className="flex items-center gap-2">
              {qty > 0 && <span className="rounded-full bg-sage px-2 py-0.5 text-[11px] font-bold">{qty}×</span>}
              <button
                aria-label={`Adicionar ${p.name}`}
                onClick={onAdd}
                className="flex size-9 items-center justify-center rounded-full bg-lime text-xl leading-none font-semibold text-dark transition hover:scale-105 active:scale-95"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
