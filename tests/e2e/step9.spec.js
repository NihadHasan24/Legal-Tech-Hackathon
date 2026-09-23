/* global process */
import { expect, test } from '@playwright/test'
import { expand, signIn } from './support.js'

test('Step 9 Malek: panel worklist, late updates, accessible status, human hold review, and payment status', async ({ page, request }) => {
  test.setTimeout(120000)
  const actors = JSON.parse(process.env.E2E_ACTORS)
  const login = async (role) => ({ authorization: `Bearer ${(await (await request.post('/api/auth/login', { data: actors[role] })).json()).token}` })
  const officer = await login('DLAO_OFFICER')
  const helpline = await login('HELPLINE_AGENT')
  const submitted = await request.post('/api/applications', { headers: helpline, data: { applicantName: 'Fictional Malek Step 9 E2E' } })
  expect(submitted.status()).toBe(201)
  const { applicationId, lookupCode } = await submitted.json()
  const base = `/api/applications/${applicationId}`
  for (const [path, data] of [
    ['review', { reviewState: 'READY_FOR_DECISION', reason: 'Fictional Malek intake reviewed by a human DLAO officer.' }],
    ['accept', { reason: 'Human DLAO officer accepted the fictional Malek case.' }],
    ['safe-contact', { allowedChannels: ['IN_PERSON'], prohibitedChannels: ['PHONE', 'SMS'], safeTimeWindow: 'Caller-initiated in-person lookup only', smsSafe: false, neutralWordingRequired: true }],
  ]) expect((await request.post(`${base}/${path}`, { headers: officer, data })).ok()).toBeTruthy()
  const accepted = await (await request.get(`${base}`, { headers: officer })).json()
  const { caseId } = accepted
  const hearing = new Date(Date.now() + 14 * 86400000).toISOString()
  const nextAction = 'Visit the office before the hearing; confirm a safe travel plan first.'
  expect((await request.post(`/api/lawyers/applications/${applicationId}/case-plan`, { headers: officer, data: {
    nextHearingAt: hearing, nextAction, reason: 'Fictional case plan recorded by a human officer.',
  } })).ok()).toBeTruthy()
  expect((await request.post(`${base}/contact-attempts`, { headers: officer, data: {
    channel: 'PHONE', outcome: 'UNKNOWN_PERSON', reason: 'Fictional shop number: another person answered; no case details were disclosed.',
  } })).ok()).toBeTruthy()
  const management = await (await request.get(`/api/lawyers/applications/${applicationId}`, { headers: officer })).json()
  const offer = await request.post(`/api/lawyers/applications/${applicationId}/assignments`, { headers: officer, data: {
    lawyerUserId: management.panelLawyers[0].id,
    reason: 'Fictional panel assignment for the Malek case.',
  } })
  expect(offer.status()).toBe(201)
  const assignmentId = (await offer.json()).assignmentId

  await signIn(page, 'PANEL_LAWYER')
  await page.getByRole('link', { name: new RegExp(caseId) }).click()
  await expect(page.getByRole('heading', { name: 'Respond to assignment offer' })).toBeVisible()
  await page.getByLabel('Reason for accepting or declining').fill('I accept this fictional panel assignment and will report progress.')
  await page.getByRole('button', { name: 'Accept assignment' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Assignment accepted' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Required progress updates' })).toBeVisible()
  for (const offset of [8000, 10000]) expect((await request.post(`/api/lawyers/applications/${applicationId}/update-schedules`, { headers: officer, data: {
    assignmentId, dueAt: new Date(Date.now() + offset).toISOString(), instruction: 'Send the DLAO a mandatory progress update before the next hearing.',
  } })).ok()).toBeTruthy()
  await expect.poll(async () => {
    const state = await (await request.get(`/api/lawyers/applications/${applicationId}`, { headers: officer })).json()
    return state.assignments.find(({ id }) => id === assignmentId)?.hold?.newAssignmentHold
  }, { timeout: 30000 }).toBe(true)
  const panelPage = await page.context().newPage()
  await signIn(panelPage, 'PANEL_LAWYER')
  await panelPage.getByRole('link', { name: new RegExp(caseId) }).click()
  await expect(panelPage.locator('.plain-list li').filter({ hasText: /Update 1/ })).toContainText('Missed')
  await panelPage.getByLabel('Progress report').first().fill('The fictional file was reviewed; no confidential details were added.')
  await panelPage.getByLabel('Next step').first().fill('The DLAO will confirm the safe next step before travel.')
  await panelPage.getByRole('button', { name: 'Submit progress update' }).first().click()
  await expect(panelPage.getByRole('status').filter({ hasText: 'Progress update 1 recorded' })).toBeVisible()
  await panelPage.close()

  const officePage = await page.context().newPage()
  await signIn(officePage, 'DLAO_OFFICER')
  await expect(officePage.getByRole('link', { name: /Lawyer update overdue/ })).toBeVisible()
  await officePage.getByLabel('Application or Case ID').fill(applicationId)
  await officePage.getByRole('button', { name: 'Find record' }).click()
  await expect(officePage.getByRole('heading', { name: applicationId })).toBeVisible()
  await expect(officePage.getByText(/New assignments on hold: review needed/)).toBeVisible()
  await expect(officePage.getByText(/No misconduct finding/)).toBeVisible()
  await officePage.getByLabel('Hold review reason').fill('Continue the temporary hold pending human review.')
  await officePage.getByRole('button', { name: 'Continue hold' }).click()
  await expect(officePage.getByRole('status').filter({ hasText: 'Hold continued' })).toBeVisible()

  const payment = officePage.getByRole('heading', { name: /^Payment status/ }).locator('..')
  await expand(payment, 'Record payment status')
  await payment.getByLabel('Work stage').selectOption('HEARING_ATTENDANCE')
  await payment.getByLabel(/^Status/).selectOption('UNDER_REVIEW')
  await payment.getByLabel(/^Note/).fill('Fictional attendance entry for reconciliation only.')
  await payment.getByRole('button', { name: 'Save payment status' }).click()
  await expect(officePage.getByRole('status').filter({ hasText: 'No money moved' })).toBeVisible()

  const helplinePage = await page.context().newPage()
  await signIn(helplinePage, 'HELPLINE_AGENT')
  await helplinePage.getByLabel('Application or Case ID').focus()
  await helplinePage.keyboard.insertText(caseId)
  await helplinePage.keyboard.press('Tab')
  await helplinePage.keyboard.insertText(lookupCode)
  await helplinePage.keyboard.press('Tab')
  await helplinePage.keyboard.press('ArrowDown')
  await helplinePage.keyboard.press('Tab')
  await helplinePage.keyboard.press('Space')
  await helplinePage.keyboard.press('Tab')
  await helplinePage.keyboard.press('Enter')
  const status = helplinePage.getByRole('status').filter({ hasText: applicationId })
  await expect(status).toContainText(caseId)
  await expect(status).toContainText(nextAction)
  await expect(status).toContainText(new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(hearing)))
  await helplinePage.getByLabel('Applicant’s stated reason').fill('The applicant asks the DLAO to review the current lawyer assignment.')
  await helplinePage.getByRole('button', { name: 'Send request to DLAO review' }).click()
  await expect(helplinePage.getByRole('status').filter({ hasText: 'will review the request' })).toBeVisible()
  await officePage.close()
  await helplinePage.close()
})
