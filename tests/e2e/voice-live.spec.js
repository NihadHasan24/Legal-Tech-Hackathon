import { expect, test } from '@playwright/test'
import { steps } from '../../client/src/utils/voiceScript.js'

// Opt-in: speaks a real Bangla recording into the page and calls the real Groq API.
// Record one fictional answer as a WAV, then run:
//   LIVE_VOICE_SAMPLE=recordings/sample.wav npm run test:e2e
const sample = process.env.LIVE_VOICE_SAMPLE

test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', ...(sample ? [`--use-file-for-fake-audio-capture=${sample}`] : [])] } })
test.skip(!sample, 'Set LIVE_VOICE_SAMPLE to a Bangla WAV recording to run this.')

test('a spoken answer is transcribed and fills approved fields', async ({ page }) => {
  await page.goto('/voice')
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click()
  await page.getByRole('button', { name: 'কল করুন', exact: true }).click()
  await expect(page.getByRole('heading', { name: steps.urgent.prompt })).toBeFocused()
  await page.keyboard.press('2')
  await expect(page.getByRole('heading', { name: steps.callerRole.prompt })).toBeFocused()
  await page.keyboard.press('2') // calling for someone else, so the next question is spoken
  await expect(page.getByRole('heading', { name: steps.callerName.prompt })).toBeFocused()
  const answered = page.waitForResponse('**/api/voice/answers**')
  await page.keyboard.press('#') // skip the clip; the beep starts the recording
  await page.waitForTimeout(6000) // let the recording play into the fake microphone
  // A pause in the sample may already have ended the answer; otherwise # does.
  if (await page.getByText(/শুনছি/).isVisible()) await page.keyboard.press('#')
  const response = await answered
  expect(response.status()).toBe(200)
  const result = await response.json()
  console.log('Transcribed:', result.text)
  console.log('Extracted:', JSON.stringify(result.values))
  expect(result.text.length).toBeGreaterThan(3)
  expect(Object.keys(result.values).length).toBeGreaterThan(0)
})
