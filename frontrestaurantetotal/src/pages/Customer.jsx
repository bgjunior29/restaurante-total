import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CheckoutDrawer from '../components/Checkout'
import OptionsSheet from '../components/OptionsSheet'
import { Footer, Spinner, Stepper, Topbar, useToast } from '../components/ui'
import Icon from '../components/Icon'
import { money, pad2, waLink } from '../lib/format'
import { load, myBill, myOrders, myTable, rememberOrder, rememberTable, save, tablePath } from '../lib/storage'
import { useTenant } from '../lib/tenant'

/** Capa: um "cardápio impresso" com pratos reais da casa (no lugar de uma ilustração genérica). */
function HeroMenuCard({ menu, products }) {
  const featured = products.slice(0, 4)
  const photo = products.find((p) => p.imageUrl)
  if (!featured.length) return null
  return (
    <div aria-hidden className="relative hidden md:block">
      <div className="absolute -inset-8 rounded-[40px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-lime)_14%,transparent),transparent)]" />
      <div className="relative rotate-[1.2deg] rounded-[6px] bg-cream p-2 text-dark shadow-[0_40px_80px_-30px_rgba(0,0,0,.8)]">
        <div className="rounded-[3px] border border-olive/30 px-9 pt-9 pb-8">
          {photo && <img src={photo.imageUrl} alt="" className="mb-7 h-40 w-full rounded-[2px] object-cover" />}
          <p className="eyebrow text-center text-[9px] text-olive">{menu.name}</p>
          <p className="mt-2 text-center font-serif text-[40px] leading-none italic">Menu</p>
          <div className="mx-auto mt-4 mb-6 h-px w-16 bg-olive/40" />
          <ul className="space-y-4">
            {featured.map((p) => (
              <li key={p.id}>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-[19px] leading-tight">{p.name}</span>
                  <span className="mb-1 flex-1 border-b border-dotted border-olive/40" />
                  <span className="text-sm font-medium tabular-nums">{money(p.priceCents)}</span>
                </div>
                {p.description && <p className="mt-0.5 line-clamp-1 text-[11px] text-[#7a7266]">{p.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** Chave da linha do carrinho: mesmo produto com adicionais diferentes = linhas diferentes. */
const lineKey = (productId, optionIds) => `${productId}:${[...optionIds].sort((a, b) => a - b).join(',')}`

export default function Customer() {
  const { numero } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { slug, tapi, to } = useTenant()
  const [toast, showToast] = useToast()
  const cartKey = `rt_cart:${slug}`

  // Cardápio da última visita aparece na hora; a versão do servidor chega por trás e substitui.
  const menuKey = `rt_menu:${slug}`
  const [menu, setMenu] = useState(() => load(menuKey, {}).menu ?? null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('Todos')
  // Mesa deste celular: só vem do QR (número + chave). { status: 'none' | 'checking' | 'ok' | 'blocked' | 'invalid' }
  const [seat, setSeat] = useState({ status: 'none' })
  const [cart, setCart] = useState(() => load(cartKey, {}).lines || {}) // { key: {productId, optionIds, quantity} }
  const [drawer, setDrawer] = useState(null) // null | 'review' | 'checkout'
  const [choosing, setChoosing] = useState(null) // produto com adicionais sendo configurado
  const [calling, setCalling] = useState(false)
  const [recent] = useState(() => myOrders(slug))
  const bill = myBill(slug)

  const loadMenu = useCallback(async () => {
    try {
      const m = await tapi('/menu')
      setMenu(m)
      setError('')
      save(menuKey, { menu: m })
      document.title = `${m.name} — cardápio`
    } catch (e) {
      setError(e.message)
    }
  }, [tapi, menuKey])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  // Trava de mesa: a mesa só vem do QR escaneado (número + chave). Sem QR, o celular continua na mesa
  // que escaneou antes (enquanto a conta estiver aberta); mesa diferente só depois de fechar a conta de lá.
  const urlTable = Number(numero) || null
  const urlKey = search.get('k') || ''
  useEffect(() => {
    const saved = myTable(slug)
    const target = urlTable
      ? { number: urlTable, key: urlKey || (saved?.number === urlTable ? saved.key : '') }
      : saved && myBill(slug)?.table === saved.number
        ? saved
        : null
    if (!target) return setSeat({ status: 'none' })
    setSeat({ status: 'checking' })
    const session = myBill(slug)?.token || ''
    tapi(`/table/${target.number}?k=${encodeURIComponent(target.key)}&session=${encodeURIComponent(session)}`)
      .then((t) => {
        const table = { number: t.number, label: t.label, key: target.key }
        rememberTable(slug, table)
        setSeat({ status: 'ok', table })
      })
      .catch((e) => {
        if (e.status === 409) setSeat({ status: 'blocked', message: e.message, home: saved })
        else if (e.status === 400 || e.status === 403) setSeat({ status: 'invalid', message: e.message })
        else setSeat({ status: 'none', message: e.message })
      })
  }, [slug, urlTable, urlKey, tapi])

  const table = seat.status === 'ok' ? seat.table.number : null
  const atTable = table != null

  useEffect(() => save(cartKey, { lines: cart }), [cartKey, cart])

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

  async function callStaff(kind) {
    setCalling(false)
    try {
      await tapi('/calls', { method: 'POST', body: { tableNumber: table, tableKey: seat.table.key, kind } })
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
  if (seat.status === 'blocked') return <TableLocked seat={seat} to={to} bill={myBill(slug)} />

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
        <span className="hidden items-center gap-2 text-xs text-muted lg:flex">
          <i className={`size-1.5 rounded-full ${menu.ordersOpen ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,.15)]' : 'bg-red-400'}`} />
          {menu.ordersOpen ? 'Aberto para pedidos' : 'Pedidos pausados'}
        </span>
        {billHere && (
          <Link to={to(`/conta/${billHere.token}`)} className="btn-outline">
            Minha conta
          </Link>
        )}
        {!billHere && recent.length > 0 && (
          <Link to={to(`/pedido/${recent[0].token}`)} className="btn-outline">
            {recent.length > 1 ? `Meus pedidos (${recent.length})` : 'Meu pedido'}
          </Link>
        )}
        {atTable && (
          <div className="relative">
            <button className="btn-outline inline-flex items-center gap-2 border-lime/40 text-lime" onClick={() => setCalling((v) => !v)} aria-expanded={calling}>
              <Icon name="bell" /> <span className="hidden sm:inline">Chamar</span>
            </button>
            {calling && (
              <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-dark/95 p-1 text-sm shadow-[0_24px_48px_-12px_rgba(0,0,0,.7)] backdrop-blur">
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.05]" onClick={() => callStaff('GARCOM')}>
                  <Icon name="hand" className="text-lime" /> Chamar o garçom
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.05]" onClick={() => callStaff('AJUDA')}>
                  <Icon name="help" className="text-lime" /> Preciso de ajuda
                </button>
                {billHere && (
                  <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.05]" to={to(`/conta/${billHere.token}`)}>
                    <Icon name="receipt" className="text-lime" /> Ver e pedir a conta
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
          <div className="grid items-center gap-[6vw] py-10 md:min-h-[520px] md:grid-cols-[1.15fr_.85fr] md:py-16">
            <div>
              <p className="eyebrow flex items-center gap-3 text-lime">
                <span className="h-px w-8 bg-lime/60" />
                {atTable ? `Boas-vindas à mesa ${pad2(table)}` : offers.length ? `Salão, ${offers.join(' e ')}` : 'Boas-vindas'}
              </p>
              <h1 className="my-6 font-serif text-[clamp(44px,6.6vw,104px)] leading-[.95] md:my-7">
                {menu.heroTitle}
                {menu.heroHighlight && (
                  <>
                    <br />
                    <em className="text-lime italic">{menu.heroHighlight}</em>
                  </>
                )}
              </h1>
              {menu.heroText && <p className="max-w-[460px] text-[15px] leading-[1.7] text-ink/65">{menu.heroText}</p>}
              {contacts.length > 0 && (
                <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">
                  {contacts.map((c, i) => (
                    <span key={c} className="flex items-center gap-5">
                      {i > 0 && <span className="h-3 w-px bg-line" />}
                      {c}
                    </span>
                  ))}
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#cardapio" className="btn-lime inline-flex items-center gap-2">
                  Ver cardápio <Icon name="arrow" className="size-4 rotate-90" />
                </a>
                {whats && (
                  <a href={whats} target="_blank" rel="noreferrer" className="btn-outline inline-flex items-center gap-2 py-3">
                    <Icon name="chat" className="size-4" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
            <HeroMenuCard menu={menu} products={products} />
          </div>
          <ol className="hidden gap-4 pb-12 sm:grid sm:grid-cols-3">
            {(atTable
              ? ['Monte seu pedido', 'Acompanhe o preparo', 'Peça a conta pelo celular']
              : ['Monte seu pedido', 'Escolha mesa, retirada ou delivery', 'Acompanhe até chegar']
            ).map((t, i) => (
              <li key={t} className="flex items-baseline gap-4 border-t border-line pt-5 text-sm text-ink/70">
                <span className="font-serif text-3xl text-lime italic">{pad2(i + 1)}</span>
                {t}
              </li>
            ))}
          </ol>
        </section>

        {/* CARDÁPIO */}
        <section id="cardapio" className="scroll-mt-2 bg-cream text-dark">
          <div className="mx-auto max-w-[1500px] px-[clamp(16px,5.7vw,96px)] py-12 md:py-20">
            {!menu.ordersOpen && (
              <div className="mb-8 rounded-2xl bg-[#f3d9c4] px-5 py-4 text-sm font-medium text-[#6b2f12]">
                No momento não estamos recebendo pedidos pelo cardápio. Chame um atendente.
              </div>
            )}
            {seat.status === 'invalid' && (
              <div role="alert" className="mb-6 rounded-2xl bg-[#f3d9c4] px-5 py-4 text-sm font-medium text-[#6b2f12]">
                {seat.message} Você ainda pode ver o cardápio{offers.length ? ` e pedir para ${offers.join(' ou ')}` : ''}.
              </div>
            )}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-6 md:mb-8">
              <div>
                <p className="eyebrow flex items-center gap-3 text-olive">
                  <span className="h-px w-8 bg-olive/50" />
                  Cardápio da casa
                </p>
                <h2 className="mt-3 font-serif text-[clamp(36px,4vw,56px)] leading-none">
                  O que vai ser <em className="text-olive">hoje?</em>
                </h2>
              </div>
              {atTable ? (
                <div className="rounded-xl border border-[#e2dccf] bg-card px-4 py-2.5">
                  <span className="eyebrow block text-[9px] text-olive">Sua mesa</span>
                  <span className="font-serif text-2xl">{seat.table.label}</span>
                </div>
              ) : (
                <p className="max-w-[220px] text-xs text-[#6b7266]">
                  {seat.status === 'checking' ? 'Conferindo sua mesa…' : 'No salão? Escaneie o QR code da sua mesa para pedir nela.'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
              {/* min-w-0: a barra de categorias rola sozinha sem alargar a coluna (e a página) no celular. */}
              <div className="min-w-0">
                <div
                  role="tablist"
                  aria-label="Categorias"
                  className="no-scrollbar sticky top-[68px] z-10 sm:top-[76px] -mx-[clamp(16px,5.7vw,96px)] mb-5 flex gap-2 overflow-x-auto bg-cream/95 px-[clamp(16px,5.7vw,96px)] py-3 backdrop-blur lg:static lg:mx-0 lg:flex-wrap lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none"
                >
                  {categories.map((c) => (
                    <button
                      key={c}
                      role="tab"
                      aria-selected={filter === c}
                      onClick={() => setFilter(c)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                        filter === c ? 'border-dark bg-dark text-cream' : 'border-[#ddd6c8] bg-card/60 text-[#5b554b] hover:border-[#b9b1a2] hover:text-dark'
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
                    <p className="eyebrow mb-3 text-olive">Seus pedidos de hoje ({recent.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((o) => (
                        <Link
                          key={o.token}
                          to={to(`/pedido/${o.token}`)}
                          className="rounded-lg border border-[#ddd6c8] bg-card px-4 py-2 text-xs font-medium hover:border-dark"
                        >
                          {o.code}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
                {(menu.pickupEnabled || menu.deliveryEnabled) && (
                  <div className="rounded-2xl border border-[#e2dccf] bg-card p-6 text-sm">
                    <h3 className="font-serif text-2xl">Também para levar</h3>
                    <ul className="mt-3 space-y-2 text-xs text-[#6b6458]">
                      {menu.pickupEnabled && (
                        <li className="flex gap-2.5">
                          <Icon name="bag" className="size-4 text-olive" /> Retirada no balcão · pronto em ~{menu.prepTimeMin} min
                        </li>
                      )}
                      {menu.deliveryEnabled && (
                        <li className="flex gap-2.5">
                          <Icon name="scooter" className="size-4 text-olive" /> Delivery · ~{menu.deliveryTimeMin} min · taxa {money(menu.deliveryFeeCents)}
                          {menu.freeDeliveryAboveCents > 0 && ` (grátis acima de ${money(menu.freeDeliveryAboveCents)})`}
                        </li>
                      )}
                      {menu.deliveryEnabled && menu.deliveryArea && <li>Atendemos: {menu.deliveryArea}</li>}
                    </ul>
                  </div>
                )}

                <div className="hidden rounded-2xl bg-dark p-6 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,.5)] lg:block">
                  <h3 className="font-serif text-2xl">Seu pedido</h3>
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
                    className="btn-lime mt-5 w-full disabled:bg-panel disabled:text-muted disabled:opacity-100 disabled:shadow-none"
                    disabled={count === 0}
                    onClick={() => setDrawer('review')}
                  >
                    Ver pedido · {units} {units === 1 ? 'item' : 'itens'}
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
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-dark px-5 py-4 font-semibold text-ink shadow-[0_20px_40px_-12px_rgba(0,0,0,.55)] ring-1 ring-lime/30 transition active:scale-[.99]"
          >
            <span className="flex items-center gap-3">
              <span key={units} className="flex size-7 animate-[bump_.3s_ease-out] items-center justify-center rounded-full bg-lime text-xs text-dark">
                {units}
              </span>
              Ver pedido
            </span>
            <span className="tabular-nums">{money(subtotal)}</span>
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
          table={atTable ? seat.table : null}
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

/** Celular com conta aberta em outra mesa: não pede nesta até a equipe fechar a conta de lá. */
function TableLocked({ seat, to, bill }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="eyebrow text-lime">Mesa já em uso neste celular</p>
      <h1 className="max-w-md font-serif text-3xl">Sua conta ainda está aberta.</h1>
      <p className="max-w-sm text-sm text-muted">{seat.message}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {seat.home && (
          <Link to={to(tablePath(seat.home))} className="btn-lime">
            Voltar para a {seat.home.label ?? `mesa ${pad2(seat.home.number)}`}
          </Link>
        )}
        {bill && (
          <Link to={to(`/conta/${bill.token}`)} className="btn-outline">
            Ver minha conta
          </Link>
        )}
      </div>
    </div>
  )
}

function ProductCard({ product: p, qty, onAdd, onQty }) {
  const simple = !p.optionGroups.length
  return (
    <article
      className={`group flex min-h-[140px] overflow-hidden rounded-2xl border bg-card transition duration-300 hover:shadow-[0_18px_40px_-20px_rgba(40,30,15,.35)] ${
        qty > 0 ? 'border-olive/60' : 'border-[#e8e2d6] hover:border-[#d7cfbf]'
      }`}
    >
      {p.imageUrl && (
        <img src={p.imageUrl} alt="" loading="lazy" className="w-28 shrink-0 object-cover transition duration-500 group-hover:scale-[1.03] sm:w-36" onError={(e) => e.currentTarget.remove()} />
      )}
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <span className="eyebrow flex items-center gap-2 text-[9px] text-[#8a8274]">
          {p.category}
          {p.lastUnits && <span className="rounded-sm bg-[#f4e6dc] px-1.5 py-0.5 text-[8px] text-[#8a3f1d]">Últimas unidades</span>}
        </span>
        <h3 className="mt-2 font-serif text-[22px] leading-tight">{p.name}</h3>
        {p.description && <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-[#7a7266]">{p.description}</p>}
        {!simple && (
          <p className="mt-1.5 text-[11px] font-medium text-olive">
            {p.optionGroups.some((g) => g.minSelect > 0) ? 'Escolha as opções' : 'Com adicionais'}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between pt-3">
          <strong className="font-display text-base font-semibold">
            {!simple && <span className="mr-1 text-[11px] font-normal text-[#8a8274]">a partir de</span>}
            {money(p.priceCents)}
          </strong>
          {simple && qty > 0 ? (
            <Stepper light label={p.name} value={qty} onChange={onQty} />
          ) : (
            <div className="flex items-center gap-2">
              {qty > 0 && <span className="rounded-md bg-sage px-2 py-0.5 text-[11px] font-semibold">{qty}×</span>}
              <button
                aria-label={`Adicionar ${p.name}`}
                onClick={onAdd}
                className="flex size-9 items-center justify-center rounded-full bg-dark text-cream transition hover:bg-olive active:scale-95"
              >
                <Icon name="plus" className="size-4" strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
