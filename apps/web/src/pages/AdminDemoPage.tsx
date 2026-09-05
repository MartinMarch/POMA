import { Link, useParams } from 'react-router'
import { PomaBrand } from '../components/PomaBrand'

const stations = [
  { name: 'Catálogo Supabase', state: 'Conectado', ready: true },
  { name: 'Entrada de comandas', state: 'Próxima iteración', ready: false },
  { name: 'Pago Apple Pay', state: 'Pendiente de proveedor', ready: false },
  { name: 'Conector TPV', state: 'Pendiente de piloto', ready: false },
]

export function AdminDemoPage() {
  const { slug } = useParams()

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <PomaBrand inverse />
        <nav>
          <a className="active" href="#resumen">Resumen</a>
          <a href="#pedidos">Pedidos</a>
          <a href="#carta">Carta</a>
          <a href="#mesas">Mesas y QR</a>
          <a href="#integraciones">Integraciones</a>
        </nav>
        <Link className="sidebar-demo-link" to="/panel">Volver al panel</Link>
      </aside>
      <main className="admin-main" id="resumen">
        <header className="admin-heading">
          <div>
            <p className="tiny-label">RESTAURANTE</p>
            <h1>{(slug ?? 'restaurante').toUpperCase()}</h1>
          </div>
          <span className="environment-badge">Configuración</span>
        </header>

        <section className="admin-welcome">
          <div>
            <p className="kicker">CENTRO DE OPERACIONES</p>
            <h2>El circuito empieza aquí.</h2>
          </div>
          <p>
            Este panel será el punto de entrada de las comandas y el puente con
            cocina, contabilidad y el TPV físico del piloto.
          </p>
        </section>

        <section className="status-grid" id="integraciones">
          {stations.map((station) => (
            <article key={station.name}>
              <span className={station.ready ? 'status-light ready' : 'status-light'} />
              <p>{station.name}</p>
              <strong>{station.state}</strong>
            </article>
          ))}
        </section>

        <section className="empty-orders" id="pedidos">
          <div className="empty-receipt" aria-hidden="true">⌁</div>
          <h2>Aún no hay comandas</h2>
          <p>Cuando conectemos el checkout, los pedidos aparecerán aquí en tiempo real.</p>
          <Link className="button button-primary" to="/panel">Volver al panel</Link>
        </section>
      </main>
    </div>
  )
}
