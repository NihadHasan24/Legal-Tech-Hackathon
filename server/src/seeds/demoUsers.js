import { randomBytes, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import mongoose from 'mongoose'
import * as models from '../models/index.js'
import { Application, Case, CaseFact, ContactAttempt, LawyerAssignment, LawyerUpdate, Referral, RoleAssignment, SafeContactProfile, User } from '../models/index.js'
import { acceptApplication, addFact, createDocumentMetadata, overridePriority, recordContactAttempt, reviewApplication, setSafeContact, submitApplication, submitVoiceIntake } from '../services/applicationService.js'
import { createAssisted } from '../services/assistedService.js'
import { createRelatedIncidentGroup, linkRelatedIncidentEvidence } from '../services/incidentService.js'
import { assignLawyer, respondToAssignment, scheduleLawyerUpdate, updateCasePlan } from '../services/lawyerService.js'
import { startMediation } from '../services/mediationService.js'
import { createReferral, respondReferral } from '../services/referralService.js'
import { hashPassword } from '../utils/password.js'

const accounts = [
  ['demo.officer', 'Demo DLAO Officer', 'DLAO_OFFICER'],
  ['demo.mediator', 'Demo Mediator', 'MEDIATOR'],
  ['demo.helpline', 'Demo Helpline Agent', 'HELPLINE_AGENT'],
  ['demo.udc', 'Demo UDC Operator', 'UDC_OPERATOR'],
  ['demo.lawyer', 'Demo Panel Lawyer', 'PANEL_LAWYER'],
  // A separate office so referrals leave the sending DLAO.
  ['demo.receiving', 'Demo Receiving DLAO', 'RECEIVING_DLAO', 'JHENAIDAH-DEMO'],
  ['demo.support', 'Demo Case Support', 'CASE_SUPPORT'],
  ['demo.clao', 'Demo CLAO', 'CLAO'],
]

const credentialsFile = new URL('../../.demo-credentials.json', import.meta.url)

async function credentials() {
  try {
    return JSON.parse(await readFile(credentialsFile, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const generated = Object.fromEntries(accounts.map(([username]) => [username, randomBytes(24).toString('base64url')]))
  await writeFile(credentialsFile, JSON.stringify(generated, null, 2), { flag: 'wx', mode: 0o600 })
  return generated
}

async function ensureDemoRecord({ demoSeedKey, applicantName, facts = [] }, actor, accepted = false) {
  let application = await Application.findOne({ demoSeedKey })
  if (!application) {
    const created = await submitApplication({ applicantName, demoSeedKey }, actor)
    application = await Application.findOne({ applicationId: created.applicationId })
  }
  for (const [field, value] of facts) if (!await CaseFact.exists({ applicationId: application.applicationId, field })) {
    await addFact(application.applicationId, { field, value, sourceType: 'STAFF_ENTERED' }, actor)
  }
  if (accepted && application.status !== 'ACCEPTED') {
    if (application.reviewState !== 'READY_FOR_DECISION') await reviewApplication(application.applicationId, {
      reviewState: 'READY_FOR_DECISION', reason: 'Fictional demo Case reviewed by a human DLAO officer.',
    }, actor)
    await acceptApplication(application.applicationId, 'Fictional demo Case accepted by a human DLAO officer.', actor)
  }
  return Application.findOne({ applicationId: application.applicationId })
}

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dlas', { dbName: process.env.MONGODB_DB || 'dlas', serverSelectionTimeoutMS: 10000 })
  await Promise.all(Object.values(models).map((item) => item.init()))
  const passwords = await credentials()
  for (const [username, displayName, role, officeCode = 'DEMO'] of accounts) {
    if (typeof passwords[username] !== 'string') throw new Error('Demo credential file is incomplete.')
    const passwordHash = await hashPassword(passwords[username])
    const user = await User.findOneAndUpdate(
      { username },
      { $set: { displayName, passwordHash, active: true, fictional: true } },
      { upsert: true, returnDocument: 'after' },
    )
    await RoleAssignment.updateOne(
      { userId: user._id, role, officeCode },
      { $set: { active: true } },
      { upsert: true },
    )
    await RoleAssignment.updateMany({ userId: user._id, role, officeCode: { $ne: officeCode } }, { $set: { active: false } })
  }
  let sample = await Application.findOne({ demoSeedKey: 'STEP3_SIMPLE' })
  if (!sample) {
    const helpline = await User.findOne({ username: 'demo.helpline' })
    const assignment = await RoleAssignment.findOne({ userId: helpline._id, role: 'HELPLINE_AGENT', active: true })
    const submitted = await submitApplication(
      { applicantName: 'Fictional Demo Applicant', demoSeedKey: 'STEP3_SIMPLE' },
      { userId: helpline._id, assignments: [assignment] },
    )
    sample = await Application.findOne({ applicationId: submitted.applicationId })
  }
  if (sample.status === 'SUBMITTED') {
    const officer = await User.findOne({ username: 'demo.officer' })
    const assignment = await RoleAssignment.findOne({ userId: officer._id, role: 'DLAO_OFFICER', active: true })
    const actor = { userId: officer._id, assignments: [assignment] }
    if (sample.reviewState !== 'READY_FOR_DECISION') {
      await reviewApplication(sample.applicationId, {
        reviewState: 'READY_FOR_DECISION',
        reason: 'Fictional seed record reviewed by the demo officer.',
      }, actor)
    }
    await acceptApplication(sample.applicationId, 'Fictional seed record accepted by the demo officer.', actor)
  }
  if (!await Application.exists({ demoSeedKey: 'STEP4_MOYURI_RIPON' })) {
    const submitted = await submitVoiceIntake({
      mode: 'INTAKE',
      answers: {
        urgent: false, callerRole: 'REPRESENTATIVE', callerName: 'Fictional Ripon (demo)', relationship: 'Brother',
        applicantName: 'Fictional Moyuri (demo)', identityDocument: 'UNAVAILABLE',
        problem: 'Fictional representative report; applicant confirmation remains pending.', district: 'Joypurhat',
        contactChannel: 'IN_PERSON', safeTime: 'Weekday morning at the office', smsSafe: false,
      },
    })
    await Application.updateOne({ applicationId: submitted.applicationId }, { $set: { demoSeedKey: 'STEP4_MOYURI_RIPON' } })
  }
  if (!await Application.exists({ demoSeedKey: 'STEP7_NUCHING' })) {
    const udc = await User.findOne({ username: 'demo.udc' })
    const udcRole = await RoleAssignment.findOne({ userId: udc._id, role: 'UDC_OPERATOR', active: true })
    const created = await createAssisted({
      temporaryId: randomUUID(), clientMutationId: randomUUID(), offlineCreatedAt: new Date().toISOString(),
      applicantName: 'Fictional Nuching (demo)', translatorName: 'Fictional Marma translator', typistName: udc.displayName,
      originalLanguage: 'Marma', originalStatement: 'Fictional Marma account: a land record needs review.',
      translatedStatement: 'নমুনা বাংলা অনুবাদ: জমির নথিটি একজন কর্মকর্তার দেখে দেওয়া দরকার।',
      caseType: 'LAND', consentAttestation: 'Fictional applicant gave oral consent to assisted intake.',
      originalConfirmed: false, translationConfirmed: false, contactChannel: 'IN_PERSON', safeTime: 'Weekday morning at the office',
    }, { userId: udc._id, displayName: udc.displayName, assignments: [udcRole] })
    await Application.updateOne({ applicationId: created.applicationId }, { $set: { demoSeedKey: 'STEP7_NUCHING' } })
  }
  if (!await Application.exists({ demoSeedKey: 'STEP8_NABILA' })) {
    const officer = await User.findOne({ username: 'demo.officer' })
    const actor = { userId: officer._id, assignments: [await RoleAssignment.findOne({ userId: officer._id, role: 'DLAO_OFFICER', active: true })] }
    const { applicationId } = await submitApplication({ applicantName: 'Fictional Nabila (demo)', demoSeedKey: 'STEP8_NABILA' }, actor)
    const { applicantPersonId } = await Application.findOne({ applicationId }).lean()
    const reported = { sourceType: 'APPLICANT_REPORTED', sourcePersonId: applicantPersonId.toString() }
    await addFact(applicationId, { field: 'complaint.summary', value: 'Fictional: a former classmate is spreading altered images and pressuring the applicant. The harm is spreading, and another competent authority may need to act.', ...reported }, actor)
    await addFact(applicationId, { field: 'safety.urgent', value: 'YES', ...reported }, actor)
    await setSafeContact(applicationId, { allowedChannels: ['IN_PERSON'], prohibitedChannels: ['PHONE', 'SMS'], safeTimeWindow: 'Weekday office hours', smsSafe: false, neutralWordingRequired: true }, actor)
    await createDocumentMetadata(applicationId, { label: 'Synthetic placeholder: altered-image evidence', qualityState: 'READABLE', note: 'Harmless synthetic placeholder; no real image is stored.', sensitivity: 'RESTRICTED' }, actor)
    await createDocumentMetadata(applicationId, { label: 'Fictional message log summary', qualityState: 'READABLE' }, actor)
    await reviewApplication(applicationId, { reviewState: 'READY_FOR_DECISION', reason: 'Fictional seed: the officer reviewed the Nabila intake.' }, actor)
    await acceptApplication(applicationId, 'Fictional seed: accepted for the Step 8 referral demo.', actor)
  }

  let malek = await Application.findOne({ demoSeedKey: 'STEP9_MALEK' })
  const officer = await User.findOne({ username: 'demo.officer' })
  const officerRole = await RoleAssignment.findOne({ userId: officer._id, role: 'DLAO_OFFICER', active: true })
  const officerActor = { userId: officer._id, assignments: [officerRole] }
  if (!malek) {
    const helpline = await User.findOne({ username: 'demo.helpline' })
    const helplineRole = await RoleAssignment.findOne({ userId: helpline._id, role: 'HELPLINE_AGENT', active: true })
    const created = await submitApplication({ applicantName: 'Fictional Malek (demo)', demoSeedKey: 'STEP9_MALEK' }, { userId: helpline._id, assignments: [helplineRole] })
    malek = await Application.findOne({ applicationId: created.applicationId })
    passwords.demo_malek_status_lookup_code = created.lookupCode
    await writeFile(credentialsFile, JSON.stringify(passwords, null, 2), { mode: 0o600 })
  }
  if (!await CaseFact.exists({ applicationId: malek.applicationId, field: 'complaint.summary' })) {
    await addFact(malek.applicationId, { field: 'complaint.summary', value: 'Fictional scenario detail: this wage matter has remained unresolved for about seven months. No amount or real employer is recorded.', sourceType: 'STAFF_ENTERED' }, officerActor)
  }
  if (!await SafeContactProfile.exists({ applicationId: malek.applicationId })) {
    await setSafeContact(malek.applicationId, {
      allowedChannels: ['PHONE', 'IN_PERSON'], prohibitedChannels: ['SMS'],
      contactValue: 'Synthetic demo shop number only; not dialable.', safeTimeWindow: 'Caller-initiated status lookup; neutral wording only if another person answers.',
      smsSafe: false, neutralWordingRequired: true,
    }, officerActor)
  }
  if (malek.status === 'SUBMITTED') {
    if (malek.reviewState !== 'READY_FOR_DECISION') await reviewApplication(malek.applicationId, { reviewState: 'READY_FOR_DECISION', reason: 'Fictional Malek scenario reviewed by the demo officer.' }, officerActor)
    await acceptApplication(malek.applicationId, 'Fictional Malek scenario accepted by the demo officer.', officerActor)
  }
  if (!await ContactAttempt.exists({ applicationId: malek.applicationId, outcome: 'UNKNOWN_PERSON' })) {
    await recordContactAttempt(malek.applicationId, { channel: 'PHONE', outcome: 'UNKNOWN_PERSON', reason: 'Fictional shop line: another person answered; neutral wording only and no case facts were disclosed.' }, officerActor)
  }
  const caseRecord = await Case.findOne({ applicationId: malek.applicationId })
  if (!caseRecord.nextHearingAt || !caseRecord.nextAction) {
    const hearing = new Date(Date.now() + 14 * 86400000)
    await updateCasePlan(malek.applicationId, { nextHearingAt: hearing.toISOString(), nextAction: 'Visit the DLAO office before the listed hearing to review the file; confirm a safe travel plan first.', reason: 'Fictional seven-month case plan for the demo.' }, officerActor)
  }
  let assignment = await LawyerAssignment.findOne({ applicationId: malek.applicationId, active: true, status: { $in: ['PENDING', 'ACCEPTED'] } })
  const lawyer = await User.findOne({ username: 'demo.lawyer' })
  const lawyerRole = await RoleAssignment.findOne({ userId: lawyer._id, role: 'PANEL_LAWYER', officeCode: 'DEMO', active: true })
  const lawyerActor = { userId: lawyer._id, assignments: [lawyerRole] }
  if (!assignment) {
    await assignLawyer(malek.applicationId, { lawyerUserId: lawyer._id.toString(), reason: 'Fictional panel assignment for the Malek demo case.' }, officerActor)
    assignment = await LawyerAssignment.findOne({ applicationId: malek.applicationId, active: true, status: 'PENDING' })
  }
  if (assignment.status === 'PENDING') await respondToAssignment(assignment._id.toString(), { decision: 'ACCEPT', reason: 'I accept this fictional panel assignment.' }, lawyerActor)
  if (!await LawyerUpdate.exists({ assignmentId: assignment._id })) {
    await scheduleLawyerUpdate(malek.applicationId, {
      assignmentId: assignment._id.toString(), dueAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      instruction: 'Record the file review and confirm the applicant-safe next step before the hearing.',
    }, officerActor)
  }

  const factoryExamples = [
    ['STEP10_FACTORY_FIRE_1', 'Fictional factory worker one', 'Fictional report: smoke reached the east packing area during a simulated factory fire.'],
    ['STEP10_FACTORY_FIRE_2', 'Fictional factory worker two', 'Fictional report: a separate worker describes the same simulated factory fire and requests an individual safety review.'],
    ['STEP10_FACTORY_FIRE_3', 'Fictional factory worker three', 'Fictional report: another separate claim concerns the simulated factory fire; personal instructions and outcome stay on this Case.'],
  ]
  const fireApplications = []
  for (const [demoSeedKey, applicantName, summary] of factoryExamples) {
    fireApplications.push(await ensureDemoRecord({ demoSeedKey, applicantName, facts: [['complaint.summary', summary]] }, officerActor, true))
  }
  const fireIds = fireApplications.map(({ applicationId }) => applicationId)
  const groupTitle = 'Fictional factory fire - separate claims'
  let incidentGroup = await models.RelatedIncidentGroup.findOne({ title: groupTitle, applicationIds: { $all: fireIds } })
  if (!incidentGroup) {
    const created = await createRelatedIncidentGroup({
      applicationIds: fireIds, title: groupTitle,
      reason: 'Fictional claims describe one simulated factory fire; individual Cases remain separate.',
    }, officerActor)
    incidentGroup = await models.RelatedIncidentGroup.findById(created.id)
  }
  const evidenceLabel = 'Fictional factory fire inspection bulletin'
  let sharedDocument = await models.Document.findOne({ applicationId: fireIds[0], label: evidenceLabel })
  if (!sharedDocument) {
    const document = await createDocumentMetadata(fireIds[0], {
      label: evidenceLabel, qualityState: 'READABLE', filename: 'fictional-fire-bulletin.txt',
      textContent: 'Fictional demo evidence only: the simulated east packing area alarm activated during a tabletop exercise. This text is not a real inspection report.',
    }, officerActor)
    sharedDocument = await models.Document.findById(document.id)
  }
  if (!incidentGroup.commonDocumentIds.some((id) => id.equals(sharedDocument._id))) await linkRelatedIncidentEvidence(incidentGroup.id, {
    documentId: sharedDocument.id, reason: 'Shared fictional tabletop-exercise bulletin is relevant to all three linked claims.',
  }, officerActor)

  const duplicateExamples = [
    ['Amina Rahman', '00000000001', '1990-02-03', 'DEMO NORTH'],
    ['Amina Rahman', '00000000001', '1990-02-03', 'DEMO NORTH'],
    ['Amina Rehman', '00000000001', '1990-02-03', 'DEMO NORTH'],
    ['Salma Khatun', '00000000004', '1985-01-01', 'DEMO SOUTH'],
    ['Salma Khatun', '00000000005', '1994-04-02', 'DEMO SOUTH'],
    ['Rahima Begum', '00000000006', '1984-03-04', 'DEMO WEST'],
    ['Rahima Begum', '00000000006', '1978-11-18', 'DEMO WEST'],
    ['Rafiq Uddin', '00000000008', '1980-02-09', 'DEMO EAST'],
    ['Rafique Uddin', '00000000008', '1980-02-09', 'DEMO EAST'],
    ['Sharif Hossain', '00000000010', '1991-07-14', 'DEMO CENTRAL'],
    ['Nasima Akter', '00000000011', '1992-11-20', 'DEMO CENTRAL'],
    ['Jamal Uddin', '00000000012', '1988-06-16', 'DEMO SOUTH'],
  ]
  for (const [index, [applicantName, phone, dateOfBirth, district]] of duplicateExamples.entries()) {
    await ensureDemoRecord({
      demoSeedKey: `STEP10_DUP_${String(index + 1).padStart(2, '0')}`, applicantName,
      facts: [['contact.phone', phone], ['person.date_of_birth', dateOfBirth], ['location.district', district]],
    }, officerActor)
  }
  const triageSamples = [
    ['STEP3_SIMPLE', 'Fictional Demo Applicant', 'OTHER'],
    ['STEP8_NABILA', 'Fictional Nabila (demo)', 'OTHER'],
    ['STEP9_MALEK', 'Fictional Malek (demo)', 'LABOUR'],
    ['STEP10_FACTORY_FIRE_1', 'Fictional factory worker one', 'OTHER'],
    ['STEP10_FACTORY_FIRE_2', 'Fictional factory worker two', 'OTHER'],
  ]
  for (const [demoSeedKey, applicantName, category] of triageSamples) await ensureDemoRecord({
    demoSeedKey, applicantName, facts: [['triage.case_category', category]],
  }, officerActor)
  const triageConflict = await ensureDemoRecord({
    demoSeedKey: 'STEP11_TRIAGE_CONFLICT', applicantName: 'Fictional triage disagreement case',
    facts: [
      ['complaint.summary', 'Fictional tabletop case: the initial wage note says no immediate danger was reported.'],
      ['triage.case_category', 'LABOUR'],
    ],
  }, officerActor, true)
  if (!triageConflict.priorityDecision) await overridePriority(triageConflict.applicationId, {
    priorityDecision: 'ROUTINE', reason: 'Fictional initial routine priority recorded before a later safety flag.',
  }, officerActor)
  if (!await CaseFact.exists({ applicationId: triageConflict.applicationId, field: 'safety.urgent' })) await addFact(triageConflict.applicationId, {
    field: 'safety.urgent', value: 'YES', sourceType: 'STAFF_ENTERED',
  }, officerActor)
  const mediationExamples = [
    ['STEP12_MAINTENANCE', 'Fictional maintenance mediation applicant', 'FAMILY', 'Fictional maintenance example; no real person, amount, or address is recorded.'],
    ['STEP12_PROPERTY', 'Fictional property mediation applicant', 'LAND', 'Fictional property example; disputed details must be confirmed by the parties.'],
    ['STEP12_LABOUR', 'Fictional labour mediation applicant', 'LABOUR', 'Fictional wage example; no real employer or amount is recorded.'],
  ]
  for (const [demoSeedKey, applicantName, category, summary] of mediationExamples) {
    const record = await ensureDemoRecord({ demoSeedKey, applicantName, facts: [['triage.case_category', category], ['complaint.summary', summary]] }, officerActor, true)
    await startMediation(record.applicationId, officerActor)
  }
  const rahim = await ensureDemoRecord({
    demoSeedKey: 'STEP14_RAHIM_PING_PONG', applicantName: 'Fictional Rahim (demo)',
    facts: [['complaint.summary', 'Fictional matter returned twice between offices; an authorised human must decide the next route.']],
  }, officerActor, true)
  const receivingRole = await RoleAssignment.findOne({ role: 'RECEIVING_DLAO', officeCode: 'JHENAIDAH-DEMO', active: true })
  const receivingUser = await User.findById(receivingRole.userId)
  const receivingActor = { userId: receivingUser._id, assignments: [receivingRole] }
  let returnCount = await Referral.countDocuments({ applicationId: rahim.applicationId, status: 'RETURNED' })
  while (returnCount < 2) {
    let pending = await Referral.findOne({ applicationId: rahim.applicationId, status: { $in: ['SENT', 'ACKNOWLEDGED'] } })
    if (!pending) {
      await createReferral(rahim.applicationId, {
        responsibleUserId: receivingUser._id, reason: 'Fictional inter-office routing review.',
        history: 'Fictional referral history; jurisdiction is not inferred by the system.',
        expectedAction: 'Review and acknowledge the fictional referral.', dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        documentIds: [], sensitiveDocumentIds: [],
      }, officerActor)
      pending = await Referral.findOne({ applicationId: rahim.applicationId, status: 'SENT' })
    }
    await respondReferral(pending._id, { action: 'RETURN', reason: 'Fictional receiving office requests authorised human routing review.' }, receivingActor)
    returnCount += 1
  }
  console.log('Seeded fictional provider accounts, Moyuri/Ripon and Nuching intake examples, Nabila and Malek, Rahim routing escalation, factory incidents, 12 duplicate-review profiles, five triage cases, and three Step 12 mediation examples. Credentials remain in the ignored local demo-credentials file.')
} catch (error) {
  console.error('Demo account seeding failed:', error.name, error.codeName || error.code || '')
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
