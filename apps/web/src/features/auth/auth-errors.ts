export type AuthAction = 'login' | 'register' | 'resend'

type AuthErrorLike = {
  code?: string
  message?: string
  status?: number
}

function errorCode(reason: unknown) {
  if (!reason || typeof reason !== 'object') return undefined
  return (reason as AuthErrorLike).code
}

export function getAuthErrorMessage(reason: unknown, action: AuthAction) {
  switch (errorCode(reason)) {
    case 'email_address_invalid':
      return 'No podemos enviar la confirmación a este correo. El servicio de altas todavía no admite destinatarios externos.'
    case 'over_email_send_rate_limit':
      return 'Se ha alcanzado el límite temporal de correos de confirmación. Espera unos minutos antes de reintentarlo.'
    case 'email_not_confirmed':
      return 'Confirma tu correo electrónico antes de iniciar sesión.'
    case 'user_already_exists':
      return 'Ya existe una cuenta con este correo. Prueba a iniciar sesión.'
    case 'weak_password':
      return 'La contraseña no cumple los requisitos de seguridad.'
    case 'signup_disabled':
      return 'Las nuevas altas están temporalmente desactivadas.'
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.'
    default:
      if (action === 'login') return 'Correo o contraseña incorrectos.'
      if (action === 'resend') return 'No hemos podido reenviar la confirmación.'
      return 'No hemos podido crear la cuenta. Revisa los datos e inténtalo de nuevo.'
  }
}

