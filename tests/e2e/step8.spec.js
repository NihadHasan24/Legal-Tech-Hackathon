import { expect, test } from '@playwright/test'
import { signIn } from './support.js'

test('Step 8 Nabila referral: urgency reasons, restricted evidence, ping-pong escalation, human routing, and non-acknowledgement follow-up', async ({ page, request }) => {
  test.setTimeout(120000)
  const actors = JSON.parse(process.env.E2E_ACTORS)
  const login = async (role) => ({ authorization: `Bearer ${(await (await request.post('/api/auth/login', { data: actors[role] })).json()).token}` })
  const officer = await login('DLAO_OFFICER')
  const receiving = await login('RECEIVING_DLAO')
  const { applicationId } = await (await request.post('/api/applications', { headers: officer, data: { applicantName: 'Fictional Nabila E2E' } })).json()
  const base = `/api/applications/${applicationId}`
  for (const [path, data] of [
    ['facts', { field: 'safety.urgent', value: 'YES', sourceType: 'STAFF_ENTERED' }],
    ['review', { reviewState: 'READY_FOR_DECISION', reason: 'Officer reviewed the fictional Nabila record.' }],
    ['accept', { reason: 'Officer accepted the fictional urgent matter.' }],
  ]) expect((await request.post(`${base}/${path}`, { headers: officer, data })).ok()).toBeTruthy()
  const openRecord = async () => {
    await page.getByLabel('Application or Case ID').fill(applicationId)
    await page.getByRole('button', { name: 'Find record' }).click()
    await expect(page.getByRole('heading', { name: applicationId })).toBeVisible()
  }
  const panel = page.getByRole('region', { name: 'Referral and jurisdiction' })
  const sendReferral = async (extra) => {
    await panel.getByLabel('Responsible receiving actor').selectOption({ label: 'Fictional Receiving DLAO · JHENAIDAH-DEMO' })
    await panel.getByLabel('Referral reason').fill('Fictional altered-image harassment may need another competent authority.')
    await panel.getByLabel('Relevant history').fill('Walk-in intake; urgent fact recorded; officer set urgent priority.')
    await panel.getByLabel('Expected action').fill('Acknowledge and confirm whether your office can act.')
    await panel.getByLabel('Fictional message log summary', { exact: true }).check()
    await extra?.()
    await panel.getByRole('button', { name: 'Send referral' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Referral sent' })).toBeVisible()
  }
  const returnReferral = async (reason) => {
    await page.getByRole('link', { name: /Referral from DEMO · SENT/ }).click()
    await expect(page.getByRole('heading', { name: 'Package' })).toBeVisible()
    await page.getByRole('button', { name: 'Acknowledge receipt' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Receipt acknowledged' })).toBeVisible()
    await page.getByLabel('Decision').selectOption('RETURN')
    await page.getByLabel('Response reason').fill(reason)
    await page.getByRole('button', { name: 'Record response' }).click()
    await expect(page.getByText(/Response recorded: returned/)).toBeVisible()
  }

  // Officer: rules-based urgency with reasons, restricted evidence classified at first upload, human final priority.
  await signIn(page, 'DLAO_OFFICER')
  await openRecord()
  await expect(page.getByText(/An urgent fact is recorded/)).toBeVisible()
  await page.getByLabel('Label', { exact: true }).fill('Synthetic placeholder: altered-image evidence')
  await page.getByLabel(/Highly sensitive evidence/).check()
  await page.getByRole('button', { name: 'Add metadata' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Restricted evidence recorded' })).toBeVisible()
  await page.getByLabel('Label', { exact: true }).fill('Fictional message log summary')
  await page.getByRole('button', { name: 'Add metadata' }).click()
  await expect(page.getByText('1 restricted sensitive-evidence item is on file.')).toBeVisible()
  await page.getByLabel('Priority decision').selectOption('URGENT')
  await page.getByLabel('Override reason').fill('Officer confirmed urgency from the listed reasons.')
  await page.getByRole('button', { name: 'Record priority override' }).click()
  await expect(page.getByText('HUMAN PRIORITY OVERRIDE', { exact: true })).toBeVisible()
  await sendReferral()

  // Receiving office sees the package but not the restricted evidence it was not authorised to receive.
  await signIn(page, 'RECEIVING_DLAO')
  await page.getByRole('link', { name: /Referral from DEMO · SENT/ }).click()
  await expect(page.getByText('Fictional altered-image harassment may need another competent authority.')).toBeVisible()
  await expect(page.getByText('Synthetic placeholder: altered-image evidence')).toHaveCount(0)
  const evidence = (await (await request.get(`${base}/documents`, { headers: officer })).json()).find(({ sensitivity }) => sensitivity === 'RESTRICTED')
  expect((await request.get(`/api/documents/${evidence.id}`, { headers: receiving })).status()).toBe(403)
  await page.getByRole('link', { name: '← Workspace' }).click()
  await returnReferral('Fictional: this office lacks jurisdiction over the online harm.')

  // Second transfer shares restricted evidence with a recorded necessity reason; the responsible actor opens it.
  await signIn(page, 'DLAO_OFFICER')
  await openRecord()
  await expect(panel.getByText('Return reason: Fictional: this office lacks jurisdiction over the online harm.')).toBeVisible()
  await sendReferral(async () => {
    await panel.getByLabel('Synthetic placeholder: altered-image evidence', { exact: true }).check()
    await panel.getByLabel('Why this restricted evidence must be shared').fill('Receiving office must assess the synthetic image evidence to act.')
  })
  await signIn(page, 'RECEIVING_DLAO')
  await page.getByRole('link', { name: /Referral from DEMO · SENT/ }).click()
  await page.getByRole('button', { name: 'Open Synthetic placeholder: altered-image evidence' }).click()
  await expect(page.getByRole('heading', { name: 'Synthetic placeholder: altered-image evidence', level: 3 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Earlier returns of this case' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.getByRole('link', { name: '← Workspace' }).click()
  await returnReferral('Fictional: returned; the first office should act.')

  // Two returns escalate; only a recorded human decision sets the route.
  await signIn(page, 'DLAO_OFFICER')
  await openRecord()
  await expect(page.getByRole('heading', { name: 'Jurisdiction escalation: authorised routing decision required' })).toBeVisible()
  await expect(panel.getByText(/Returned transfers: 2/)).toBeVisible()
  await expect(panel.getByText(/Further transfers are blocked/)).toBeVisible()
  await expect(page.getByText('JURISDICTION ESCALATED', { exact: true })).toBeVisible()
  await expect(page.getByText(/GRANTED · Fictional Receiving DLAO/)).toBeVisible()
  await expect(page.getByText(/DENIED · Fictional Receiving DLAO/)).toBeVisible()
  await panel.getByLabel('Route', { exact: true }).selectOption('REFER')
  await panel.getByLabel('Office that must act').selectOption('JHENAIDAH-DEMO')
  await panel.getByLabel('Routing decision reason').fill('Authorised officer decided Jhenaidah must act on the fictional matter.')
  await panel.getByRole('button', { name: 'Record routing decision' }).click()
  await expect(page.getByText('HUMAN ROUTING DECISION', { exact: true })).toBeVisible()
  await expect(panel.getByText(/refer to JHENAIDAH-DEMO/)).toBeVisible()

  // Failure test: the routed office never acknowledges, so the deadline passes and a follow-up appears.
  const [receiver] = await (await request.get('/api/referrals/receivers', { headers: officer })).json()
  const late = await request.post(`${base}/referrals`, { headers: officer, data: {
    responsibleUserId: receiver.userId, reason: 'Fictional routed referral as decided by the authorised officer.',
    history: 'Two earlier returns; authorised routing decision recorded.', expectedAction: 'Acknowledge and act on the fictional matter.',
    dueAt: new Date(Date.now() + 3000).toISOString(), documentIds: [], sensitiveDocumentIds: [],
  } })
  expect(late.status()).toBe(201)
  await expect(async () => {
    await page.getByRole('link', { name: '← Workspace' }).click()
    await openRecord()
    await expect(page.getByText('Referral not acknowledged: follow up')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 30000 })
  await expect(panel.getByText('Acknowledgement overdue')).toBeVisible()
  await expect(page.getByText('REFERRAL ACK OVERDUE', { exact: true })).toBeVisible()
})
