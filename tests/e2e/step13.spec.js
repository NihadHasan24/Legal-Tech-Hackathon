import { expect, test } from '@playwright/test'

test('Step 13: API security headers, login throttling, and route focus are enforced', async ({ page }) => {
  const health = await page.request.get('http://127.0.0.1:5001/health')
  expect(health.headers()['x-content-type-options']).toBe('nosniff')
  expect(health.headers()['x-frame-options']).toBe('DENY')
  expect(health.headers()['content-security-policy']).toContain("default-src 'none'")

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await page.request.post('/api/auth/login', { data: { username: 'step13.throttle', password: 'not-the-password' } })
    expect(response.status()).toBe(401)
  }
  const limited = await page.request.post('/api/auth/login', { data: { username: 'step13.throttle', password: 'not-the-password' } })
  expect(limited.status()).toBe(429)
  expect((await limited.json()).error.code).toBe('LOGIN_RATE_LIMITED')
  expect(limited.headers()['cache-control']).toBe('no-store')

  await page.goto('/')
  await page.getByLabel('Demo username').fill('step13.accessibility')
  await page.getByLabel('Demo password').fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('link', { name: 'Start a voice intake' }).click()
  await expect(page).toHaveURL(/\/voice$/)
  await expect(page.locator('#main')).toBeFocused()
  await expect(page.locator('.call-page')).toHaveAttribute('lang', 'bn')
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
