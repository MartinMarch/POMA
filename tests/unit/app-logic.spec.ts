import { expect, test } from '@playwright/test'
import { getAuthErrorMessage } from '../../apps/web/src/features/auth/auth-errors'
import { safeNext } from '../../apps/web/src/lib/navigation'
import { slugify } from '../../apps/web/src/lib/slug'

test.describe('lógica compartida de la aplicación', () => {
  test('solo permite retornos internos seguros después del acceso', () => {
    expect(safeNext('/alta-restaurante?from=panel')).toBe('/alta-restaurante?from=panel')
    expect(safeNext('//sitio-malicioso.example')).toBe('/panel')
    expect(safeNext('https://sitio-malicioso.example')).toBe('/panel')
    expect(safeNext(null)).toBe('/panel')
  })

  test('genera identificadores web válidos y estables', () => {
    expect(slugify('Bar Ànima & Cía.')).toBe('bar-anima-cia')
    expect(slugify('  La   Mesa  29  ')).toBe('la-mesa-29')
    expect(slugify('a'.repeat(100))).toHaveLength(80)
  })

  test('traduce los errores reales de registro en mensajes accionables', () => {
    expect(getAuthErrorMessage({ code: 'email_address_invalid' }, 'register'))
      .toContain('no admite destinatarios externos')
    expect(getAuthErrorMessage({ code: 'over_email_send_rate_limit' }, 'register'))
      .toContain('límite temporal')
    expect(getAuthErrorMessage({ code: 'email_not_confirmed' }, 'login'))
      .toContain('Confirma tu correo')
  })
})

