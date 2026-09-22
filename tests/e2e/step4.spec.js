import { expect, test } from '@playwright/test'
import { steps } from '../../client/src/utils/voiceScript.js'
import { signIn } from './support.js'

// Nonvisual proof: every control is reached with Tab by accessible name and used with Enter; no mouse, no positions.
async function tabTo(page, control) {
  for (let presses = 0; presses < 15; presses += 1) {
    if (await control.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('Control is not reachable with the Tab key.')
}

const prompt = (page, field) => page.getByRole('heading', { name: steps[field].prompt, exact: true })

async function choose(page, field, value) {
  await expect(prompt(page, field)).toBeFocused()
  const label = steps[field].choices.find(([option]) => option === value)[1]
  await tabTo(page, page.getByRole('button', { name: label, exact: true }))
  await page.keyboard.press('Enter')
}

async function say(page, field, words) {
  await expect(prompt(page, field)).toBeFocused()
  await tabTo(page, page.getByRole('textbox', { name: steps[field].prompt, exact: true }))
  await page.keyboard.press('Control+A')
  await page.keyboard.type(words)
  await tabTo(page, page.getByRole('button', { name: 'উত্তর দিন', exact: true }))
  await page.keyboard.press('Enter')
}

async function press(page, name) {
  await tabTo(page, page.getByRole('button', { name, exact: true }))
  await page.keyboard.press('Enter')
}

test('Ripon reports for Moyuri by keyboard; the DLAO sees one pending representative record and unknown answers fail safe', async ({ page }) => {
  await page.goto('/voice')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Call 16699 – Voice Access Prototype')
  await expect(page.getByText('not the live national 16699 telephone service')).toBeVisible()
  await press(page, 'কীবোর্ডে উত্তর দিন')
  await choose(page, 'LIVE_VOICE', 'GRANTED')
  await choose(page, 'AUDIO_STORAGE', 'DENIED')
  await choose(page, 'TRANSCRIPT_STORAGE', 'GRANTED')
  await choose(page, 'urgent', false)
  await choose(page, 'callerRole', 'REPRESENTATIVE')
  await say(page, 'callerName', 'Ripon (fictional)')
  await say(page, 'relationship', 'Brother')
  await say(page, 'applicantName', 'Moyuri (fictional)')
  await choose(page, 'identityDocument', 'UNAVAILABLE')
  await say(page, 'problem', 'Fictional report about a family dispute.')
  await say(page, 'district', 'Jaipurhat')
  await choose(page, 'contactChannel', 'PHONE')
  await say(page, 'contactValue', '01700000000')
  await choose(page, 'contactOwner', 'CALLER')
  await say(page, 'safeTime', 'Weekdays 10:00-12:00')
  await choose(page, 'smsSafe', false)

  const readback = page.getByRole('heading', { name: 'যা বলেছেন, একবার শুনে নিন' })
  await expect(readback).toBeFocused()
  await expect(page.getByText(/প্রতিনিধির দেওয়া তথ্য/)).toBeVisible()
  await press(page, 'সংশোধন করুন জেলা')
  await expect(page.getByRole('textbox', { name: steps.district.prompt })).toHaveValue('Jaipurhat')
  await say(page, 'district', 'Joypurhat')
  await expect(readback).toBeFocused()
  await press(page, 'ঠিক আছে, জমা দিন')

  const done = page.getByRole('heading', { name: /^আবেদন জমা হয়েছে: APP-\d{4}-\d{6}$/ })
  await expect(done).toBeFocused()
  const applicationId = (await done.textContent()).match(/APP-\d{4}-\d{6}/)[0]
  await expect(page.getByText(/কোনো রেকর্ডিং রাখা হয়নি/)).toBeVisible()

  await signIn(page, 'DLAO_OFFICER')
  const queueEntry = page.getByRole('link', { name: new RegExp(applicationId) })
  await expect(queueEntry).toHaveCount(1)
  await queueEntry.click()
  await expect(page.getByRole('heading', { name: applicationId })).toBeVisible()
  await expect(page.getByText('Ripon (fictional) · Brother · authority PENDING')).toBeVisible()
  await expect(page.getByText('Not created before acceptance')).toBeVisible()
  const facts = page.getByRole('region', { name: 'Fact provenance' }).getByRole('listitem')
  await expect(facts).toHaveCount(4)
  for (const fact of await facts.all()) {
    await expect(fact).toContainText('REPRESENTATIVE REPORTED')
    await expect(fact).toContainText('Caller confirmed: yes · Applicant confirmed: no')
  }
  await expect(facts.filter({ hasText: 'location.district' })).toContainText('Joypurhat')

  await page.getByRole('button', { name: 'Simulate call: unknown person answers' }).click()
  const script = page.getByRole('figure', { name: 'Neutral script' }).locator('blockquote')
  await expect(script).toBeVisible()
  for (const secret of [applicationId, 'Moyuri', 'Ripon', 'Joypurhat', 'family dispute', 'legal', 'আইনি', 'লিগ্যাল']) await expect(script).not.toContainText(secret)
  await expect(page.getByRole('region', { name: 'Contact history' })).toContainText('UNKNOWN PERSON')
  await expect(page.getByRole('region', { name: 'Tasks and next actions' })).toContainText('Plan safer follow-up')
  await expect(page.getByRole('region', { name: 'Audit timeline' })).toContainText('valid under demo assumptions')
})

test('refusing live voice switches to a minimal-data human callback', async ({ page }) => {
  await page.goto('/voice')
  await press(page, 'কীবোর্ডে উত্তর দিন')
  await choose(page, 'LIVE_VOICE', 'DENIED')
  await expect(page.getByText('Prototype state: MINIMAL_DATA_FALLBACK')).toBeVisible()
  await say(page, 'contactValue', '01800000000')
  await say(page, 'safeTime', 'Evening after 6 pm')
  await say(page, 'district', 'Barguna')
  await choose(page, 'urgent', false)
  await expect(page.getByRole('heading', { name: 'যা বলেছেন, একবার শুনে নিন' })).toBeFocused()
  await expect(page.getByText(steps.problem.label, { exact: true })).toHaveCount(0)
  await page.setViewportSize({ width: 375, height: 700 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await press(page, 'ঠিক আছে, জমা দিন')
  await expect(page.getByRole('heading', { name: /^আবেদন জমা হয়েছে: APP-\d{4}-\d{6}$/ })).toBeFocused()
  await expect(page.getByText(/নিরাপদ নম্বরে, নিরাপদ সময়ে ফোন করবেন/)).toBeVisible()
})
