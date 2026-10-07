import { PAYMENT_KINDS } from '../../lib/format'
import SimpleCrud from './SimpleCrud'

function Fields({ form, setForm }) {
  return (
    <>
      <div>
        <label className="label">Nome que o cliente vê</label>
        <input
          className="input"
          required
          autoFocus
          maxLength={40}
          placeholder="Ex.: Cartão de débito"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Tipo</label>
        <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          {Object.entries(PAYMENT_KINDS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        {form.kind === 'PIX' && (
          <p className="mt-1 text-[11px] text-muted">A chave Pix é definida em Configurações; o cliente recebe o código copia e cola com o valor do pedido.</p>
        )}
      </div>
    </>
  )
}

function Row({ item }) {
  return (
    <>
      <p className="font-semibold">{item.name}</p>
      <p className="text-xs text-muted">{PAYMENT_KINDS[item.kind]}</p>
    </>
  )
}

export default function Payments({ toast }) {
  return (
    <SimpleCrud
      toast={toast}
      title="Formas de pagamento"
      intro="O cliente escolhe uma destas ao pedir, e o funcionário confirma na hora de marcar como pago. Os relatórios somam por forma."
      noun="Forma de pagamento"
      endpoint="/admin/payment-methods"
      empty={{ name: '', kind: 'OTHER', active: true }}
      toBody={(f) => ({ name: f.name, kind: f.kind, active: f.active, sortOrder: Number(f.sortOrder) || 0 })}
      Fields={Fields}
      Row={Row}
    />
  )
}
