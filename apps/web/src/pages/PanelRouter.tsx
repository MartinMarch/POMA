import { useEffect, useState } from 'react'
import { isSuperAdmin } from '../features/dashboard/dashboard'
import { useAuth } from '../features/auth/useAuth'
import { OwnerDashboardPage } from './OwnerDashboardPage'
import { SuperAdminDashboardPage } from './SuperAdminDashboardPage'

type RoleResult = {
  userId: string
  isAdmin: boolean
  error: boolean
}

export function PanelRouter() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [result, setResult] = useState<RoleResult | null>(null)

  useEffect(() => {
    let active = true
    isSuperAdmin(userId)
      .then((admin) => {
        if (active) setResult({ userId, isAdmin: admin, error: false })
      })
      .catch(() => {
        if (active) setResult({ userId, isAdmin: false, error: true })
      })
    return () => {
      active = false
    }
  }, [userId])

  if (!result || result.userId !== userId) {
    return (
      <main className="catalog-state" aria-live="polite">
        <span className="loader" />
        <p>Preparando tu panel…</p>
      </main>
    )
  }

  if (result.error) {
    return (
      <main className="catalog-state">
        <span className="state-icon">×</span>
        <h1>No se pudo abrir el panel</h1>
        <p>Vuelve a intentarlo en unos segundos.</p>
      </main>
    )
  }

  return result.isAdmin ? <SuperAdminDashboardPage /> : <OwnerDashboardPage />
}
