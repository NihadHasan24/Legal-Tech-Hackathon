/* global process */
import { expect, test } from '@playwright/test'
import { expand, signIn } from './support.js'

test('Step 11: officer sees component disagreement and records a reasoned human triage decision', async ({ page, request }) => {
  const actors = JSON.parse(process.env.E2E_ACTORS)
  const login = async () => ({ authorization: `Bearer ${(await (await request.post('/api/auth/login', { data: actors.DLAO_OFFICER })).json()).token}` })
  const officer = await login()
  const submitted = await request.post('/api/applications', { headers: officer, data: { applicantName: 'Fictional triage disagreement E2E' } })
  expect(submitted.status()).toBe(201)
  const { applicationId } = await submitted.json()
  for (const [path, data] of [
    ['review', { reviewState: 'READY_FOR_DECISION', reason: 'Fictional triage case reviewed by a human DLAO officer.' }],
    ['accept', { reason: 'Fictional triage case accepted by a human DLAO officer.' }],
  ]) expect((await request.post(`/api/applications/${applicationId}/${path}`, { headers: officer, data })).ok()).toBeTruthy()
  for (const [field, value] of [['triage.case_category', 'LABOUR']]) {
    expect((await request.post(`/api/applications/${applicationId}/facts`, { headers: officer, data: { field, value, sourceType: 'STAFF_ENTERED' } })).ok()).toBeTruthy()
  }
  expect((await request.post(`/api/applications/${applicationId}/priority-override`, { headers: officer, data: {
    priorityDecision: 'ROUTINE', reason: 'Fictional initial routine priority recorded before a later safety flag.',
  } })).ok()).toBeTruthy()
  expect((await request.post(`/api/applications/${applicationId}/facts`, { headers: officer, data: {
    field: 'safety.urgent', value: 'YES', sourceType: 'STAFF_ENTERED',
  } })).ok()).toBeTruthy()

  await signIn(page, 'DLAO_OFFICER')
  await page.getByLabel('Application or Case ID').fill(applicationId)
  await page.getByRole('button', { name: 'Find record' }).click()
  await expect(page.getByRole('heading', { name: applicationId })).toBeVisible()
  await expand(page, /^AI triage/)
  const triage = page.getByRole('region', { name: /^AI triage/ })
  await triage.getByRole('button', { name: 'Run triage' }).click()
  await expect(triage.getByRole('alert').filter({ hasText: 'Components disagree' })).toContainText('resolve the conflict')
  await expect(triage.locator('article').filter({ hasText: 'Process and safety' })).toContainText('Safety review')
  await expect(triage.locator('article').filter({ hasText: 'Urgency and routing' })).toContainText('Routine review')
  await triage.getByLabel(/^Reason/).fill('The newer safety flag needs prompt human review despite the older routine priority.')
  await triage.getByRole('button', { name: 'Save triage decision' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Priority and route are unchanged' })).toBeVisible()
  const record = await (await request.get(`/api/applications/${applicationId}`, { headers: officer })).json()
  expect(record.priorityDecision).toBe('ROUTINE')
  const audit = await (await request.get(`/api/applications/${applicationId}/audit`, { headers: officer })).json()
  expect(audit.valid).toBeTruthy()
  expect(audit.events.some(({ action }) => action === 'TRIAGE_HUMAN_DECISION_RECORDED')).toBeTruthy()
})
