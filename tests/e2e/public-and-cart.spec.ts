import { expect, test } from '@playwright/test'

const demoPath = './r/demo?table=c0ffee00-0000-4000-8000-000000000001'

test('la portada conduce al registro real de propietarios', async ({ page }) => {
  await page.goto('./')

  await expect(page).toHaveTitle('POMA')
  await expect(page.locator('img[src$="brand/poma-symbol.svg"]').first()).toBeVisible()
  const faviconHref = await page.locator('link[rel="icon"]').getAttribute('href')
  expect(faviconHref).toMatch(/\/brand\/poma-symbol\.svg$/)
  const faviconResponse = await page.evaluate(async (href) => {
    const response = await fetch(href)
    return { ok: response.ok, contentType: response.headers.get('content-type') }
  }, faviconHref!)
  expect(faviconResponse.ok).toBeTruthy()
  expect(faviconResponse.contentType).toContain('image/svg+xml')
  await page.getByRole('link', { name: /Registrar un restaurante/i }).click()
  await expect(page.getByRole('heading', { name: /Tu local, conectado/i })).toBeVisible()

  await page.getByRole('link', { name: /Crear cuenta de restaurante/i }).click()
  await expect(page).toHaveURL(/\/acceso\?mode=register$/)
  await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible()
})

test('la DEMO exige el QR válido', async ({ page }) => {
  await page.goto('./r/demo')

  await expect(page.getByRole('heading', { name: 'Carta no disponible' })).toBeVisible()
  await expect(page.getByText(/requiere el QR de una mesa válida/i)).toBeVisible()
})

test('la carta carga desde Supabase y el carrito calcula la comanda', async ({ page }) => {
  await page.goto(demoPath)

  await expect(page.getByRole('heading', { name: 'DEMO', exact: true })).toBeVisible()
  await expect(page.getByText('DEMO · Mesa 01')).toBeVisible()

  await page.getByRole('button', { name: 'Añadir Bravas POMA' }).click()
  const cartButton = page.getByRole('button', { name: /Ver mi comanda/i })
  await expect(cartButton).toContainText('6,90')
  await cartButton.click()

  const cart = page.getByRole('dialog', { name: 'Mi comanda' })
  await expect(cart).toBeVisible()
  await expect(cart).toContainText('Bravas POMA')
  await expect(cart).toContainText('6,90')
  await cart.getByRole('button', { name: 'Añadir otra unidad de Bravas POMA' }).click()
  await expect(cart).toContainText('13,80')
  await expect(cart.getByRole('button', { name: /Pagar con/i })).toBeDisabled()
  await expect(cart).toContainText(/cobro real se activarán en la siguiente iteración/i)
})

test('las rutas desconocidas muestran una salida segura', async ({ page }) => {
  await page.goto('./ruta-que-no-existe')
  await expect(page.getByRole('heading', { name: 'Esta ruta no existe.' })).toBeVisible()
  await page.getByRole('link', { name: 'Volver al inicio' }).click()
  await expect(page.getByRole('heading', { name: /Controla/i })).toBeVisible()
})
