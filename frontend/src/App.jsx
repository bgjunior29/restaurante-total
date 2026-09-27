import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from './components/ui'
import { AuthProvider, homeFor, useAuth } from './lib/auth'
import { TenantLayout, useTenant } from './lib/tenant'
import Admin from './pages/admin/Admin'
import Bill from './pages/Bill'
import Customer from './pages/Customer'
import Floor from './pages/Floor'
import Kitchen from './pages/Kitchen'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Panel from './pages/Panel'
import Platform from './pages/platform/Platform'
import PlatformLogin from './pages/platform/PlatformLogin'
import Track from './pages/Track'

/** Área da equipe. `roles` limita quem entra; cozinha só vê a tela da cozinha. */
function RequireStaff({ roles, children }) {
  const { user, loading } = useAuth()
  const { to } = useTenant()
  if (loading) return <Spinner />
  if (!user) return <Navigate to={to('/equipe/login')} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={to(homeFor(user))} replace />
  return children
}

function RequirePlatform({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/plataforma/login" replace />
  return children
}

function PlatformArea({ children }) {
  return (
    <AuthProvider scope="platform" base="/platform">
      {children}
    </AuthProvider>
  )
}

const FLOOR = ['ADMIN', 'STAFF']

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/r/:slug" element={<TenantLayout />}>
        <Route index element={<Customer />} />
        <Route path="mesa/:numero" element={<Customer />} />
        <Route path="pedido/:token" element={<Track />} />
        <Route path="conta/:token" element={<Bill />} />
        <Route path="equipe/login" element={<Login />} />
        <Route
          path="equipe"
          element={
            <RequireStaff roles={FLOOR}>
              <Panel />
            </RequireStaff>
          }
        />
        <Route
          path="equipe/salao"
          element={
            <RequireStaff roles={FLOOR}>
              <Floor />
            </RequireStaff>
          }
        />
        <Route
          path="equipe/cozinha"
          element={
            <RequireStaff>
              <Kitchen />
            </RequireStaff>
          }
        />
        <Route
          path="equipe/admin/*"
          element={
            <RequireStaff roles={['ADMIN']}>
              <Admin />
            </RequireStaff>
          }
        />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>

      <Route
        path="/plataforma/login"
        element={
          <PlatformArea>
            <PlatformLogin />
          </PlatformArea>
        }
      />
      <Route
        path="/plataforma/*"
        element={
          <PlatformArea>
            <RequirePlatform>
              <Platform />
            </RequirePlatform>
          </PlatformArea>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
