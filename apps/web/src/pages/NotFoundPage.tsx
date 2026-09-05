import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="catalog-state">
      <p className="kicker">ERROR 404</p>
      <h1>Esta ruta no existe.</h1>
      <p>Comprueba el enlace o vuelve al acceso de POMA.</p>
      <Link className="button button-primary" to="/">Volver al inicio</Link>
    </main>
  )
}
