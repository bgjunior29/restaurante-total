import { useEffect, useState } from 'react'
import IdentityForm from '../../components/IdentityForm'
import { Spinner } from '../../components/ui'
import { useTenant } from '../../lib/tenant'

export default function Identity({ toast }) {
  const { tapi, reloadInfo } = useTenant()
  const [initial, setInitial] = useState(null)

  useEffect(() => {
    tapi('/admin/identity')
      .then(setInitial)
      .catch((e) => toast(e.message, 'error'))
  }, [tapi, toast])

  if (!initial) return <Spinner />

  async function save(values) {
    try {
      const saved = await tapi('/admin/identity', { method: 'PUT', body: values })
      await reloadInfo() // aplica o tema e a cor novos no sistema inteiro
      toast('Identidade salva. O cardápio já mostra as mudanças.')
      return saved
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return <IdentityForm initial={initial} onSave={save} />
}
