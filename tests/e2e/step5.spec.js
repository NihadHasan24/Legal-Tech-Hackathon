import { expect, test } from '@playwright/test'
import { steps } from '../../client/src/utils/voiceScript.js'

test('when live AI is unavailable, the voice route falls back to the keyboard without losing answers', async ({ page }) => {
  await page.goto('/voice')
  await page.getByRole('button', { name: 'ভয়েসে কথা বলুন', exact: true }).click()
  for (const field of ['LIVE_VOICE', 'AUDIO_STORAGE', 'TRANSCRIPT_STORAGE']) {
    await expect(page.getByRole('heading', { name: steps[field].prompt })).toBeFocused()
    await page.getByRole('button', { name: field === 'AUDIO_STORAGE' ? 'না' : 'হ্যাঁ, রাজি', exact: true }).click()
  }
  const tokenRequest = page.waitForResponse('**/api/voice/live-session')
  expect((await tokenRequest).status()).toBe(503)
  await expect(page.getByText(/লাইভ ভয়েস এখন পাওয়া যাচ্ছে না/)).toBeVisible()
  await expect(page.getByText('Prototype state: LISTENING')).toBeVisible()
  // Focus returns to the pending question so a screen-reader user continues by keyboard.
  await expect(page.getByRole('heading', { name: steps.urgent.prompt })).toBeFocused()
  await page.getByRole('button', { name: 'না', exact: true }).press('Enter')
  await expect(page.getByRole('heading', { name: steps.callerRole.prompt })).toBeFocused()
  await expect(page.getByRole('button', { name: 'আবার ভয়েস চেষ্টা করুন' })).toBeVisible()
})
