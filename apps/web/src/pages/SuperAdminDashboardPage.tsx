import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/useAuth'
import {
  getAdminDashboard,
  type AdminDashboardData,
  type MenuSummary,
  type ProfileSummary,
  type RestaurantSummary,
} from '../features/dashboard/dashboard'
import { supabase } from '../lib/supabase'
import { PomaBrand } from '../components/PomaBrand'

type AdminSection = 'resumen' | 'restaurantes' | 'catalogos' | 'usuarios'
type AdminResource =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: AdminDashboardData }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function SuperAdminDashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<AdminSection>('resumen')
  const [resource, setResource] = useState<AdminResource>({ status: 'loading' })
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function loadDashboard() {
    try {
      const data = await getAdminDashboard()
      setResource({ status: 'ready', data })
    } catch {
      setResource({ status: 'error' })
    }
  }

  useEffect(() => {
    let active = true
    getAdminDashboard()
      .then((data) => {
        if (active) setResource({ status: 'ready', data })
      })
      .catch(() => {
        if (active) setResource({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [])

  async function handleSignOut() {
    navigate('/', { replace: true })
    await signOut()
  }

  async function deleteRestaurant(restaurant: RestaurantSummary) {
    const confirmed = window.confirm(
      `¿Eliminar ${restaurant.name}? También se borrarán sus cartas, mesas y datos dependientes. Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setBusyKey(`restaurant-${restaurant.id}`)
    setNotice(null)
    const { data, error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', restaurant.id)
      .select('id')
      .maybeSingle()

    setNotice(
      error || !data
        ? 'No se pudo eliminar el restaurante.'
        : `${restaurant.name} se ha eliminado.`,
    )
    if (!error && data) await loadDashboard()
    setBusyKey(null)
  }

  async function togglePublished(restaurant: RestaurantSummary) {
    setBusyKey(`restaurant-${restaurant.id}`)
    setNotice(null)
    const { error } = await supabase
      .from('restaurants')
      .update({ is_published: !restaurant.is_published })
      .eq('id', restaurant.id)

    setNotice(
      error
        ? 'No se pudo cambiar la publicación.'
        : `${restaurant.name} ahora está ${restaurant.is_published ? 'oculto' : 'publicado'}.`,
    )
    if (!error) await loadDashboard()
    setBusyKey(null)
  }

  async function deleteMenu(menu: MenuSummary) {
    const confirmed = window.confirm(
      `¿Eliminar la carta “${menu.name}”? Se borrarán sus categorías y productos.`,
    )
    if (!confirmed) return

    setBusyKey(`menu-${menu.id}`)
    setNotice(null)
    const { data, error } = await supabase
      .from('menus')
      .delete()
      .eq('id', menu.id)
      .select('id')
      .maybeSingle()

    setNotice(
      error || !data
        ? 'No se pudo eliminar la carta.'
        : `La carta “${menu.name}” se ha eliminado.`,
    )
    if (!error && data) await loadDashboard()
    setBusyKey(null)
  }

  async function deleteUser(profile: ProfileSummary, data: AdminDashboardData) {
    const isAdmin = data.admins.some((admin) => admin.user_id === profile.id)
    if (isAdmin) {
      setNotice('Las cuentas superadministradoras requieren revocación manual.')
      return
    }

    const ownedIds = data.memberships
      .filter((membership) => membership.user_id === profile.id && membership.role === 'owner')
      .map((membership) => membership.restaurant_id)
    const ownedRestaurants = data.restaurants.filter((restaurant) =>
      ownedIds.includes(restaurant.id),
    )
    const ownershipWarning = ownedRestaurants.length
      ? ` También se eliminarán: ${ownedRestaurants.map((restaurant) => restaurant.name).join(', ')}.`
      : ''
    const confirmed = window.confirm(
      `¿Eliminar la cuenta ${profile.email ?? profile.full_name ?? profile.id}?${ownershipWarning} Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setBusyKey(`user-${profile.id}`)
    setNotice(null)
    const { error } = await supabase.rpc('admin_delete_user', {
      target_user_id: profile.id,
      delete_owned_restaurants: ownedRestaurants.length > 0,
    })

    setNotice(
      error
        ? 'No se pudo eliminar la cuenta.'
        : `La cuenta ${profile.email ?? profile.id} se ha eliminado.`,
    )
    if (!error) await loadDashboard()
    setBusyKey(null)
  }

  if (resource.status === 'loading') {
    return (
      <main className="catalog-state" aria-live="polite">
        <span className="loader" />
        <p>Cargando la consola global…</p>
      </main>
    )
  }

  if (resource.status === 'error') {
    return (
      <main className="catalog-state">
        <span className="state-icon">×</span>
        <h1>No se pudo cargar la consola</h1>
        <button className="button button-primary" type="button" onClick={() => void loadDashboard()}>
          Reintentar
        </button>
      </main>
    )
  }

  const data = resource.data

  return (
    <div className="portal-page superadmin-theme">
      <aside className="portal-sidebar">
        <PomaBrand inverse />
        <div className="superadmin-mark"><span>◆</span><div><strong>Control global</strong><small>Superadministrador</small></div></div>
        <nav>
          <button className={section === 'resumen' ? 'active' : ''} type="button" onClick={() => setSection('resumen')}>Resumen</button>
          <button className={section === 'restaurantes' ? 'active' : ''} type="button" onClick={() => setSection('restaurantes')}>Restaurantes <span>{data.restaurants.length}</span></button>
          <button className={section === 'catalogos' ? 'active' : ''} type="button" onClick={() => setSection('catalogos')}>Catálogos <span>{data.menus.length}</span></button>
          <button className={section === 'usuarios' ? 'active' : ''} type="button" onClick={() => setSection('usuarios')}>Usuarios <span>{data.profiles.length}</span></button>
        </nav>
        <div className="portal-admin-account"><small>Sesión iniciada</small><strong>{user?.email}</strong></div>
        <button className="portal-signout" type="button" onClick={() => void handleSignOut()}>Cerrar sesión</button>
      </aside>

      <main className="portal-main admin-control-main">
        <header className="portal-heading">
          <div><p className="tiny-label">CONSOLA DE POMA</p><h1>{section === 'resumen' ? 'Vista general' : section[0].toUpperCase() + section.slice(1)}</h1></div>
          <div className="admin-heading-actions">
            <span className="environment-badge">Consola interna</span>
            <button className="icon-refresh" type="button" onClick={() => void loadDashboard()} aria-label="Actualizar datos">↻</button>
          </div>
        </header>

        {notice && <div className="admin-notice" role="status"><span>i</span>{notice}<button type="button" onClick={() => setNotice(null)}>×</button></div>}

        {section === 'resumen' && <AdminOverview data={data} setSection={setSection} />}
        {section === 'restaurantes' && (
          <RestaurantsSection
            data={data}
            busyKey={busyKey}
            onDelete={deleteRestaurant}
            onToggle={togglePublished}
          />
        )}
        {section === 'catalogos' && (
          <MenusSection data={data} busyKey={busyKey} onDelete={deleteMenu} />
        )}
        {section === 'usuarios' && (
          <UsersSection
            data={data}
            currentUserId={user?.id ?? ''}
            busyKey={busyKey}
            onDelete={deleteUser}
          />
        )}
      </main>
    </div>
  )
}

function AdminOverview({
  data,
  setSection,
}: {
  data: AdminDashboardData
  setSection: (section: AdminSection) => void
}) {
  const products = data.items.length
  const published = data.restaurants.filter((restaurant) => restaurant.is_published).length

  return (
    <>
      <section className="admin-metric-grid">
        <button type="button" onClick={() => setSection('restaurantes')}><span>Restaurantes</span><strong>{data.restaurants.length}</strong><small>{published} publicados</small></button>
        <button type="button" onClick={() => setSection('usuarios')}><span>Usuarios</span><strong>{data.profiles.length}</strong><small>{data.admins.length} administradores</small></button>
        <button type="button" onClick={() => setSection('catalogos')}><span>Catálogos</span><strong>{data.menus.length}</strong><small>{products} productos totales</small></button>
        <article><span>Infraestructura</span><strong className="health-text">Operativa</strong><small>Supabase conectado</small></article>
      </section>
      <section className="admin-overview-grid">
        <div className="control-panel">
          <div className="control-panel-heading"><div><p className="tiny-label">ALTAS RECIENTES</p><h2>Restaurantes</h2></div><button type="button" onClick={() => setSection('restaurantes')}>Ver todos →</button></div>
          {data.restaurants.slice(0, 5).map((restaurant) => (
            <div className="overview-row" key={restaurant.id}>
              <span className="overview-avatar">{restaurant.name.slice(0, 2).toUpperCase()}</span>
              <div><strong>{restaurant.name}</strong><small>/r/{restaurant.slug}</small></div>
              <span className={restaurant.is_published ? 'publication live' : 'publication'}>{restaurant.is_published ? 'Publicado' : 'Privado'}</span>
            </div>
          ))}
        </div>
        <div className="control-panel">
          <div className="control-panel-heading"><div><p className="tiny-label">NUEVAS CUENTAS</p><h2>Usuarios</h2></div><button type="button" onClick={() => setSection('usuarios')}>Ver todos →</button></div>
          {data.profiles.slice(0, 5).map((profile) => (
            <div className="overview-row" key={profile.id}>
              <span className="overview-avatar person">{(profile.full_name?.[0] ?? profile.email?.[0] ?? 'U').toUpperCase()}</span>
              <div><strong>{profile.full_name ?? 'Sin nombre'}</strong><small>{profile.email ?? 'Sin correo'}</small></div>
              <small>{formatDate(profile.created_at)}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function RestaurantsSection({
  data,
  busyKey,
  onDelete,
  onToggle,
}: {
  data: AdminDashboardData
  busyKey: string | null
  onDelete: (restaurant: RestaurantSummary) => Promise<void>
  onToggle: (restaurant: RestaurantSummary) => Promise<void>
}) {
  return (
    <section className="control-panel data-panel">
      <div className="control-panel-heading"><div><p className="tiny-label">TENANTS</p><h2>Todos los restaurantes</h2></div><Link className="button button-primary" to="/alta-restaurante">+ Crear restaurante</Link></div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Restaurante</th><th>Propietarios</th><th>Catálogos</th><th>Estado</th><th>Alta</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {data.restaurants.map((restaurant) => {
              const ownerCount = data.memberships.filter((membership) => membership.restaurant_id === restaurant.id && membership.role === 'owner').length
              const menuCount = data.menus.filter((menu) => menu.restaurant_id === restaurant.id).length
              const busy = busyKey === `restaurant-${restaurant.id}`
              return (
                <tr key={restaurant.id}>
                  <td><div className="table-identity"><span>{restaurant.name.slice(0, 2).toUpperCase()}</span><div><strong>{restaurant.name}</strong><small>/r/{restaurant.slug}</small></div></div></td>
                  <td>{ownerCount || '—'}</td><td>{menuCount}</td>
                  <td><button className={restaurant.is_published ? 'publication live' : 'publication'} type="button" disabled={busy} onClick={() => void onToggle(restaurant)}>{restaurant.is_published ? 'Publicado' : 'Privado'}</button></td>
                  <td>{formatDate(restaurant.created_at)}</td>
                  <td><div className="table-actions"><Link to={`/admin/${restaurant.slug}`} aria-label={`Configurar ${restaurant.name}`}>Configurar</Link><button className="danger-action" type="button" disabled={busy} onClick={() => void onDelete(restaurant)} aria-label={`Eliminar ${restaurant.name}`}>Eliminar</button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MenusSection({ data, busyKey, onDelete }: { data: AdminDashboardData; busyKey: string | null; onDelete: (menu: MenuSummary) => Promise<void> }) {
  return (
    <section className="control-panel data-panel">
      <div className="control-panel-heading"><div><p className="tiny-label">CONTENIDO</p><h2>Catálogos y productos</h2></div></div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Catálogo</th><th>Restaurante</th><th>Categorías</th><th>Productos</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {data.menus.map((menu) => {
              const restaurant = data.restaurants.find((entry) => entry.id === menu.restaurant_id)
              const categories = data.categories.filter((category) => category.menu_id === menu.id)
              const categoryIds = categories.map((category) => category.id)
              const itemCount = data.items.filter((item) => categoryIds.includes(item.category_id)).length
              const busy = busyKey === `menu-${menu.id}`
              return (
                <tr key={menu.id}>
                  <td><strong>{menu.name}</strong></td><td>{restaurant?.name ?? 'Sin restaurante'}</td><td>{categories.length}</td><td>{itemCount}</td>
                  <td><span className={menu.is_active ? 'publication live' : 'publication'}>{menu.is_active ? 'Activo' : 'Inactivo'}</span></td>
                  <td><div className="table-actions">{restaurant && <Link to={`/admin/${restaurant.slug}`}>Configurar</Link>}<button className="danger-action" type="button" disabled={busy} onClick={() => void onDelete(menu)}>Eliminar</button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function UsersSection({ data, currentUserId, busyKey, onDelete }: { data: AdminDashboardData; currentUserId: string; busyKey: string | null; onDelete: (profile: ProfileSummary, data: AdminDashboardData) => Promise<void> }) {
  return (
    <section className="control-panel data-panel">
      <div className="control-panel-heading"><div><p className="tiny-label">IDENTIDADES</p><h2>Usuarios registrados</h2></div></div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol global</th><th>Restaurantes</th><th>Estado</th><th>Alta</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {data.profiles.map((profile) => {
              const admin = data.admins.some((entry) => entry.user_id === profile.id)
              const restaurantIds = data.memberships.filter((membership) => membership.user_id === profile.id).map((membership) => membership.restaurant_id)
              const restaurantNames = data.restaurants.filter((restaurant) => restaurantIds.includes(restaurant.id)).map((restaurant) => restaurant.name)
              const protectedAccount = admin || profile.id === currentUserId
              return (
                <tr key={profile.id}>
                  <td><div className="table-identity"><span className="person">{(profile.full_name?.[0] ?? profile.email?.[0] ?? 'U').toUpperCase()}</span><div><strong>{profile.full_name ?? 'Sin nombre'}</strong><small>{profile.last_sign_in_at ? `Último acceso ${formatDate(profile.last_sign_in_at)}` : 'Sin accesos'}</small></div></div></td>
                  <td>{profile.email ?? 'Sin correo'}</td>
                  <td><span className={admin ? 'role-badge admin' : 'role-badge'}>{admin ? 'Superadmin' : 'Cliente'}</span></td>
                  <td>{restaurantNames.join(', ') || '—'}</td>
                  <td><span className={profile.email_confirmed_at ? 'email-state confirmed' : 'email-state'}>{profile.email_confirmed_at ? 'Confirmado' : 'Pendiente'}</span></td>
                  <td>{formatDate(profile.created_at)}</td>
                  <td><button className="danger-action" type="button" disabled={protectedAccount || busyKey === `user-${profile.id}`} onClick={() => void onDelete(profile, data)}>{protectedAccount ? 'Protegido' : 'Eliminar'}</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
