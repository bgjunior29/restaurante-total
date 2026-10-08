import { useState } from 'react'
import { money } from '../lib/format'
import Icon from './Icon'
import { Stepper } from './ui'

/**
 * Sacola do cliente (mesma no delivery e na mesa): itens com foto, editar/remover, totais, cupom e "Continuar pedido".
 * Usada na lateral do cardápio (computador) e na primeira etapa da gaveta do pedido (celular).
 *
 * `table` = rótulo da mesa (pedido do QR) ou null (delivery/retirada).
 * `coupon` = { code, discountCents } já validado; `onApplyCoupon(code)` valida e lança erro com a mensagem.
 */
export default function CartSummary({
  menu,
  title,
  table,
  lines,
  products,
  subtotal,
  coupon,
  onApplyCoupon,
  onRemoveCoupon,
  onQty,
  onEdit,
  onClear,
  onAddMore,
  onContinue,
  suggestions = [],
  onSuggest,
}) {
  const [couponOpen, setCouponOpen] = useState(false)
  const [couponText, setCouponText] = useState('')
  const [couponError, setCouponError] = useState('')
  const [checking, setChecking] = useState(false)
  const empty = lines.length === 0
  const units = lines.reduce((s, l) => s + l.quantity, 0)

  // Delivery: a taxa já aparece aqui (estimada; se a pessoa escolher retirada, some no próximo passo).
  const showFee = !table && menu.deliveryEnabled
  const freeAbove = menu.freeDeliveryAboveCents
  const free = freeAbove > 0 && subtotal >= freeAbove
  const fee = showFee && !free ? menu.deliveryFeeCents : 0
  const discount = coupon?.discountCents || 0
  const total = Math.max(0, subtotal - discount) + fee

  async function apply(e) {
    e?.preventDefault()
    if (!couponText.trim()) return
    setChecking(true)
    setCouponError('')
    try {
      await onApplyCoupon(couponText)
      setCouponOpen(false)
      setCouponText('')
    } catch (err) {
      setCouponError(err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e2dccf] bg-card text-dark">
      {title && <h3 className="border-b border-[#ece6da] px-5 py-4 text-center font-serif text-xl">{title}</h3>}

      {/* Como o pedido chega: entrega (taxa e frete grátis) ou conta da mesa. */}
      <div className="flex items-center gap-3 border-b border-[#ece6da] px-5 py-3.5 text-xs">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage text-olive">
          <Icon name={table ? 'utensils' : menu.deliveryEnabled ? 'pin' : 'bag'} className="size-4" />
        </span>
        <span className="min-w-0 flex-1 leading-snug">
          {table ? (
            <>
              <strong className="block text-[13px]">{table}</strong>
              Tudo vai para a conta da mesa
            </>
          ) : menu.deliveryEnabled ? (
            <>
              <strong className="block text-[13px]">
                Entrega em ~{menu.deliveryTimeMin} min · {fee ? `taxa ${money(fee)}` : 'entrega grátis'}
              </strong>
              {freeAbove > 0 && !free && !empty
                ? `Faltam ${money(freeAbove - subtotal)} para a entrega grátis`
                : menu.pickupEnabled
                  ? `Ou retire no balcão em ~${menu.prepTimeMin} min`
                  : menu.deliveryArea && `Atendemos: ${menu.deliveryArea}`}
            </>
          ) : (
            <>
              <strong className="block text-[13px]">Retirada no balcão</strong>
              Pronto em ~{menu.prepTimeMin} min
            </>
          )}
        </span>
      </div>

      <div className="bg-cream/70 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Sua sacola</span>
          {!empty && (
            <button type="button" onClick={onClear} className="text-[11px] font-semibold tracking-wider text-[#8a3f1d] hover:underline">
              LIMPAR
            </button>
          )}
        </div>

        {empty ? (
          <p className="py-6 text-center text-xs text-[#6b7266]">Sua sacola está vazia. Escolha algo no cardápio.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#e6e0d3] rounded-xl border border-[#e6e0d3] bg-card">
            {lines.map((l) => {
              const p = products[l.productId]
              return (
                <li key={l.key} className="flex gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug font-semibold">
                      {l.quantity}x {l.name}
                    </p>
                    {l.details && <p className="mt-0.5 text-xs text-olive">{l.details}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <Stepper light label={l.name} value={l.quantity} onChange={(q) => onQty(l.key, q)} />
                      <span className="flex gap-3 text-xs font-semibold">
                        {p?.optionGroups.length > 0 && (
                          <button type="button" className="text-olive hover:underline" onClick={() => onEdit(l)}>
                            Editar
                          </button>
                        )}
                        <button type="button" className="text-[#8a3f1d] hover:underline" onClick={() => onQty(l.key, 0)}>
                          Remover
                        </button>
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-sm font-semibold tabular-nums">{money(l.unit * l.quantity)}</span>
                    {p?.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={l.name}
                        loading="lazy"
                        className="size-14 rounded-lg bg-[#efe9dd] object-cover"
                        onError={(e) => e.currentTarget.remove()}
                      />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!empty && suggestions.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#e6e0d3] bg-card p-3">
            <p className="eyebrow text-[9px] text-olive">Combina com seu pedido</p>
            <ul className="mt-2 space-y-2">
              {suggestions.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    {p.name} <span className="text-xs text-[#6b7266]">· {money(p.priceCents)}</span>
                  </span>
                  <button type="button" onClick={() => onSuggest(p)} className="shrink-0 rounded-full bg-dark px-3 py-1 text-xs font-medium text-cream">
                    + Adicionar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="button" onClick={onAddMore} className="mt-3 w-full text-center text-xs font-semibold text-olive hover:underline">
          Adicionar mais itens
        </button>
      </div>

      <div className="space-y-2 border-t border-[#ece6da] px-5 py-4 text-sm">
        <div className="flex justify-between text-[#6b7266]">
          <span>Subtotal</span>
          <span className="tabular-nums">{money(subtotal)}</span>
        </div>
        {showFee && (
          <div className="flex justify-between text-[#6b7266]">
            <span>Taxa de entrega</span>
            <span className="tabular-nums">{fee ? money(fee) : 'Grátis'}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-olive">
            <span>
              Cupom {coupon.code}{' '}
              <button type="button" className="text-[11px] text-[#8a3f1d] underline" onClick={onRemoveCoupon}>
                tirar
              </button>
            </span>
            <span className="tabular-nums">− {money(discount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 font-display text-lg font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{money(total)}</span>
        </div>
        {showFee && menu.pickupEnabled && <p className="text-[11px] text-[#8a8274]">Escolhendo retirada no próximo passo, a taxa de entrega sai.</p>}
        {table && menu.serviceFeePct > 0 && <p className="text-[11px] text-[#8a8274]">Taxa de serviço de {menu.serviceFeePct}% sugerida no fechamento da conta.</p>}
      </div>

      {!empty && !coupon && (
        <div className="border-t border-[#ece6da] px-5 py-3">
          {couponOpen ? (
            <form onSubmit={apply}>
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="input-light uppercase"
                  aria-label="Código do cupom"
                  placeholder="Código do cupom"
                  maxLength={30}
                  value={couponText}
                  onChange={(e) => setCouponText(e.target.value)}
                />
                <button className="shrink-0 rounded-xl bg-dark px-4 text-xs font-semibold text-ink" disabled={checking}>
                  {checking ? '…' : 'Aplicar'}
                </button>
              </div>
              {couponError && <p className="mt-2 text-xs text-[#8a3f1d]">{couponError}</p>}
            </form>
          ) : (
            <button type="button" onClick={() => setCouponOpen(true)} className="flex w-full items-center gap-3 text-left">
              <Icon name="receipt" className="size-5 text-olive" />
              <span className="flex-1">
                <strong className="block text-sm">Tem um cupom?</strong>
                <span className="text-xs text-[#6b7266]">Clique e insira o código</span>
              </span>
              <Icon name="arrow" className="size-4 text-[#8a8274]" />
            </button>
          )}
        </div>
      )}

      <div className="border-t border-[#ece6da] p-4">
        <button className="btn-lime w-full" disabled={empty} onClick={onContinue}>
          Continuar pedido{!empty && ` · ${units} ${units === 1 ? 'item' : 'itens'}`}
        </button>
      </div>
    </div>
  )
}
