/* global process */
import { expect, test } from '@playwright/test'
import { signIn } from './support.js'

test('Step 12: two parties sign asynchronously, one offline packet syncs, and edited copy fails verification', async ({ page, request }) => {
  const actors = JSON.parse(process.env.E2E_ACTORS)
  const headersFor = async (role) => {
    const response = await request.post('/api/auth/login', { data: actors[role] })
    return { authorization: `Bearer ${(await response.json()).token}` }
  }
  const officer = await headersFor('DLAO_OFFICER')
  const mediator = await headersFor('MEDIATOR')
  const submitted = await request.post('/api/applications', { headers: officer, data: { applicantName: 'Fictional Step 12 e-sign applicant' } })
  expect(submitted.status()).toBe(201)
  const { applicationId } = await submitted.json()
  for (const [action, body] of [
    ['review', { reviewState: 'READY_FOR_DECISION', reason: 'A human DLAO officer reviewed this fictional matter.' }],
    ['accept', { reason: 'A human DLAO officer accepted this fictional matter.' }],
  ]) expect((await request.post(`/api/applications/${applicationId}/${action}`, { headers: officer, data: body })).ok()).toBeTruthy()
  expect((await request.post(`/api/applications/${applicationId}/mediation`, { headers: officer, data: {} })).ok()).toBeTruthy()
  expect((await request.post(`/api/applications/${applicationId}/mediation/claim`, { headers: mediator, data: {} })).ok()).toBeTruthy()
  const mediationPath = `/api/applications/${applicationId}/mediation`
  for (const [suffix, data] of [
    ['/schedule', {
      mode: 'REMOTE', scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      inPersonFallback: 'Meet at the fictional district legal-aid office if remote access fails.',
      notices: ['PARTY_A', 'PARTY_B'].map((party) => ({ party, deliveryState: 'DELIVERED', reason: 'A human recorded delivery through an approved route.' })),
    }],
    ['/advance', {}],
    ['/documents/review', { reason: 'The mediator reviewed the fictional documents without making a legal finding.' }],
    ['/advance', {}],
    ['/attendance', { partyA: 'ATTENDED', partyB: 'ATTENDED', reason: 'Both fictional parties were recorded as present.' }],
    ['/advance', {}],
    ['/outcome', { outcome: 'AGREEMENT_REACHED', reason: 'The mediator recorded the fictional agreement.' }],
    ['/draft', { template: 'MAINTENANCE', notes: 'Fictional parties agreed on a monthly amount and review date.', identifiersRemoved: true }],
    ['/draft/review', { partyAUnderstands: true, partyAConsents: true, partyBUnderstands: true, partyBConsents: true, reason: 'Both fictional parties confirmed understanding and consent to the draft.' }],
  ]) expect((await request.post(`${mediationPath}${suffix}`, { headers: mediator, data })).ok()).toBeTruthy()

  await signIn(page, 'MEDIATOR')
  await page.getByRole('link', { name: new RegExp(applicationId) }).click()
  await expect(page.getByRole('heading', { name: 'Asynchronous signatures' })).toBeVisible()
  await page.getByLabel('Local passphrase for encrypted offline signature packets').fill('FictionalSignSecret!')
  const signatureRequests = []
  page.on('request', (outgoing) => {
    if (outgoing.url().endsWith('/signatures') && outgoing.method() === 'POST') signatureRequests.push(JSON.parse(outgoing.postData()))
  })
  await page.getByRole('button', { name: 'Create PARTY A signature and sync' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'PARTY A signature was synced and verified' })).toBeVisible()

  await page.getByLabel('Signer role witnessed by mediator').selectOption('PARTY_B')
  await page.context().setOffline(true)
  await expect(page.getByRole('status').filter({ hasText: 'Connection: offline' })).toBeVisible()
  await page.getByRole('button', { name: 'Create PARTY B signature offline' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'encrypted signatures awaiting sync: 1' })).toBeVisible()
  const packets = await page.evaluate(() => new Promise((resolve, reject) => {
    const opened = indexedDB.open('dlas-offline-v1', 2)
    opened.onerror = () => reject(opened.error)
    opened.onsuccess = () => {
      const db = opened.result
      const request = db.transaction('signature-queue').objectStore('signature-queue').getAll()
      request.onsuccess = () => { resolve(request.result); db.close() }
      request.onerror = () => reject(request.error)
    }
  }))
  expect(packets).toHaveLength(1)
  expect(JSON.stringify(packets[0])).not.toContain('Fictional parties agreed')
  expect(packets[0]).not.toHaveProperty('privateKey')

  await page.context().setOffline(false)
  await expect(page.getByRole('status').filter({ hasText: 'offline PARTY B signature synced and verified' })).toBeVisible()
  await page.getByLabel('Signer role witnessed by mediator').selectOption('MEDIATOR')
  await page.getByRole('button', { name: 'Create MEDIATOR signature and sync' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'MEDIATOR signature was synced and verified' })).toBeVisible()
  await expect(page.getByRole('definition').filter({ hasText: 'PENDING CLAO CERTIFICATION' })).toBeVisible()
  expect(signatureRequests).toHaveLength(3)
  for (const signed of signatureRequests) {
    expect(Object.keys(signed).sort()).toEqual(['clientMutationId', 'clientSignedAt', 'documentHash', 'draftVersion', 'publicKeyJwk', 'signature', 'signerRole'].sort())
    expect(signed.publicKeyJwk).not.toHaveProperty('d')
  }

  const state = await (await request.get(mediationPath, { headers: mediator })).json()
  expect(state.mediation.stage).toBe('PENDING_CLAO_CERTIFICATION')
  expect(state.mediation.legalEffectState).toBe('LEGAL_EFFECT_REQUIRES_AUTHORISED_REVIEW')
  const serverVerification = await request.post(`${mediationPath}/verify`, { headers: mediator, data: {} })
  expect((await serverVerification.json()).allValid).toBeTruthy()

  await page.getByRole('link', { name: 'Open independent signature verifier' }).first().click()
  await page.getByRole('button', { name: 'Verify this document on this device' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'All three signatures match this document version.' })).toBeVisible()
  await page.getByRole('button', { name: 'Test a changed copy' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Verification failed or fewer than three signatures are present.' })).toBeVisible()
  expect((await (await request.post(`${mediationPath}/verify`, { headers: mediator, data: {} })).json()).allValid).toBeTruthy()
})
