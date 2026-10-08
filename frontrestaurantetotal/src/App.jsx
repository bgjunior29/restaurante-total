import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from './components/ui'
import { AuthProvider, homeFor, useAuth } from './lib/auth'
import { TenantLayout, useTenant } from './lib/tenant'
import Bill from './pages/Bill'
import Customer from './pages/Customer'
import Track from './pages/Track'

// O cliente que abre o QR baixa só o cardápio; equipe, gestão, plataforma e páginas do site vêm sob demanda.
const Admin = lazy(() => import('./pages/admin/Admin'))
const Delivery = lazy(() => import('./pages/Delivery'))
const Floor = lazy(() => import('./pages/Floor'))
const Kitchen = lazy(() => import('./pages/Kitchen'))
const Landing = lazy(() => import('./pages/Landing'))
const Terms = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Terms })))
const Privacy = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Privacy })))
const RestaurantTerms = lazy(() => import('./pages/Legal').then((m) => ({ default: m.RestaurantTerms })))
const RestaurantPrivacy = lazy(() => import('./pages/Legal').then((m) => ({ default: m.RestaurantPrivacy })))
const Login = lazy(() => import('./pages/Login'))
const Panel = lazy(() => import('./pages/Panel'))
const Platform = lazy(() => import('./pages/platform/Platform'))
const PlatformLogin = lazy(() => import('./pages/platform/PlatformLogin'))

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
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/termos" element={<Terms />} />
        <Route path="/privacidade" element={<Privacy />} />

        <Route path="/r/:slug" element={<TenantLayout />}>
          <Route index element={<Customer />} />
          <Route path="mesa/:numero" element={<Customer />} />
          <Route path="delivery" element={<Customer mode="delivery" />} />
          <Route path="termos" element={<RestaurantTerms />} />
          <Route path="privacidade" element={<RestaurantPrivacy />} />
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
            path="equipe/delivery"
            element={
              <RequireStaff roles={FLOOR}>
                <Delivery />
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
    </Suspense>
  )
}
