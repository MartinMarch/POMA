import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 512, height: 512 } })

test('el símbolo conserva las proporciones del PNG original', async ({ page }) => {
  await page.goto('./brand/poma-symbol.svg')
  await expect(page).toHaveScreenshot('poma-symbol.png', {
    animations: 'disabled',
    maxDiffPixels: 40,
  })
})

