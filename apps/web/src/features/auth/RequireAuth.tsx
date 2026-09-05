import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main className="catalog-state" aria-live="polite">
        <span className="loader" />
        <p>Comprobando tu sesión…</p>
      </main>
    )
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate replace to={`/acceso?next=${next}`} />
  }

  return children
}
