import { useEffect, useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { clearToken, getToken } from '../lib/auth'

export function RequireAuth() {
  const navigate = useNavigate()
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    const onUnauthorized = () => {
      clearToken()
      setUnauthorized(true)
      navigate('/connexion', { replace: true })
    }
    window.addEventListener('lr:unauthorized', onUnauthorized)
    return () => window.removeEventListener('lr:unauthorized', onUnauthorized)
  }, [navigate])

  if (!getToken() || unauthorized) {
    return <Navigate to="/connexion" replace />
  }

  return <Outlet />
}
