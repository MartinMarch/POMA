import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/useAuth'
import { supabase } from '../lib/supabase'

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function CreateRestaurantPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function updateName(value: string) {
    setName(value)
    if (!slugEdited) setSlug(slugify(value))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const { error: createError } = await supabase.rpc('create_restaurant', {
      restaurant_name: name,
      restaurant_slug: slug,
      restaurant_description: description || undefined,
    })

    if (createError) {
      setError(
        createError.code === '23505'
          ? 'Ese identificador ya está en uso. Prueba con otro.'
          : 'No hemos podido crear el restaurante. Revisa los datos.',
      )
      setBusy(false)
      return
    }

    navigate('/panel', { replace: true })
  }

  return (
    <div className="setup-page">
      <header className="simple-nav">
        <Link className="wordmark" to="/">POMA<span>.</span></Link>
        <div className="session-nav">
          <span>{user?.email}</span>
          <button type="button" onClick={() => void signOut()}>Cerrar sesión</button>
        </div>
      </header>
      <main className="setup-main">
        <section className="setup-copy">
          <p className="kicker">NUEVO RESTAURANTE</p>
          <h1>Dale nombre a tu espacio.</h1>
          <p>
            Crearemos el tenant y te asignaremos como propietario en una única
            operación. La carta permanecerá privada hasta que decidas publicarla.
          </p>
        </section>
        <form className="poma-form setup-form" onSubmit={handleSubmit}>
          <label>
            Nombre del restaurante
            <input
              type="text"
              value={name}
              onChange={(event) => updateName(event.target.value)}
              minLength={1}
              maxLength={120}
              placeholder="Bar La Plaza"
              required
            />
          </label>
          <label>
            Dirección web
            <div className="slug-field">
              <span>poma.app/r/</span>
              <input
                type="text"
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true)
                  setSlug(slugify(event.target.value))
                }}
                minLength={2}
                maxLength={80}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="bar-la-plaza"
                required
              />
            </div>
          </label>
          <label>
            Descripción
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Cuéntanos brevemente qué hace especial a tu local."
            />
          </label>
          {error && <p className="form-alert error" role="alert">{error}</p>}
          <button className="button button-primary form-submit" disabled={busy}>
            {busy ? 'Creando espacio…' : 'Registrar restaurante'}
          </button>
          <Link className="auth-back-link" to="/panel">Cancelar y volver</Link>
        </form>
      </main>
    </div>
  )
}
