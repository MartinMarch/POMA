import { Link } from 'react-router'

const capabilities = [
  {
    number: '01',
    title: 'Monitorización global',
    text: 'Consulta usuarios, restaurantes, catálogos y estado de la plataforma desde una única consola.',
  },
  {
    number: '02',
    title: 'Alta de clientes',
    text: 'Crea la cuenta del propietario y configura cada restaurante en un espacio privado y aislado.',
  },
  {
    number: '03',
    title: 'Configuración operativa',
    text: 'Administra publicación, cartas e integraciones antes de activar el servicio en cada local.',
  },
]

export function MarketingPage() {
  return (
    <div className="marketing-shell">
      <header className="marketing-nav">
        <Link className="wordmark" to="/" aria-label="POMA, inicio">
          POMA<span>.</span>
        </Link>
        <nav aria-label="Navegación principal">
          <a href="#capacidades">Capacidades</a>
          <Link to="/registro">Alta de cliente</Link>
          <Link className="nav-cta" to="/acceso">Acceder</Link>
        </nav>
      </header>

      <main>
        <section className="hero control-hero">
          <div className="hero-copy">
            <p className="kicker">CENTRO DE OPERACIONES</p>
            <h1>
              Controla.
              <br />
              Configura.
              <br />
              <em>Activa.</em>
            </h1>
            <p className="hero-description">
              El espacio privado para monitorizar POMA y preparar la llegada de
              cada nuevo restaurante a la plataforma.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/acceso">
                Entrar al panel <span aria-hidden="true">→</span>
              </Link>
              <Link className="text-link" to="/registro">
                Registrar un restaurante <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div className="control-visual" aria-label="Vista previa de la consola de POMA">
            <div className="control-preview">
              <div className="control-preview-header">
                <span className="control-preview-mark">P.</span>
                <div><small>CONSOLA DE POMA</small><strong>Vista general</strong></div>
                <span className="health-pill">Operativa</span>
              </div>
              <div className="control-preview-metrics">
                <article><small>Restaurantes</small><strong>—</strong><span>Gestión multitenant</span></article>
                <article><small>Usuarios</small><strong>—</strong><span>Roles protegidos</span></article>
                <article><small>Catálogos</small><strong>—</strong><span>Contenido centralizado</span></article>
              </div>
              <div className="control-preview-list">
                <div><span className="preview-avatar">R</span><p><strong>Nuevo restaurante</strong><small>Alta y configuración</small></p><b>Preparar</b></div>
                <div><span className="preview-avatar alternate">C</span><p><strong>Catálogo</strong><small>Productos y disponibilidad</small></p><b>Gestionar</b></div>
                <div><span className="preview-avatar person">U</span><p><strong>Cuenta de cliente</strong><small>Accesos y permisos</small></p><b>Revisar</b></div>
              </div>
            </div>
          </div>
        </section>

        <section className="manifesto" id="capacidades">
          <p className="section-label">UNA HERRAMIENTA PARA OPERAR POMA</p>
          <div className="benefit-grid">
            {capabilities.map((capability) => (
              <article key={capability.number}>
                <span>{capability.number}</span>
                <h2>{capability.title}</h2>
                <p>{capability.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="marketing-footer">
        <span>POMA · Operaciones de hostelería</span>
        <span>Acceso de administración · 2026</span>
      </footer>
    </div>
  )
}
