import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../features/auth/useAuth'
import { getAuthErrorMessage } from '../features/auth/auth-errors'
import { safeNext } from '../lib/navigation'
import { supabase } from '../lib/supabase'
import { PomaBrand } from '../components/PomaBrand'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const next = safeNext(searchParams.get('next'))

  if (!loading && user) return <Navigate replace to={next} />

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError(null)
    setMessage(null)
    setPendingEmail(null)
    const nextParams = new URLSearchParams(searchParams)
    if (nextMode === 'register') nextParams.set('mode', 'register')
    else nextParams.delete('mode')
    setSearchParams(nextParams)
  }

  const emailRedirectTo = new URL(
    `${import.meta.env.BASE_URL}panel`,
    window.location.origin,
  ).toString()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'register') {
        const normalizedEmail = email.trim().toLowerCase()
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo,
          },
        })

        if (signUpError) throw signUpError

        if (data.session) navigate(next, { replace: true })
        else {
          setPendingEmail(normalizedEmail)
          setMessage(
            'Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión.',
          )
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (signInError) throw signInError
        navigate(next, { replace: true })
      }
    } catch (reason) {
      setError(getAuthErrorMessage(reason, mode))
    } finally {
      setBusy(false)
    }
  }

  async function resendConfirmation() {
    if (!pendingEmail) return
    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: { emailRedirectTo },
      })
      if (resendError) throw resendError
      setMessage('Confirmación reenviada. Revisa también la carpeta de correo no deseado.')
    } catch (reason) {
      setError(getAuthErrorMessage(reason, 'resend'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-brand-panel">
        <PomaBrand inverse />
        <div>
          <p className="kicker">ÁREA DE RESTAURANTES</p>
          <h1>Tu sala de control empieza aquí.</h1>
          <p>
            Gestiona carta, mesas y pedidos desde un único espacio conectado a
            la operativa de tu local.
          </p>
        </div>
        <small>Acceso protegido por Supabase Auth</small>
      </section>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Tipo de acceso">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => selectMode('login')}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => selectMode('register')}
            >
              Crear cuenta
            </button>
          </div>

          <div className="auth-card-heading">
            <p className="tiny-label">
              {mode === 'login' ? 'BIENVENIDO DE NUEVO' : 'EMPIEZA CON POMA'}
            </p>
            <h2>{mode === 'login' ? 'Accede a tu espacio' : 'Crea tu cuenta'}</h2>
            <p>
              {mode === 'login'
                ? 'Introduce tus credenciales para continuar.'
                : 'Después del registro podrás dar de alta tu primer restaurante.'}
            </p>
          </div>

          <form className="poma-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label>
                Nombre completo
                <input
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  minLength={2}
                  maxLength={120}
                  required
                />
              </label>
            )}
            <label>
              Correo electrónico
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={320}
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={mode === 'register' ? 10 : undefined}
                required
              />
              {mode === 'register' && <small>Mínimo 10 caracteres.</small>}
            </label>

            {error && <p className="form-alert error" role="alert">{error}</p>}
            {message && <p className="form-alert success" role="status">{message}</p>}

            <button className="button button-primary form-submit" type="submit" disabled={busy}>
              {busy
                ? 'Procesando…'
                : mode === 'login'
                  ? 'Entrar en POMA'
                  : 'Crear cuenta y continuar'}
            </button>
          </form>

          {pendingEmail && (
            <button
              className="auth-resend-button"
              type="button"
              disabled={busy}
              onClick={() => void resendConfirmation()}
            >
              Reenviar correo de confirmación
            </button>
          )}

          <Link className="auth-back-link" to="/">← Volver a la web de POMA</Link>
        </div>
      </main>
    </div>
  )
}
