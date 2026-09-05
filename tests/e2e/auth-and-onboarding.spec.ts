import { expect, test } from '@playwright/test'

test.describe.serial('autenticación y alta multitenant', () => {
  const runId = Date.now()
  const ownerEmail = `owner-${runId}@example.com`
  const ownerPassword = 'Poma-test-owner-2026!'
  const restaurantName = `Test Restaurant ${runId}`
  const restaurantSlug = `test-restaurant-${runId}`

  test('protege el panel cuando no existe sesión', async ({ page }) => {
    await page.goto('./panel')
    await expect(page).toHaveURL(/\/acceso\?next=%2Fpanel$/)
  })

  test('registra un propietario, crea su restaurante y permite volver a entrar', async ({ page }) => {
    await page.goto('./acceso?mode=register')
    await page.getByLabel('Nombre completo').fill('Propietaria de prueba')
    await page.getByLabel('Correo electrónico').fill(ownerEmail)
    await page.getByLabel('Contraseña').fill(ownerPassword)
    await page.getByRole('button', { name: 'Crear cuenta y continuar' }).click()

    await expect(page).toHaveURL(/\/panel$/)
    await expect(page.getByRole('heading', { name: 'Buenos días.' })).toBeVisible()
    await page.getByRole('link', { name: /Nuevo restaurante/i }).click()

    await page.getByLabel('Nombre del restaurante').fill(restaurantName)
    await expect(page.getByLabel('Dirección web')).toHaveValue(restaurantSlug)
    await page.getByLabel('Descripción').fill('Restaurante creado por la prueba integral de POMA.')
    await page.getByRole('button', { name: 'Registrar restaurante' }).click()

    await expect(page).toHaveURL(/\/panel$/)
    const restaurantCard = page.locator('.owner-restaurant-card').filter({ hasText: restaurantName })
    await expect(restaurantCard).toBeVisible()
    await restaurantCard.getByRole('button', { name: 'Publicar' }).click()
    await expect(restaurantCard.getByText('Publicado', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('./acceso')
    await page.getByLabel('Correo electrónico').fill(ownerEmail)
    await page.getByLabel('Contraseña').fill(ownerPassword)
    await page.getByRole('button', { name: 'Entrar en POMA' }).click()
    await expect(page).toHaveURL(/\/panel$/)
    await expect(restaurantCard).toBeVisible()
  })

  test('asigna y abre la consola global al correo superadministrador', async ({ page }) => {
    await page.goto('./acceso?mode=register')
    await page.getByLabel('Nombre completo').fill('Administración POMA')
    await page.getByLabel('Correo electrónico').fill('admin.e2e@example.com')
    await page.getByLabel('Contraseña').fill('Poma-test-admin-2026!')
    await page.getByRole('button', { name: 'Crear cuenta y continuar' }).click()

    await expect(page).toHaveURL(/\/panel$/)
    await expect(page.getByRole('heading', { name: 'Vista general' })).toBeVisible()
    await expect(page.getByText('Control global')).toBeVisible()
    await page.locator('.portal-sidebar').getByRole('button', { name: /Usuarios/ }).click()
    await expect(page.getByRole('heading', { name: 'Usuarios', exact: true })).toBeVisible()
    const ownerRow = page.locator('tbody tr').filter({ hasText: ownerEmail })
    await expect(ownerRow).toBeVisible()
    await expect(ownerRow).toContainText(restaurantName)

    await page.locator('.portal-sidebar').getByRole('button', { name: /Restaurantes/ }).click()
    const restaurantRow = page.locator('tbody tr').filter({ hasText: restaurantName })
    await expect(restaurantRow).toBeVisible()
    page.once('dialog', (dialog) => dialog.accept())
    await restaurantRow.getByRole('button', { name: 'Eliminar' }).click()
    await expect(restaurantRow).toHaveCount(0)

    await page.locator('.portal-sidebar').getByRole('button', { name: /Usuarios/ }).click()
    page.once('dialog', (dialog) => dialog.accept())
    await ownerRow.getByRole('button', { name: 'Eliminar' }).click()
    await expect(ownerRow).toHaveCount(0)
  })
})
