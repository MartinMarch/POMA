import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/useAuth'
import {
  getOwnerDashboard,
  type OwnerDashboardData,
} from '../features/dashboard/dashboard'
import { supabase } from '../lib/supabase'
import { PomaBrand } from '../components/PomaBrand'

type OwnerResource =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: OwnerDashboardData }

export function OwnerDashboardPage() {
  const { user, signOut } = useAuth()
  const userId = user?.id ?? ''
  const navigate = useNavigate()
  const [resource, setResource] = useState<OwnerResource>({ status: 'loading' })
  const [busyId, setBusyId] = useState<number | null>(null)

  async function loadDashboard() {
    try {
      const data = await getOwnerDashboard(userId)
      setResource({ status: 'ready', data })
    } catch {
      setResource({ status: 'error' })
    }
  }

  useEffect(() => {
    let active = true
    getOwnerDashboard(userId)
      .then((data) => {
        if (active) setResource({ status: 'ready', data })
      })
      .catch(() => {
        if (active) setResource({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [userId])

  async function handleSignOut() {
    navigate('/', { replace: true })
    await signOut()
  }

  async function togglePublished(id: number, published: boolean) {
    setBusyId(id)
    const { error } = await supabase
      .from('restaurants')
      .update({ is_published: !published })
      .eq('id', id)

    if (!error) await loadDashboard()
    setBusyId(null)
  }

  if (resource.status === 'loading') {
    return (
      <main className="catalog-state" aria-live="polite">
        <span className="loader" />
        <p>Cargando tus restaurantes…</p>
      </main>
    )
  }

  if (resource.status === 'error') {
    return (
      <main className="catalog-state">
        <span className="state-icon">×</span>
        <h1>No se pudo cargar tu espacio</h1>
        <button className="button button-primary" type="button" onClick={() => void loadDashboard()}>
          Reintentar
        </button>
      </main>
    )
  }

  const { restaurants, menus } = resource.data

  return (
    <div className="portal-page">
      <aside className="portal-sidebar">
        <PomaBrand inverse />
        <div className="portal-account">
          <span className="account-avatar">
            {(user?.user_metadata.full_name?.[0] ?? user?.email?.[0] ?? 'P').toUpperCase()}
          </span>
          <div><strong>{user?.user_metadata.full_name ?? 'Propietario'}</strong><small>{user?.email}</small></div>
        </div>
        <nav>
          <a className="active" href="#restaurantes">Mis restaurantes</a>
          <a href="#actividad">Actividad</a>
          <Link to="/registro">Configuración inicial</Link>
        </nav>
        <button className="portal-signout" type="button" onClick={() => void handleSignOut()}>
          Cerrar sesión
        </button>
      </aside>

      <main className="portal-main">
        <header className="portal-heading">
          <div><p className="tiny-label">ESPACIO DEL PROPIETARIO</p><h1>Buenos días.</h1></div>
          <Link className="button button-primary" to="/alta-restaurante">+ Nuevo restaurante</Link>
        </header>

        {restaurants.length === 0 ? (
          <section className="portal-empty">
            <span>⌂</span>
            <h2>Registra tu primer restaurante</h2>
            <p>Crearemos un espacio aislado desde el que podrás preparar la carta y las mesas.</p>
            <Link className="button button-primary" to="/alta-restaurante">Comenzar el alta</Link>
          </section>
        ) : (
          <section id="restaurantes">
            <div className="portal-section-heading">
              <div><p className="tiny-label">TU NEGOCIO</p><h2>Restaurantes</h2></div>
              <span>{restaurants.length} {restaurants.length === 1 ? 'local' : 'locales'}</span>
            </div>
            <div className="owner-restaurant-grid">
              {restaurants.map((restaurant) => {
                const restaurantMenus = menus.filter(
                  (menu) => menu.restaurant_id === restaurant.id,
                )
                return (
                  <article className="owner-restaurant-card" key={restaurant.id}>
                    <div className="restaurant-card-art">
                      <span>{restaurant.name.slice(0, 2).toUpperCase()}</span>
                      <div className={restaurant.is_published ? 'publication live' : 'publication'}>
                        {restaurant.is_published ? 'Publicado' : 'Privado'}
                      </div>
                    </div>
                    <div className="restaurant-card-body">
                      <p className="tiny-label">poma.app/r/{restaurant.slug}</p>
                      <h2>{restaurant.name}</h2>
                      <p>{restaurant.description ?? 'Añade una descripción para presentar tu local.'}</p>
                      <div className="restaurant-card-stats">
                        <div><strong>{restaurantMenus.length}</strong><span>Cartas</span></div>
                        <div><strong>{restaurantMenus.filter((menu) => menu.is_active).length}</strong><span>Activas</span></div>
                      </div>
                      <div className="restaurant-card-actions">
                        <Link to={`/admin/${restaurant.slug}`}>Gestionar</Link>
                        <Link to={`/r/${restaurant.slug}`}>Ver carta ↗</Link>
                        <button
                          type="button"
                          disabled={busyId === restaurant.id}
                          onClick={() => void togglePublished(restaurant.id, restaurant.is_published)}
                        >
                          {restaurant.is_published ? 'Despublicar' : 'Publicar'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        <section className="owner-activity" id="actividad">
          <div><span className="status-light ready" /><strong>Cuenta conectada</strong><small>Supabase Auth y permisos RLS activos</small></div>
          <div><span className="status-light" /><strong>Pedidos</strong><small>Se activarán en la siguiente vertical</small></div>
          <div><span className="status-light" /><strong>Cobros</strong><small>Pendiente de proveedor de pagos</small></div>
        </section>
      </main>
    </div>
  )
}
