import { Link } from 'react-router'

const onboardingSteps = [
  ['01', 'Crea tu espacio', 'Datos fiscales, locales, usuarios y permisos.'],
  ['02', 'Publica tu carta', 'Carga manual o importación asistida desde una foto.'],
  ['03', 'Conecta el cobro', 'Cuenta del restaurante y checkout con Apple Pay.'],
  ['04', 'Activa las mesas', 'Generamos los QR y conectamos el flujo con tu TPV.'],
]

export function RegistrationPage() {
  return (
    <div className="onboarding-page">
      <header className="simple-nav">
        <Link className="wordmark" to="/">POMA<span>.</span></Link>
        <div className="simple-nav-actions">
          <Link className="text-link" to="/acceso">Iniciar sesión</Link>
        </div>
      </header>
      <main className="onboarding-main">
        <section>
          <p className="kicker">POMA PARA RESTAURANTES</p>
          <h1>Tu local, conectado en cuatro pasos.</h1>
          <p className="onboarding-lead">
            Crea primero tu cuenta de propietario. Después podrás registrar tu
            local en un espacio privado y comenzar a preparar su carta.
          </p>
          <Link className="button button-primary" to="/acceso?mode=register">
            Crear cuenta de restaurante
          </Link>
        </section>
        <ol className="onboarding-list">
          {onboardingSteps.map(([number, title, body]) => (
            <li key={number}>
              <span>{number}</span>
              <div><h2>{title}</h2><p>{body}</p></div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  )
}
