import { useEffect, useState } from 'react'
import { Spinner } from '../../components/ui'
import { centsToInput, parseMoney } from '../../lib/format'
import { useTenant } from '../../lib/tenant'

const MONEY_FIELDS = ['deliveryFeeCents', 'freeDeliveryAboveCents', 'minDeliveryCents']

function Toggle({ checked, onChange, title, hint }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl bg-panel p-4">
      <span>
        <strong className="block text-sm">{title}</strong>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      <input type="checkbox" className="size-5 shrink-0 accent-lime" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-line bg-dark p-6">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export default function Settings({ toast }) {
  const { tapi, reloadInfo } = useTenant()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const fromApi = (s) => ({ ...s, ...Object.fromEntries(MONEY_FIELDS.map((k) => [k, centsToInput(s[k])])) })

  useEffect(() => {
    tapi('/admin/settings')
      .then((s) => setForm(fromApi(s)))
      .catch((e) => toast(e.message, 'error'))
  }, [tapi, toast])

  if (!form) return <Spinner />
  const set = (k) => (v) => setForm({ ...form, [k]: v?.target ? v.target.value : v })

  async function save(e) {
    e.preventDefault()
    const body = { ...form, publicUrl: form.publicUrl.trim() }
    for (const k of MONEY_FIELDS) {
      body[k] = parseMoney(form[k] || '0')
      if (!Number.isFinite(body[k]) || body[k] < 0) return toast('Confira os valores em R$.', 'error')
    }
    for (const k of ['serviceFeePct', 'lateAfterMin', 'prepTimeMin', 'deliveryTimeMin']) body[k] = Number(form[k]) || 0
    setSaving(true)
    try {
      setForm(fromApi(await tapi('/admin/settings', { method: 'PUT', body })))
      reloadInfo()
      toast('Configurações salvas.')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="grid max-w-5xl gap-5 lg:grid-cols-2">
      <Section title="Salão e pedidos">
        <Toggle
          checked={form.ordersOpen}
          onChange={set('ordersOpen')}
          title="Receber pedidos pelo cardápio"
          hint="Desligue ao fechar o restaurante ou em horários de pico."
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Taxa de serviço (%)</label>
            <input className="input" type="number" min={0} max={30} value={form.serviceFeePct} onChange={set('serviceFeePct')} />
            <p className="mt-1 text-[11px] text-muted">Sugerida na conta da mesa. 0 = sem taxa.</p>
          </div>
          <div>
            <label className="label">Pedido atrasado após (min)</label>
            <input className="input" type="number" min={5} max={180} value={form.lateAfterMin} onChange={set('lateAfterMin')} />
            <p className="mt-1 text-[11px] text-muted">Destaca na cozinha e no painel.</p>
          </div>
        </div>
        <div>
          <label className="label">Prefixo dos pedidos</label>
          <input className="input w-32 uppercase" required maxLength={6} pattern="[A-Za-z0-9]+" value={form.orderPrefix} onChange={set('orderPrefix')} />
          <p className="mt-1.5 text-[11px] text-muted">
            Os pedidos saem como {form.orderPrefix.toUpperCase() || 'RT'}-1043, {form.orderPrefix.toUpperCase() || 'RT'}-1044… A numeração continua de onde
            parou.
          </p>
        </div>
        <div>
          <label className="label">Endereço público do cardápio (usado nos QR codes e nos links do WhatsApp)</label>
          <input className="input" maxLength={200} placeholder="Ex.: https://seu-restaurante.vercel.app" value={form.publicUrl} onChange={set('publicUrl')} />
          <p className="mt-1.5 text-[11px] text-muted">Só o domínio, sem /r/…. Vazio = usa o endereço atual do navegador.</p>
        </div>
      </Section>

      <Section title="Retirada e delivery">
        <Toggle checked={form.pickupEnabled} onChange={set('pickupEnabled')} title="Pedidos para retirada" hint="O cliente pede e busca no balcão." />
        <Toggle checked={form.deliveryEnabled} onChange={set('deliveryEnabled')} title="Delivery" hint="Endereço com busca por CEP, taxa e troco." />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Pronto para retirada em (min)</label>
            <input className="input" type="number" min={5} value={form.prepTimeMin} onChange={set('prepTimeMin')} />
          </div>
          <div>
            <label className="label">Entrega em (min)</label>
            <input className="input" type="number" min={10} value={form.deliveryTimeMin} onChange={set('deliveryTimeMin')} />
          </div>
          <div>
            <label className="label">Taxa de entrega (R$)</label>
            <input className="input" inputMode="decimal" value={form.deliveryFeeCents} onChange={set('deliveryFeeCents')} />
          </div>
          <div>
            <label className="label">Entrega grátis acima de (R$)</label>
            <input className="input" inputMode="decimal" value={form.freeDeliveryAboveCents} onChange={set('freeDeliveryAboveCents')} />
          </div>
          <div>
            <label className="label">Pedido mínimo delivery (R$)</label>
            <input className="input" inputMode="decimal" value={form.minDeliveryCents} onChange={set('minDeliveryCents')} />
          </div>
        </div>
        <p className="-mt-2 text-[11px] text-muted">R$ 0,00 em "grátis acima de" ou "pedido mínimo" desliga a regra.</p>
        <div>
          <label className="label">Região atendida (mostrada ao cliente)</label>
          <input className="input" maxLength={300} placeholder="Ex.: Centro, Jardins e Vila Nova" value={form.deliveryArea} onChange={set('deliveryArea')} />
        </div>
      </Section>

      <Section title="Pagamento e WhatsApp">
        <div>
          <label className="label">Chave Pix (mostrada ao cliente que escolher uma forma do tipo Pix)</label>
          <input className="input" maxLength={120} placeholder="CNPJ, e-mail, telefone ou chave aleatória" value={form.pixKey} onChange={set('pixKey')} />
        </div>
        <Toggle
          checked={form.notifyWhatsapp}
          onChange={set('notifyWhatsapp')}
          title="Avisar clientes pelo WhatsApp automaticamente"
          hint="Retirada e delivery recebem cada mudança de status. Precisa da API do WhatsApp configurada no servidor; sem ela, use o botão WhatsApp de cada pedido."
        />
      </Section>

      <div className="lg:col-span-2">
        <button className="btn-lime" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>
    </form>
  )
}
