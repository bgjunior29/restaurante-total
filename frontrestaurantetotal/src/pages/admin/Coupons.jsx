import { centsToInput, money, parseMoney } from '../../lib/format'
import SimpleCrud from './SimpleCrud'

// O servidor guarda o fim do dia escolhido (meia-noite do dia seguinte); 1 ms antes é o próprio dia.
const lastDay = (iso) => new Date(new Date(iso).getTime() - 1)

function Fields({ form, setForm }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <>
      <div>
        <label className="label">Código</label>
        <input
          className="input uppercase"
          required
          autoFocus
          minLength={3}
          maxLength={30}
          pattern="[A-Za-z0-9_\-]+"
          placeholder="Ex.: ALMOCO15"
          value={form.name}
          onChange={set('name')}
        />
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={form.kind} onChange={set('kind')}>
            <option value="PERCENT">%</option>
            <option value="FIXED">R$</option>
          </select>
        </div>
        <div>
          <label className="label">{form.kind === 'PERCENT' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
          <input className="input" required inputMode="decimal" value={form.value} onChange={set('value')} />
        </div>
      </div>
      <div>
        <label className="label">Pedido mínimo (R$, opcional)</label>
        <input className="input" inputMode="decimal" value={form.minOrder} onChange={set('minOrder')} />
      </div>
      <div>
        <label className="label">Limite de usos (opcional)</label>
        <input className="input" type="number" min={1} placeholder="Ilimitado" value={form.maxUses} onChange={set('maxUses')} />
      </div>
      <div>
        <label className="label">Válido até (opcional)</label>
        <input className="input [color-scheme:dark]" type="date" value={form.validUntil} onChange={set('validUntil')} />
      </div>
      <p className="self-end pb-3 text-[11px] text-muted">
        Vale para mesa, retirada e delivery. Pedido cancelado não conta como uso. O desconto não inclui a taxa de entrega.
      </p>
    </>
  )
}

function Row({ item }) {
  const rules = [
    item.minOrderCents > 0 && `mínimo ${money(item.minOrderCents)}`,
    item.maxUses && `${item.uses}/${item.maxUses} usos`,
    !item.maxUses && `${item.uses} uso${item.uses === 1 ? '' : 's'}`,
    item.validUntil && `até ${lastDay(item.validUntil).toLocaleDateString('pt-BR')}`,
  ].filter(Boolean)
  const expired = item.validUntil && new Date(item.validUntil) < new Date()
  return (
    <>
      <p className="font-mono font-semibold tracking-wider">
        {item.code}{' '}
        <span className="ml-2 font-sans text-lime">{item.kind === 'PERCENT' ? `${item.value}%` : money(item.value)} off</span>
        {expired && <span className="ml-2 font-sans text-xs text-red-300">expirado</span>}
      </p>
      <p className="text-xs text-muted">{rules.join(' · ')}</p>
    </>
  )
}

export default function Coupons({ toast }) {
  return (
    <SimpleCrud
      toast={toast}
      title="Cupons de desconto"
      intro="Crie cupons para campanhas, primeira compra ou horários fracos. A Inteligência sugere quando vale a pena."
      noun="Cupom"
      endpoint="/admin/coupons"
      empty={{ name: '', kind: 'PERCENT', value: '10', minOrder: '', maxUses: '', validUntil: '', active: true }}
      toForm={(c) => ({
        id: c.id,
        name: c.code,
        kind: c.kind,
        value: c.kind === 'PERCENT' ? String(c.value) : centsToInput(c.value),
        minOrder: c.minOrderCents ? centsToInput(c.minOrderCents) : '',
        maxUses: c.maxUses ?? '',
        validUntil: c.validUntil ? lastDay(c.validUntil).toLocaleDateString('en-CA') : '',
        active: c.active,
      })}
      toBody={(f) => {
        const value = f.kind === 'PERCENT' ? Number(f.value) : parseMoney(f.value)
        if (!Number.isFinite(value) || value <= 0) throw new Error('Valor do desconto inválido.')
        const minOrderCents = f.minOrder ? parseMoney(f.minOrder) : 0
        if (!Number.isFinite(minOrderCents)) throw new Error('Pedido mínimo inválido.')
        return {
          code: f.name.trim(),
          kind: f.kind,
          value: Math.round(value),
          minOrderCents,
          maxUses: f.maxUses ? Number(f.maxUses) : null,
          validUntil: f.validUntil || null,
          active: f.active,
        }
      }}
      Fields={Fields}
      Row={Row}
    />
  )
}
