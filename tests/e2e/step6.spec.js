import { expect, test } from '@playwright/test'
import { expand, signIn } from './support.js'

test('Step 6 shared queue, audited human override, case support history, and safe helpline lookup', async ({ page, request }) => {
  await signIn(page, 'HELPLINE_AGENT')
  await page.getByLabel('Fictional applicant name').fill('Fictional Step Six Applicant')
  await page.getByRole('button', { name: 'Submit application' }).click()
  const receipt = page.getByRole('status').filter({ hasText: 'submitted to the DLAO queue' })
  await expect(receipt).toBeVisible()
  const applicationId = (await receipt.textContent()).match(/APP-\d{4}-\d{6}/)[0]
  const lookupCode = (await receipt.textContent()).match(/[a-f0-9]{24}/)[0]

  const officer = JSON.parse(process.env.E2E_ACTORS).DLAO_OFFICER
  const auth = await request.post('/api/auth/login', { data: officer })
  const { token } = await auth.json()
  const headers = { authorization: `Bearer ${token}` }
  expect((await request.post(`/api/applications/${applicationId}/safe-contact`, { headers, data: { allowedChannels: ['PHONE'], prohibitedChannels: ['SMS'], contactValue: '01700000000', smsSafe: false, neutralWordingRequired: true } })).ok()).toBeTruthy()
  expect((await request.post(`/api/applications/${applicationId}/facts`, { headers, data: { field: 'safety.urgent', value: 'YES', sourceType: 'STAFF_ENTERED' } })).ok()).toBeTruthy()

  await page.getByLabel('Application or Case ID').fill(applicationId)
  await page.getByLabel('Lookup code').fill(lookupCode)
  await page.getByLabel('I performed the approved human caller-verification procedure.').check()
  await page.getByRole('button', { name: 'Check permitted status' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'awaiting an officer decision' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(page, 'DLAO_OFFICER')
  await page.getByLabel('Queue flag').selectOption('URGENT_RECOMMENDATION')
  await expect(page.getByRole('link', { name: new RegExp(applicationId) })).toContainText('An urgent fact is recorded')
  await page.getByRole('link', { name: new RegExp(applicationId) }).click()
  await page.getByLabel('Priority decision').selectOption('ROUTINE')
  await page.getByRole('region', { name: /^Priority/ }).getByLabel(/^Reason/).fill('Officer reviewed the fictional urgent indicator and chose routine handling.')
  await page.getByRole('button', { name: 'Save priority' }).click()
  await expand(page, /^History/)
  await expect(page.getByRole('region', { name: /^History/ }).getByText(/Priority set by officer/)).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(page, 'CASE_SUPPORT')
  await page.getByLabel('Search shown history').fill(applicationId)
  await page.getByRole('link', { name: new RegExp(applicationId) }).click()
  const history = page.getByRole('region', { name: /^History/ })
  await expect(history.getByText(/Priority set by officer/)).toBeVisible()
  await expect(history.getByText(/Helpline status lookup/).first()).toBeVisible()
})
