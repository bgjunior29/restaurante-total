import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useToast } from '../../components/ui'
import { useTenant } from '../../lib/tenant'
import { StaffTopbar } from '../Panel'
import Coupons from './Coupons'
import DeliveryAdmin from './DeliveryAdmin'
import Identity from './Identity'
import Insights from './Insights'
import OptionGroups from './OptionGroups'
import Payments from './Payments'
import Products from './Products'
import Reports from './Reports'
import Settings from './Settings'
import Tables from './Tables'
import Team from './Team'

const TABS = [
  ['cardapio', 'Cardápio', Products],
  ['adicionais', 'Adicionais', OptionGroups],
  ['cupons', 'Cupons', Coupons],
  ['pagamentos', 'Pagamentos', Payments],
  ['mesas', 'Mesas & QR', Tables],
  ['delivery', 'Delivery', DeliveryAdmin],
  ['identidade', 'Identidade', Identity],
  ['relatorios', 'Relatórios', Reports],
  ['inteligencia', 'Inteligência', Insights],
  ['equipe', 'Equipe', Team],
  ['configuracoes', 'Configurações', Settings],
]

export default function Admin() {
  const [toast, showToast] = useToast()
  const { info, to } = useTenant()
  useEffect(() => {
    document.title = `Gestão · ${info.name}`
  }, [info.name])
  return (
    <div className="min-h-screen">
      <StaffTopbar />
      <main className="mx-auto max-w-[1200px] px-[clamp(16px,5.7vw,96px)] py-8 sm:py-12">
        <p className="eyebrow flex items-center gap-3 text-lime">
          <span className="h-px w-8 bg-lime/60" />
          Gestão · {info.name}
        </p>
        <h1 className="mt-3 font-serif text-[clamp(28px,4vw,48px)]">Tudo no seu controle.</h1>
        {/* Celular: grade de 3 colunas (todas as abas à vista); telas maiores: uma linha que quebra. */}
        <nav className="mt-6 grid grid-cols-3 gap-1 border-b border-line pb-4 sm:mt-8 sm:flex sm:flex-wrap">
          {TABS.map(([path, label]) => (
            <NavLink
              key={path}
              to={to(`/equipe/admin/${path}`)}
              className={({ isActive }) =>
                `truncate rounded-lg px-2 py-2 text-center text-[13px] font-medium transition sm:px-3.5 ${
                  isActive ? 'bg-white/[0.08] text-ink' : 'text-muted hover:bg-white/[0.04] hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8">
          <Routes>
            <Route index element={<Navigate to="cardapio" replace />} />
            {TABS.map(([path, , Page]) => (
              <Route key={path} path={path} element={<Page toast={showToast} />} />
            ))}
          </Routes>
        </div>
      </main>
      {toast}
    </div>
  )
}
