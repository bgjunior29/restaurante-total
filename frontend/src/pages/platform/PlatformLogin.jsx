import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { LoginForm } from '../Login'

export default function PlatformLogin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  if (user) return <Navigate to="/plataforma" replace />
  return (
    <LoginForm
      eyebrow="Plataforma"
      title="Gestão dos restaurantes."
      onSuccess={() => navigate('/plataforma')}
    />
  )
}
