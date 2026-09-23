import { expect, test } from '@playwright/test'
import { steps } from '../../client/src/utils/voiceScript.js'
import { expand, signIn } from './support.js'

// Nonvisual proof: every control is reached with Tab by accessible name and used with Enter; no mouse, no positions.
async function tabTo(page, control) {
  for (let presses = 0; presses < 40; presses += 1) {
    if (await control.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('Control is not reachable with the Tab key.')
}

const prompt = (page, field) => page.getByRole('heading', { name: steps[field].prompt, exact: true })

const bn = (text) => text.replace(/[0-9]/g, (digit) => '০১২৩৪৫৬৭৮৯'[digit])

async function press(page, name) {
  await tabTo(page, page.getByRole('button', { name, exact: true }))
  await page.keyboard.press('Enter')
}

// Choices are answered on the keypad: option N is key N, named by its digit and label.
async function choose(page, field, value) {
  await expect(prompt(page, field)).toBeFocused()
  const index = steps[field].choices.findIndex(([option]) => option === value)
  await press(page, `${bn(String(index + 1))} ${steps[field].choices[index][1]}`)
}

// Spoken questions: this keyboard-only caller picks the typed answer instead of speaking.
async function say(page, field, words, previous) {
  await expect(prompt(page, field)).toBeFocused()
  await press(page, 'লিখে উত্তর দিন')
  const box = page.getByRole('textbox', { name: steps[field].prompt, exact: true })
  await expect(box).toBeFocused()
  if (previous) await expect(box).toHaveValue(previous)
  await page.keyboard.press('Control+A')
  await page.keyboard.type(words)
  await press(page, 'উত্তর দিন')
}

// The safe number is dialled with the number keys, then #.
async function dial(page, field, number) {
  await expect(prompt(page, field)).toBeFocused()
  await page.keyboard.type(number)
  await expect(page.getByRole('status', { name: steps[field].label })).toHaveText(bn(number))
  await page.keyboard.press('#')
}

test('Ripon reports for Moyuri by keyboard; the DLAO sees one pending representative record and unknown answers fail safe', async ({ page }) => {
  await page.goto('/voice')
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('লিগ্যাল এইড হেল্পলাইন')
  await expect(page.getByText('ওয়েবে তৈরি নমুনা কল · আসল ১৬৬৯৯ ফোনসেবা নয়')).toBeVisible()
  // A clean call screen: one call button, no instructions, consent questions, or placeholder notes.
  await expect(page.getByRole('button')).toHaveText(['বাংলা', 'English', 'হালকা মোড', 'কল করুন'])
  await press(page, 'কল করুন')
  await expect(page.getByText('কলটি রেকর্ড হচ্ছে')).toBeVisible()
  await expect(page.getByRole('button', { name: 'মানুষের সাথে কথা বলতে চাই' })).toHaveCount(0)
  await choose(page, 'urgent', false)
  await choose(page, 'callerRole', 'REPRESENTATIVE')
  await say(page, 'callerName', 'Ripon (fictional)')
  await say(page, 'relationship', 'Brother')
  await say(page, 'applicantName', 'Moyuri (fictional)')
  await choose(page, 'identityDocument', 'UNAVAILABLE')
  await say(page, 'problem', 'Fictional report about a family dispute.')
  await say(page, 'district', 'Jaipurhat')
  await choose(page, 'contactChannel', 'PHONE')
  await dial(page, 'contactValue', '01700000000')
  await choose(page, 'contactOwner', 'CALLER')
  await say(page, 'safeTime', 'Weekdays 10:00-12:00')
  await choose(page, 'smsSafe', false)

  const readback = page.getByRole('heading', { name: 'আপনার উত্তরগুলো শুনে বা পড়ে মিলিয়ে নিন' })
  await expect(readback).toBeFocused()
  await expect(page.getByText(/তথ্যগুলো প্রতিনিধি জানিয়েছেন/)).toBeVisible()
  await press(page, 'সংশোধন করুন জেলা')
  await say(page, 'district', 'Joypurhat', 'Jaipurhat')
  await expect(readback).toBeFocused()
  const recordingUploaded = page.waitForResponse('**/api/voice/intakes/*/recording')
  await press(page, '১ জমা দিন')

  const done = page.getByRole('heading', { name: /^আবেদন জমা হয়েছে: APP-\d{4}-\d{6}$/ })
  // Submission is one database transaction of many writes; on a slow Atlas link it can pass 5 seconds.
  await expect(done).toBeFocused({ timeout: 15000 })
  const applicationId = (await done.textContent()).match(/APP-\d{4}-\d{6}/)[0]
  expect((await recordingUploaded).status()).toBe(201)
  await expect(page.getByText('কলটি রেকর্ড হচ্ছে')).toHaveCount(0) // the call has ended and the microphone is released

  await signIn(page, 'DLAO_OFFICER')
  const queueEntry = page.getByRole('link', { name: new RegExp(applicationId) })
  await expect(queueEntry).toHaveCount(1)
  await queueEntry.click()
  await expect(page.getByRole('heading', { name: applicationId })).toBeVisible()
  await expect(page.getByText(/Ripon \(fictional\) · Brother · authority/)).toContainText('Pending')
  await expect(page.getByText(/After acceptance/)).toBeVisible()
  await expand(page, /^Call/)
  await expect(page.getByLabel('Full call recording')).toBeVisible()
  await expand(page, /^Facts and sources/)
  const facts = page.getByRole('region', { name: /^Facts and sources/ }).locator('tbody tr')
  await expect(facts).toHaveCount(4)
  for (const fact of await facts.all()) {
    await expect(fact).toContainText('Representative reported')
    await expect(fact).toContainText(/Caller Yes.*Applicant No/)
  }
  await expect(facts.filter({ hasText: 'District' })).toContainText('Joypurhat')

  await page.getByRole('button', { name: 'Simulate call: unknown person answers' }).click()
  const script = page.getByRole('figure', { name: 'Neutral script' }).locator('blockquote')
  await expect(script).toBeVisible()
  for (const secret of [applicationId, 'Moyuri', 'Ripon', 'Joypurhat', 'family dispute', 'legal', 'আইনি', 'লিগ্যাল']) await expect(script).not.toContainText(secret)
  await expect(page.getByRole('region', { name: /^Contact log/ })).toContainText('Someone else answered')
  await expect(page.getByRole('region', { name: /^Tasks/ })).toContainText('Plan safer follow-up')
  await expect(page.getByRole('region', { name: /^History/ })).toContainText('Integrity check passed')
})

test('wrong keys repeat the question, hanging up discards the call, and danger switches to a minimal-data callback', async ({ page }) => {
  await page.goto('/voice')
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click()
  await press(page, 'কল করুন')
  await expect(prompt(page, 'urgent')).toBeFocused()
  await page.keyboard.press('9') // not an option: the wrong-key clip plays and the same question comes back
  await expect(prompt(page, 'urgent')).toBeFocused()
  await expect(prompt(page, 'callerRole')).toHaveCount(0)
  await choose(page, 'urgent', false)
  page.once('dialog', (dialog) => dialog.accept())
  await press(page, 'কল শেষ করুন')
  await expect(page.getByRole('button', { name: 'কল করুন' })).toBeVisible()

  await press(page, 'কল করুন')
  await choose(page, 'urgent', true)
  await expect(page.getByText(/তাৎক্ষণিক বিপদে ৯৯৯/)).toBeVisible()
  await dial(page, 'contactValue', '01800000000')
  await say(page, 'safeTime', 'Evening after 6 pm')
  await say(page, 'district', 'Barguna')
  await expect(page.getByRole('heading', { name: 'আপনার উত্তরগুলো শুনে বা পড়ে মিলিয়ে নিন' })).toBeFocused()
  await expect(page.getByText(steps.problem.label, { exact: true })).toHaveCount(0)
  await page.setViewportSize({ width: 375, height: 700 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.keyboard.press('1') // the read-back is confirmed on the keypad too
  await expect(page.getByText('আবেদন জমা হচ্ছে…')).toBeVisible()
  await expect(page.getByRole('heading', { name: /^আবেদন জমা হয়েছে: APP-\d{4}-\d{6}$/ })).toBeFocused({ timeout: 15000 })
  await expect(page.getByText(/নিরাপদ নম্বরে, নিরাপদ সময়ে ফোন করবেন/)).toBeVisible()
})
