import { useEffect, useRef, useState } from 'react'
import { money, ORDER_TYPES, parseMoney, validPhone } from '../lib/format'
import { load, save } from '../lib/storage'
import { Stepper } from './ui'
import Icon from './Icon'

const CUSTOMER_KEY = 'rt_customer' // nome, telefone e endereço lembrados neste aparelho

/** Busca o endereço pelo CEP (ViaCEP, gratuito e sem chave — mesma integração do sistema de delivery). */
async function lookupCep(cep) {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  const data = await res.json()
  return data.erro ? null : data
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-xs font-semibold ${className}`}>
      {label}
      {children}
    </label>
  )
}

export default function CheckoutDrawer({
  step,
  setStep,
  menu,
  tapi,
  table, // mesa do QR { number, label, key } ou null
  lines,
  setLineQty,
  subtotal,
  suggestions,
  onSuggest,
  sessionToken,
  onDone,
  onStale,
  showToast,
}) {
  const saved = load(CUSTOMER_KEY, {})
  // Mesa e delivery não se misturam: com o QR o pedido vai para a conta da mesa; pelo link, é delivery ou retirada.
  const types = table ? ['MESA'] : [menu.deliveryEnabled && 'DELIVERY', menu.pickupEnabled && 'RETIRADA'].filter(Boolean)
  const atTable = Boolean(table)
  const [type, setType] = useState(() => (atTable || !types.includes(saved.type) ? types[0] : saved.type) || 'MESA')
  const [name, setName] = useState(saved.name || '')
  const [phone, setPhone] = useState(saved.phone || '')
  const [cep, setCep] = useState(saved.cep || '')
  const [street, setStreet] = useState(saved.street || '')
  const [number, setNumber] = useState(saved.number || '')
  const [district, setDistrict] = useState(saved.district || '')
  const [city, setCity] = useState(saved.city || '')
  const [addressRef, setAddressRef] = useState(saved.addressRef || '')
  const [notes, setNotes] = useState('')
  const [website, setWebsite] = useState('') // campo-isca: invisível para pessoas, robôs preenchem
  const [paymentId, setPaymentId] = useState(() => menu.paymentMethods[0]?.id ?? null)
  const [changeFor, setChangeFor] = useState('')
  const [couponText, setCouponText] = useState('')
  const [coupon, setCoupon] = useState(null) // { code, discountCents }
  const [sending, setSending] = useState(false)
  const [cepBusy, setCepBusy] = useState(false)
  const panel = useRef(null)
  const empty = lines.length === 0
  const payment = menu.paymentMethods.find((m) => m.id === paymentId)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setStep(null)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [setStep])

  // Cada etapa começa do topo, com o foco dentro do painel (teclado e leitor de tela).
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 })
    panel.current?.focus({ preventScroll: true })
  }, [step])

  // Cupom vale para o subtotal em que foi validado: mudou o pedido, valida de novo.
  useEffect(() => setCoupon(null), [subtotal])

  const discount = coupon?.discountCents || 0
  const freeDelivery = menu.freeDeliveryAboveCents > 0 && subtotal >= menu.freeDeliveryAboveCents
  const fee = type === 'DELIVERY' && !freeDelivery ? menu.deliveryFeeCents : 0
  const total = subtotal - discount + fee
  const belowMin = type === 'DELIVERY' && subtotal < menu.minDeliveryCents
  const phoneOk = validPhone(phone)
  const addressOk = street.trim().length > 2 && number.trim() && district.trim()
  const missing =
    type === 'MESA'
      ? !table && 'Escaneie o QR code da sua mesa para pedir nela.'
      : name.trim().length < 2
        ? 'Informe seu nome.'
        : !phoneOk
          ? 'Informe um telefone válido com DDD, ex.: (11) 98888-7777.'
          : type === 'DELIVERY' && !addressOk
            ? 'Complete o endereço de entrega.'
            : belowMin
              ? `Pedido mínimo para delivery: ${money(menu.minDeliveryCents)}.`
              : !paymentId && 'Escolha a forma de pagamento.'

  async function onCep(value) {
    setCep(value)
    if (value.replace(/\D/g, '').length !== 8) return
    setCepBusy(true)
    try {
      const data = await lookupCep(value)
      if (!data) return showToast('CEP não encontrado. Preencha o endereço manualmente.', 'error')
      setStreet(data.logradouro || '')
      setDistrict(data.bairro || '')
      setCity(data.localidade ? `${data.localidade}/${data.uf}` : '')
    } catch {
      showToast('Não deu para buscar o CEP agora. Preencha o endereço manualmente.', 'error')
    } finally {
      setCepBusy(false)
    }
  }

  async function applyCoupon() {
    if (!couponText.trim()) return
    try {
      const c = await tapi('/coupons/check', { method: 'POST', body: { code: couponText, subtotalCents: subtotal } })
      setCoupon(c)
      showToast(`Cupom ${c.code} aplicado: − ${money(c.discountCents)}`)
    } catch (e) {
      setCoupon(null)
      showToast(e.message, 'error')
    }
  }

  async function confirm() {
    setSending(true)
    const address = [
      [street.trim(), number.trim()].filter(Boolean).join(', '),
      district.trim(),
      city.trim(),
      cep.trim() && `CEP ${cep.trim()}`,
    ]
      .filter(Boolean)
      .join(' - ')
    save(CUSTOMER_KEY, { type, name, phone, cep, street, number, district, city, addressRef })
    const changeCents = payment?.kind === 'CASH' && type === 'DELIVERY' && changeFor ? parseMoney(changeFor) : 0
    try {
      const order = await tapi('/orders', {
        method: 'POST',
        body: {
          type,
          tableNumber: type === 'MESA' ? table.number : null,
          tableKey: type === 'MESA' ? table.key : '',
          sessionToken: type === 'MESA' ? sessionToken : null,
          customerName: name,
          customerPhone: type === 'MESA' ? '' : phone,
          address: type === 'DELIVERY' ? address : '',
          addressRef: type === 'DELIVERY' ? addressRef : '',
          notes,
          paymentMethodId: type === 'MESA' ? null : paymentId,
          changeForCents: Number.isFinite(changeCents) ? changeCents : 0,
          couponCode: coupon?.code || '',
          website,
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, optionIds: l.optionIds })),
        },
      })
      onDone(order)
    } catch (e) {
      showToast(e.message, 'error')
      // Algo mudou (item esgotou, mesa desativada, pedidos pausados): recarrega o cardápio atual.
      if (e.status === 400 || e.status === 409) onStale()
    } finally {
      setSending(false)
    }
  }

  const where = type === 'MESA' ? (table?.label ?? 'Mesa') : ORDER_TYPES[type].label

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Fechar" tabIndex={-1} className="absolute inset-0 animate-[fade-in_.2s_ease-out] bg-black/60" onClick={() => setStep(null)} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={step === 'review' ? 'Seu pedido' : 'Finalizar pedido'}
        className="relative flex h-full w-full max-w-[450px] animate-[slide-in_.25s_ease-out] flex-col overflow-y-auto bg-cream p-6 pb-[max(24px,env(safe-area-inset-bottom))] text-dark outline-none"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow text-[10px] text-olive">
              {step === 'review' ? 'Etapa 1 de 2' : 'Etapa 2 de 2'} · {where}
            </p>
            <h2 className="mt-1 font-serif text-3xl">{step === 'review' ? 'Seu pedido.' : 'Quase lá.'}</h2>
          </div>
          <button
            aria-label="Fechar"
            onClick={() => setStep(null)}
            className="flex size-9 items-center justify-center rounded-full border border-[#cfcab5] bg-card text-sm"
          >
            ✕
          </button>
        </div>

        {step === 'review' ? (
          <>
            <p className="mt-6 text-xs text-[#5d6558]">Confira seus itens antes de continuar.</p>
            <ul className="mt-3 divide-y divide-[#dcd8c6]">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{l.name}</p>
                    {l.details && <p className="text-xs text-olive">{l.details}</p>}
                    <p className="text-xs text-[#6b7266]">
                      {money(l.unit)} cada · <strong>{money(l.unit * l.quantity)}</strong>
                    </p>
                  </div>
                  <Stepper light label={l.name} value={l.quantity} onChange={(q) => setLineQty(l.key, q)} />
                </li>
              ))}
            </ul>
            {empty && <p className="py-6 text-sm text-[#6b7266]">Seu pedido está vazio.</p>}

            {suggestions.length > 0 && (
              <div className="mt-4 rounded-2xl border border-[#dcd8c6] bg-card p-4">
                <p className="eyebrow text-[9px] text-olive">Combina com seu pedido</p>
                <ul className="mt-2 space-y-2">
                  {suggestions.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {p.name} <span className="text-xs text-[#6b7266]">· {money(p.priceCents)}</span>
                      </span>
                      <button onClick={() => onSuggest(p)} className="shrink-0 rounded-full bg-dark px-3 py-1 text-xs font-medium text-cream">
                        + Adicionar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex justify-between rounded-2xl bg-sage p-5 font-display text-lg font-semibold">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <button className="btn-lime mt-5 w-full" disabled={empty} onClick={() => setStep('checkout')}>
              Continuar →
            </button>
            <button onClick={() => setStep(null)} className="mt-3 self-center text-xs font-semibold text-olive underline-offset-4 hover:underline">
              Adicionar mais itens
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setStep('review')} className="mt-5 self-start text-xs font-semibold text-olive underline">
              ← Voltar ao pedido
            </button>

            {types.length > 1 && (
              <>
                <p className="mt-5 text-xs font-semibold">Como você quer receber?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {types.map((t) => (
                    <button
                      key={t}
                      aria-pressed={type === t}
                      onClick={() => setType(t)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition ${
                        type === t ? 'border-dark bg-dark text-cream [&_svg]:text-cream' : 'border-[#e2dccf] bg-card hover:border-[#b9b1a2]'
                      }`}
                    >
                      <Icon name={ORDER_TYPES[t].icon} className="size-5 text-olive" />
                      {ORDER_TYPES[t].short}
                    </button>
                  ))}
                </div>
              </>
            )}

            <Field label={type === 'MESA' ? 'Seu nome (opcional)' : 'Seu nome'} className="mt-5">
              <input className="input-light mt-2" placeholder="Ex.: Ana" maxLength={60} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            {type !== 'MESA' && (
              <Field label="Telefone / WhatsApp (avisamos sobre o pedido)" className="mt-4">
                <input
                  className="input-light mt-2"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 98888-7777"
                  maxLength={20}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
            )}

            {type === 'DELIVERY' && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Field label={cepBusy ? 'CEP (buscando…)' : 'CEP'}>
                  <input className="input-light mt-2 px-3" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" maxLength={9} value={cep} onChange={(e) => onCep(e.target.value)} />
                </Field>
                <Field label="Rua" className="col-span-2">
                  <input className="input-light mt-2" autoComplete="address-line1" maxLength={100} value={street} onChange={(e) => setStreet(e.target.value)} />
                </Field>
                <Field label="Número">
                  <input className="input-light mt-2" maxLength={10} value={number} onChange={(e) => setNumber(e.target.value)} />
                </Field>
                <Field label="Bairro" className="col-span-2">
                  <input className="input-light mt-2" maxLength={60} value={district} onChange={(e) => setDistrict(e.target.value)} />
                </Field>
                <Field label="Cidade" className="col-span-3">
                  <input className="input-light mt-2" autoComplete="address-level2" maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} />
                </Field>
                <Field label="Complemento / referência" className="col-span-3">
                  <input className="input-light mt-2" maxLength={120} placeholder="Apto 12, portão azul…" value={addressRef} onChange={(e) => setAddressRef(e.target.value)} />
                </Field>
                {menu.deliveryArea && <p className="col-span-3 text-[11px] text-[#5d6558]">Atendemos: {menu.deliveryArea}</p>}
              </div>
            )}

            <input
              type="text"
              name="nao-preencha"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="pointer-events-none absolute size-px overflow-hidden opacity-0"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />

            <Field label="Observações (opcional)" className="mt-4">
              <textarea
                className="input-light mt-2 resize-none"
                rows={2}
                maxLength={300}
                placeholder="Ex.: sem cebola, molho à parte"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            {type === 'MESA' ? (
              <p className="mt-4 rounded-xl border border-[#d7d5c4] bg-card px-4 py-3 text-xs leading-relaxed text-[#5d6558]">
                <Icon name="receipt" className="mr-1.5 size-[1.1em] text-olive" />
                Este pedido entra na <strong>conta da mesa</strong>. Você paga tudo no final
                {menu.serviceFeePct > 0 && <> (taxa de serviço de {menu.serviceFeePct}%)</>}: pela conta no celular você paga com Pix, ou em dinheiro no balcão.
              </p>
            ) : (
              <>
                <p className="mt-4 text-xs font-semibold">Forma de pagamento</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {menu.paymentMethods.map((m) => (
                    <button
                      key={m.id}
                      aria-pressed={paymentId === m.id}
                      onClick={() => setPaymentId(m.id)}
                      className={`rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                        paymentId === m.id ? 'border-olive bg-sage' : 'border-[#d7d5c4] bg-card hover:border-olive'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
                {payment?.kind === 'PIX' && (
                  <p className="mt-3 rounded-xl border border-[#d7d5c4] bg-card px-4 py-3 text-xs leading-relaxed text-[#5d6558]">
                    <Icon name="receipt" className="mr-1.5 size-[1.1em] text-olive" />
                    Ao confirmar, geramos o <strong>código Pix copia e cola</strong> e o QR code com o valor exato do pedido.
                  </p>
                )}
                {payment?.kind === 'CASH' && (
                  <p className="mt-3 rounded-xl border border-[#d7d5c4] bg-card px-4 py-3 text-xs leading-relaxed text-[#5d6558]">
                    <Icon name="receipt" className="mr-1.5 size-[1.1em] text-olive" />
                    {type === 'DELIVERY' ? (
                      <>Pague em <strong>dinheiro ao entregador</strong>, na entrega.</>
                    ) : (
                      <>Pague em <strong>dinheiro no balcão</strong>, ao retirar o pedido.</>
                    )}
                  </p>
                )}
                {payment?.kind === 'CASH' && type === 'DELIVERY' && (
                  <Field label="Troco para quanto? (opcional)" className="mt-3">
                    <input className="input-light mt-2" inputMode="decimal" placeholder="Ex.: 100,00" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} />
                  </Field>
                )}
              </>
            )}

            <div className="mt-4 flex gap-2">
              <input
                className="input-light uppercase"
                aria-label="Cupom de desconto"
                placeholder="Cupom de desconto"
                maxLength={30}
                value={couponText}
                onChange={(e) => setCouponText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
              />
              <button type="button" onClick={applyCoupon} className="shrink-0 rounded-xl bg-dark px-4 text-xs font-semibold text-ink">
                Aplicar
              </button>
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-sage p-5 text-xs">
              <div className="flex justify-between">
                <span>Produtos</span>
                <strong>{money(subtotal)}</strong>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-olive">
                  <span>Cupom {coupon.code}</span>
                  <strong>− {money(discount)}</strong>
                </div>
              )}
              {type === 'DELIVERY' && (
                <div className="flex justify-between">
                  <span>Entrega</span>
                  <strong>{fee ? money(fee) : 'Grátis'}</strong>
                </div>
              )}
              <div className="flex justify-between border-t border-[#c7cdb4] pt-3 font-display text-lg font-semibold">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
              {type !== 'MESA' && (
                <p className="text-[11px] text-[#5d6558]">
                  {type === 'DELIVERY' ? `Chega em ~${menu.deliveryTimeMin} min.` : `Fica pronto em ~${menu.prepTimeMin} min.`}
                </p>
              )}
            </div>
            <button className="btn-lime mt-5 w-full" disabled={sending || empty || !menu.ordersOpen || Boolean(missing)} onClick={confirm}>
              {sending ? 'Enviando…' : `Confirmar pedido · ${money(total)} →`}
            </button>
            <p className="mt-2 text-center text-[10px] text-[#5d6558]">
              Ao confirmar, você concorda com os{' '}
              <a href="/termos" target="_blank" rel="noreferrer" className="underline">termos</a> e a{' '}
              <a href="/privacidade" target="_blank" rel="noreferrer" className="underline">política de privacidade</a>.
            </p>
            {!menu.ordersOpen && <p className="mt-2 text-xs text-red-800">Pedidos pausados no momento.</p>}
            {menu.ordersOpen && missing && <p className="mt-2 text-xs text-[#6b2f12]">{missing}</p>}
          </>
        )}
      </div>
    </div>
  )
}
