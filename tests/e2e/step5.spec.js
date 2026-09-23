import { expect, test } from '@playwright/test'
import { steps } from '../../client/src/utils/voiceScript.js'

// The E2E server runs with VOICE_AI=off, so speaking an answer hits a real 503 from our own API.
test('when voice understanding is unavailable, the caller keeps answering by keyboard', async ({ page }) => {
  await page.goto('/voice')
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click()
  await page.getByRole('button', { name: 'কল করুন', exact: true }).click()
  await expect(page.getByRole('heading', { name: steps.urgent.prompt })).toBeFocused()
  await page.keyboard.press('2') // no one is in danger; choices never go through the AI
  await expect(page.getByRole('heading', { name: steps.callerRole.prompt })).toBeFocused()
  await page.keyboard.press('1') // calling for myself
  await expect(page.getByRole('heading', { name: steps.applicantName.prompt })).toBeFocused()

  await page.keyboard.press('#') // skip the question clip; the beep starts the recording
  await expect(page.getByText(/শুনছি/)).toBeVisible()
  await page.waitForTimeout(1500) // record long enough for the fake microphone to produce real audio
  const answered = page.waitForResponse('**/api/voice/answers**')
  await page.keyboard.press('#')
  expect((await answered).status()).toBe(503)
  await expect(page.getByText(/ভয়েস বোঝার সেবা এখন পাওয়া যাচ্ছে না/)).toBeVisible()

  // The draft survives and the same question continues as a typed answer.
  const name = page.getByRole('textbox', { name: steps.applicantName.prompt })
  await expect(name).toBeFocused()
  await name.fill('Fictional Moyuri')
  await page.getByRole('button', { name: 'উত্তর দিন', exact: true }).click()
  await expect(page.getByRole('heading', { name: steps.identityDocument.prompt })).toBeFocused()
  await page.keyboard.press('3')
  // Once voice is known to be off, spoken questions open straight into the typed answer.
  await expect(page.getByRole('textbox', { name: steps.problem.prompt })).toBeVisible()
  await expect(page.getByRole('button', { name: 'লিখে উত্তর দিন' })).toHaveCount(0)
})
