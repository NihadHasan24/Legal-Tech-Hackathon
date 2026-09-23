import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { steps } from '../../client/src/utils/voiceScript.js'

// The fake microphone loops 1 s of speech-like sound and 5 s of silence, so a pause ends each spoken answer.
const rate = 48000
const seconds = 6
const pcm = Buffer.alloc(rate * seconds * 2)
for (let i = 0; i < rate * seconds; i++) {
  const t = i / rate
  const voiced = t < 1 ? Math.abs(Math.sin(Math.PI * 4 * t)) * (Math.sin(2 * Math.PI * 180 * t) + 0.5 * Math.sin(2 * Math.PI * 360 * t) + 0.3 * Math.sin(2 * Math.PI * 900 * t)) * 0.25 : 0
  pcm.writeInt16LE(Math.round(voiced * 32767), i * 2)
}
const header = Buffer.alloc(44)
header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8); header.write('fmt ', 12)
header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24)
header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40)
const microphone = join(tmpdir(), 'dlas-voice-microphone.wav')
writeFileSync(microphone, Buffer.concat([header, pcm]))

test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${microphone}`] } })

// What the (stubbed) voice service "heard" for each question. Choices use words or a bare key number.
const heard = {
  urgent: { text: 'না', values: { urgent: false } },
  callerRole: { text: 'দুই', values: {} }, // a bare number: matched to key 2 by the page, not the model
  callerName: { text: 'রিপন', values: { callerName: 'Ripon (fictional)' } },
  relationship: { text: 'ভাই', values: { relationship: 'Brother' } },
  applicantName: { text: 'ময়ূরী', values: { applicantName: 'Moyuri (fictional)' } },
  identityDocument: { text: 'তিন', values: {} },
  problem: { text: 'পারিবারিক বিরোধ', values: { problem: 'Fictional family dispute report.' } },
  district: { text: 'জয়পুরহাট', values: { district: 'Joypurhat' } },
  contactChannel: { text: 'ফোনে', values: { contactChannel: 'PHONE' } },
  contactValue: { text: 'শূন্য এক সাত…', values: { contactValue: '০১৭০০০০০০০০' } },
  contactOwner: { text: 'আমার নম্বর', values: { contactOwner: 'CALLER' } },
  safeTime: { text: 'সন্ধ্যায়', values: { safeTime: 'Evening' } },
  smsSafe: { text: 'না', values: { smsSafe: false } },
  confirm: { text: 'হ্যাঁ', values: { confirm: true } },
}

// The E2E server runs with VOICE_AI=off, so speaking an answer hits a real 503 from our own API.
test('when voice understanding is unavailable, the caller keeps answering by keyboard', async ({ page }) => {
  await page.goto('/voice')
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click()
  await page.getByRole('button', { name: 'কল করুন', exact: true }).click()
  await expect(page.getByRole('heading', { name: steps.urgent.prompt })).toBeFocused()
  await page.keyboard.press('2') // no one is in danger; a key answers a choice straight away
  await expect(page.getByRole('heading', { name: steps.callerRole.prompt })).toBeFocused()
  await page.keyboard.press('1') // calling for myself
  await expect(page.getByRole('heading', { name: steps.applicantName.prompt })).toBeFocused()

  await page.keyboard.press('#') // skip the question clip; the beep starts the recording
  await expect(page.getByText(/শুনছি/)).toBeVisible()
  await page.waitForTimeout(1500) // record long enough for the fake microphone to produce real audio
  const answered = page.waitForResponse('**/api/voice/answers**')
  await page.keyboard.press('#')
  expect((await answered).status()).toBe(503)
  await expect(page.getByText(/এখন আপনার বলা উত্তরটি বোঝা যাচ্ছে না/)).toBeVisible()

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

test('the whole call can be answered by voice, with the number read back and the submit said aloud', async ({ page }) => {
  test.setTimeout(300000)
  const asked = []
  await page.route('**/audio/{digit*,numberConfirm}.mp3', (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: '' }))
  await page.route('**/api/voice/answers**', (route) => {
    const field = new URL(route.request().url()).searchParams.get('fields')
    asked.push(field)
    return route.fulfill({ json: { ...heard[field], sensitive: false } })
  })
  await page.goto('/voice')
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click()
  await page.getByRole('button', { name: 'কল করুন', exact: true }).click()

  const order = ['urgent', 'callerRole', 'callerName', 'relationship', 'applicantName', 'identityDocument', 'problem', 'district', 'contactChannel', 'contactValue']
  for (const field of order) {
    await expect(page.getByRole('heading', { name: steps[field].prompt, exact: true })).toBeFocused({ timeout: 20000 })
    await page.keyboard.press('#') // skip the clip to the beep; the pause then ends the answer
  }
  // The spoken number is read back (clips stubbed) and confirmed by voice, with no key.
  await expect(page.getByRole('heading', { name: 'আপনার বলা নম্বর: ০১৭০০০০০০০০' })).toBeFocused({ timeout: 20000 })
  for (const field of ['contactOwner', 'safeTime', 'smsSafe']) {
    await expect(page.getByRole('heading', { name: steps[field].prompt, exact: true })).toBeFocused({ timeout: 30000 })
    await page.keyboard.press('#')
  }
  const readback = page.getByRole('heading', { name: 'আপনার উত্তরগুলো শুনে বা পড়ে মিলিয়ে নিন' })
  await expect(readback).toBeFocused({ timeout: 30000 })
  const submitted = page.waitForRequest('**/api/voice/intakes', { timeout: 30000 })
  await page.keyboard.press('#')
  const body = (await submitted).postDataJSON()
  expect(asked).toEqual([...order, 'confirm', 'contactOwner', 'safeTime', 'smsSafe', 'confirm'])
  expect(body.confirmation).toBe('VOICE')
  expect(body.answers).toMatchObject({ urgent: false, callerRole: 'REPRESENTATIVE', identityDocument: 'UNKNOWN', contactValue: '01700000000', contactOwner: 'CALLER', smsSafe: false })
  expect(body.aiFields).toEqual(expect.arrayContaining(['urgent', 'callerRole', 'identityDocument', 'contactValue', 'smsSafe']))
  expect(body.transcript).toHaveLength(asked.length) // one turn per answer
  await expect(page.getByRole('heading', { name: /আবেদন জমা হয়েছে/ })).toBeVisible({ timeout: 30000 })
})
