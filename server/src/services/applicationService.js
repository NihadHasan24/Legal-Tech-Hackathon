import mongoose from 'mongoose'
import { Application, Case, CaseFact, ConsentRecord, ContactAttempt, Document, DocumentVersion, LawyerAssignment, Person, Representation, RoleAssignment, SafeContactProfile, Task, User, VoiceTranscript } from '../models/index.js'
import { hasOfficeRole } from '../middleware/auth.js'
import { HttpError } from '../utils/httpError.js'
import { nextRecordId } from '../utils/recordId.js'
import { liveVoiceModel } from './ai/liveVoice.js'
import { appendAudit, getAuditTrail } from './auditService.js'

const intakeChannels = {
  HELPLINE_AGENT: 'HELPLINE_SIM',
  UDC_OPERATOR: 'UDC',
  DLAO_OFFICER: 'DLAO',
  CASE_SUPPORT: 'DLAO',
}

function intakeAssignment(actor) {
  const assignment = actor.assignments.find(({ role }) => intakeChannels[role])
  if (!assignment) throw new HttpError(403, 'FORBIDDEN', 'This role cannot submit an application.')
  return assignment
}

async function officeApplication(applicationId, actor, session) {
  const application = await Application.findOne({ applicationId }).session(session)
  if (!application) throw new HttpError(404, 'NOT_FOUND', 'Application not found.')
  if (!hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode)) throw new HttpError(403, 'FORBIDDEN', 'This office cannot change the application.')
  return application
}

async function advance(application, session, changes = {}) {
  const updated = await Application.findOneAndUpdate(
    { applicationId: application.applicationId, version: application.version },
    { $set: changes, $inc: { version: 1, auditSequence: 1 } },
    { returnDocument: 'after', session },
  )
  if (!updated) throw new HttpError(409, 'CONFLICT', 'The application changed. Refresh and retry.')
  return updated
}

export async function submitApplication({ applicantName, demoSeedKey }, actor) {
  const assignment = intakeAssignment(actor)
  const applicationId = await nextRecordId('APP')
  return mongoose.connection.transaction(async (session) => {
    const [person] = await Person.create([{ displayName: applicantName, identityStatus: 'INCOMPLETE' }], { session })
    const [application] = await Application.create([{
      applicationId,
      demoSeedKey,
      applicantPersonId: person._id,
      officeCode: assignment.officeCode,
      channel: intakeChannels[assignment.role],
      submittedByUserId: actor.userId,
    }], { session })
    await Task.create([{
      applicationId,
      kind: 'INTAKE_REVIEW',
      title: 'Review new application',
      ownerRole: 'DLAO_OFFICER',
      nextAction: 'Review intake, identity gaps, provenance, and safe contact before deciding.',
    }], { session })
    await appendAudit({
      applicationId,
      sequence: 1,
      action: 'APPLICATION_SUBMITTED',
      actorUserId: actor.userId,
      actorRole: assignment.role,
      channel: application.channel,
      newState: { status: 'SUBMITTED', applicantPersonId: person.id },
    }, session)
    return { applicationId, status: application.status, caseId: null, identityStatus: person.identityStatus }
  })
}

// ponytail: one demo office receives every voice intake; route by a human-approved district map once real offices exist.
const VOICE_OFFICE = 'DEMO'
// Placeholder wording pending law-team approval. It must never reveal legal aid, the application, or the complaint.
export const NEUTRAL_UNKNOWN_ANSWER = 'হ্যালো, আমি পরে আবার ফোন করব। ধন্যবাদ। (Hello, I will call again later. Thank you.)'

// The public 16699 simulator has no signed-in user; writes are attributed to this disabled automated-channel account.
const voiceChannelUser = () => User.findOneAndUpdate(
  { username: 'system.voice16699' },
  { $setOnInsert: { displayName: '16699 voice simulation (automated channel)', passwordHash: 'login-disabled', active: false } },
  { upsert: true, returnDocument: 'after' },
)

export async function submitVoiceIntake({ mode, callbackReason, consents, answers, correctedFields = [], aiFields = [], confirmation = 'BUTTON', transcript }) {
  const channelUser = await voiceChannelUser()
  const applicationId = await nextRecordId('APP')
  return mongoose.connection.transaction(async (session) => {
    const callback = mode === 'CALLBACK'
    const representative = answers.callerRole === 'REPRESENTATIVE'
    const phone = callback || answers.contactChannel === 'PHONE'
    const smsSafe = !callback && phone && answers.smsSafe
    const sourceType = callback ? 'UNKNOWN_OR_UNVERIFIED' : representative ? 'REPRESENTATIVE_REPORTED' : 'APPLICANT_REPORTED'
    const recordedByUserId = channelUser._id
    const [applicant] = await Person.create([{ displayName: callback ? 'Not collected (callback request)' : answers.applicantName }], { session })
    const [caller] = representative ? await Person.create([{ displayName: answers.callerName }], { session }) : [applicant]
    const [representation] = representative ? await Representation.create([{
      applicationId, applicantPersonId: applicant._id, representativePersonId: caller._id, relationship: answers.relationship,
      scope: 'Initial report through the 16699 voice simulation; authority not verified.', recordedByUserId,
    }], { session }) : []
    const consentRecords = await ConsentRecord.create(Object.entries(consents).map(([scope, state]) => ({
      applicationId, personId: caller._id, scope, state, revision: 1, sourceType, recordedByUserId,
      attestation: `Caller chose ${state} in the 16699 voice simulation. Placeholder wording pending law-team approval.`,
    })), { session, ordered: true })
    // [fact field, answer it came from, value]; an answer the live model extracted is flagged aiInferred.
    const factValues = callback
      ? [['location.district', 'district', answers.district], ['safety.urgent', 'urgent', answers.urgent ? 'YES' : 'NO'], ['intake.callback_reason', null, callbackReason]]
      : [['complaint.summary', 'problem', answers.problem], ['location.district', 'district', answers.district], ['identity.document_access', 'identityDocument', answers.identityDocument], ['safety.urgent', 'urgent', answers.urgent ? 'YES' : 'NO']]
    // Representative reports are never applicant-confirmed here; only the applicant can confirm them later.
    const applicantConfirmed = !callback && !representative
    const facts = await CaseFact.create(factValues.map(([field, answerField, value]) => ({
      applicationId, field, value, sourceType, sourcePersonId: callback ? undefined : caller._id,
      captureMethod: callbackReason === 'LIVE_VOICE_REFUSED' ? 'TYPED' : 'VOICE', aiInferred: aiFields.includes(answerField),
      callerConfirmed: true, applicantConfirmed, confirmedByPersonId: applicantConfirmed ? applicant._id : undefined,
      revision: 1, recordedByUserId,
    })), { session, ordered: true })
    const [profile] = await SafeContactProfile.create([{
      applicationId, version: 1,
      allowedChannels: phone ? ['PHONE', ...(smsSafe ? ['SMS'] : [])] : ['IN_PERSON'],
      prohibitedChannels: phone ? (smsSafe ? [] : ['SMS']) : ['PHONE', 'SMS'],
      contactValue: phone ? answers.contactValue : undefined,
      contactOwnerPersonId: phone && !callback ? (answers.contactOwner === 'CALLER' ? caller._id : applicant._id) : undefined,
      safeTimeWindow: answers.safeTime, smsSafe, neutralWordingRequired: true, unknownAnswerAction: 'DISCLOSE_NOTHING', recordedByUserId,
    }], { session })
    const [task] = await Task.create([{
      applicationId, kind: 'INTAKE_REVIEW', ownerRole: 'DLAO_OFFICER',
      title: callback ? `${answers.urgent ? 'Urgent human' : 'Human'} callback requested` : 'Review 16699 voice intake',
      nextAction: callback
        ? 'Call back only on the recorded safe number at the safe time. Use neutral wording; disclose nothing if someone else answers.'
        : `${representative ? 'Reported by a representative: authority and applicant confirmation are pending.' : 'Reported by the applicant by voice.'} Identity is incomplete. Contact only through the active safe-contact profile with neutral wording.`,
    }], { session })
    const aiAssisted = aiFields.length > 0 || Boolean(transcript)
    const transcriptConsent = consentRecords.find((consent) => consent.scope === 'TRANSCRIPT_STORAGE')
    const [storedTranscript] = transcript ? await VoiceTranscript.create([{ applicationId, turns: transcript, transcribedBy: liveVoiceModel() ?? 'unknown', consentId: transcriptConsent._id }], { session }) : []
    const events = [
      {
        action: 'APPLICATION_SUBMITTED',
        // Records that AI assisted and which answers it extracted; no model reasoning is stored.
        newState: { status: 'SUBMITTED', applicantPersonId: applicant.id, mode, callerRole: answers.callerRole ?? 'NOT_COLLECTED', callbackReason: callbackReason ?? null, correctedFields, aiAssisted, liveModel: aiAssisted ? liveVoiceModel() : null, aiFields, confirmation },
        reason: 'Caller confirmed the read-back and submitted through the 16699 voice simulation.',
      },
      ...(representation ? [{ action: 'REPRESENTATION_RECORDED', newState: { representationId: representation.id, authorityStatus: 'PENDING' } }] : []),
      ...consentRecords.map((consent) => ({ action: 'CONSENT_RECORDED', newState: { consentId: consent.id, scope: consent.scope, state: consent.state, revision: 1 } })),
      ...facts.map((fact) => ({ action: 'FACT_RECORDED', newState: { factId: fact.id, field: fact.field, sourceType, callerConfirmed: true, applicantConfirmed } })),
      { action: 'SAFE_CONTACT_UPDATED', newState: { profileId: profile.id, version: 1 } },
      { action: 'TASK_CREATED', newState: { taskId: task.id, kind: task.kind, ownerRole: task.ownerRole } },
      ...(storedTranscript ? [{ action: 'TRANSCRIPT_STORED', newState: { transcriptId: storedTranscript.id, turns: transcript.length, consentId: transcriptConsent.id } }] : []),
    ]
    await Application.create([{
      applicationId, applicantPersonId: applicant._id, officeCode: VOICE_OFFICE, channel: 'VOICE_SIM',
      submittedByUserId: channelUser._id, auditSequence: events.length,
    }], { session })
    for (const [index, event] of events.entries()) {
      await appendAudit({ ...event, applicationId, sequence: index + 1, actorUserId: channelUser._id, actorRole: 'SYSTEM', channel: 'VOICE_16699_SIM' }, session)
    }
    return { applicationId, mode, status: 'SUBMITTED' }
  })
}

export async function acceptApplication(applicationId, reason, actor) {
  const caseId = await nextRecordId('CASE')
  return mongoose.connection.transaction(async (session) => {
    const application = await officeApplication(applicationId, actor, session)
    if (application.status !== 'SUBMITTED' || application.caseId) throw new HttpError(409, 'ALREADY_ACCEPTED', 'This application already has a case.')
    if (application.reviewState !== 'READY_FOR_DECISION') throw new HttpError(409, 'REVIEW_REQUIRED', 'Human review must be ready for decision before acceptance.')
    const updated = await Application.findOneAndUpdate(
      { applicationId, status: 'SUBMITTED', version: application.version },
      { $set: { status: 'ACCEPTED', caseId, acceptedByUserId: actor.userId, acceptedAt: new Date() }, $inc: { version: 1, auditSequence: 1 } },
      { returnDocument: 'after', session },
    )
    if (!updated) throw new HttpError(409, 'CONFLICT', 'The application changed. Refresh and retry.')
    await Case.create([{ caseId, applicationId, officeCode: application.officeCode, acceptedByUserId: actor.userId }], { session })
    await Task.updateMany({ applicationId, status: 'OPEN' }, { $set: { status: 'DONE', completedAt: new Date(), completedByUserId: actor.userId } }, { session })
    await Task.create([{
      applicationId,
      caseId,
      kind: 'FOLLOW_UP',
      title: 'Plan next service step',
      ownerRole: 'DLAO_OFFICER',
      nextAction: 'Assign the appropriate human-led service or follow-up.',
    }], { session })
    await appendAudit({
      applicationId,
      caseId,
      sequence: updated.auditSequence,
      action: 'APPLICATION_ACCEPTED',
      actorUserId: actor.userId,
      actorRole: 'DLAO_OFFICER',
      channel: 'DLAO',
      previousState: { status: 'SUBMITTED', caseId: null },
      newState: { status: 'ACCEPTED', caseId },
      reason,
    }, session)
    return { applicationId, caseId, status: updated.status }
  })
}

export async function reviewApplication(applicationId, { reviewState, reason }, actor, override = false) {
  return mongoose.connection.transaction(async (session) => {
    const application = await officeApplication(applicationId, actor, session)
    if (application.status !== 'SUBMITTED') throw new HttpError(409, 'ALREADY_ACCEPTED', 'This application is already accepted.')
    if (override && application.reviewState === 'PENDING_REVIEW') throw new HttpError(409, 'REVIEW_REQUIRED', 'There is no review decision to override.')
    if (!override && application.reviewState === 'READY_FOR_DECISION') throw new HttpError(409, 'OVERRIDE_REQUIRED', 'Changing a reviewed decision requires an override reason.')
    if (application.reviewState === reviewState) throw new HttpError(409, 'NO_CHANGE', 'Choose a different review state.')
    const updated = await advance(application, session, { reviewState })
    await Task.updateMany(
      { applicationId, status: 'OPEN', kind: { $in: ['INTAKE_REVIEW', 'DECISION', 'FOLLOW_UP'] } },
      { $set: { status: 'DONE', completedAt: new Date(), completedByUserId: actor.userId } },
      { session },
    )
    const next = reviewState === 'READY_FOR_DECISION'
      ? ['DECISION', 'Decide reviewed application', 'Authorised officer to accept or request more information.']
      : reviewState === 'NEEDS_INFORMATION'
        ? ['FOLLOW_UP', 'Request missing information', 'Collect missing information using an approved safe route.']
        : ['INTAKE_REVIEW', 'Repeat application review', 'Recheck identity gaps, provenance, and safe contact.']
    await Task.create([{ applicationId, kind: next[0], title: next[1], ownerRole: 'DLAO_OFFICER', nextAction: next[2] }], { session })
    await appendAudit({
      applicationId,
      sequence: updated.auditSequence,
      action: override ? 'HUMAN_REVIEW_OVERRIDE' : 'APPLICATION_REVIEWED',
      actorUserId: actor.userId,
      actorRole: 'DLAO_OFFICER',
      channel: 'DLAO',
      previousState: { reviewState: application.reviewState },
      newState: { reviewState },
      reason,
    }, session)
    return { applicationId, reviewState, status: updated.status }
  })
}

export async function addRepresentation(applicationId, input, actor) {
  return mongoose.connection.transaction(async (session) => {
    const application = await officeApplication(applicationId, actor, session)
    const [person] = await Person.create([{ displayName: input.representativeName, identityStatus: 'INCOMPLETE' }], { session })
    const [representation] = await Representation.create([{
      applicationId,
      applicantPersonId: application.applicantPersonId,
      representativePersonId: person._id,
      relationship: input.relationship,
      scope: input.scope,
      recordedByUserId: actor.userId,
    }], { session })
    const updated = await advance(application, session)
    await appendAudit({
      applicationId,
      caseId: application.caseId,
      sequence: updated.auditSequence,
      action: 'REPRESENTATION_RECORDED',
      actorUserId: actor.userId,
      actorRole: 'DLAO_OFFICER',
      newState: { representationId: representation.id, authorityStatus: 'PENDING' },
    }, session)
    return { id: representation.id, representativePersonId: person.id, authorityStatus: representation.authorityStatus }
  })
}

export async function addFact(applicationId, input, actor) {
  return mongoose.connection.transaction(async (session) => {
    const application = await officeApplication(applicationId, actor, session)
    if (input.sourceType === 'REPRESENTATIVE_REPORTED') {
      const represented = await Representation.exists({ applicationId, representativePersonId: input.sourcePersonId }).session(session)
      if (!represented) throw new HttpError(400, 'INVALID_SOURCE', 'The representative is not recorded for this application.')
    } else if (input.sourceType === 'APPLICANT_REPORTED') {
      if (application.applicantPersonId.toString() !== input.sourcePersonId) throw new HttpError(400, 'INVALID_SOURCE', 'The source is not the applicant.')
    } else if (input.sourcePersonId) {
      throw new HttpError(400, 'INVALID_SOURCE', 'This source type cannot use a person ID.')
    }
    const latest = await CaseFact.findOne({ applicationId, field: input.field }).sort({ revision: -1 }).session(session)
    const updated = await advance(application, session)
    const [fact] = await CaseFact.create([{
      applicationId,
      caseId: application.caseId,
      field: input.field,
      value: input.value,
      sourceType: input.sourceType,
      sourcePersonId: input.sourcePersonId,
      captureMethod: 'STAFF',
      applicantConfirmed: false,
      supersedesFactId: latest?._id,
      revision: (latest?.revision || 0) + 1,
      recordedByUserId: actor.userId,
    }], { session })
    await appendAudit({
      applicationId,
      caseId: application.caseId,
      sequence: updated.auditSequence,
      action: 'FACT_RECORDED',
      actorUserId: actor.userId,
      actorRole: 'DLAO_OFFICER',
      previousState: latest ? { factId: latest.id, sourceType: latest.sourceType } : null,
      newState: { factId: fact.id, sourceType: fact.sourceType, applicantConfirmed: false },
    }, session)
    return fact
  })
}

export async function correctFact(applicationId, factId, { value, attestation }, actor) {
  return mongoose.connection.transaction(async (session) => {
    const application = await officeApplication(applicationId, actor, session)
    const previous = await CaseFact.findOne({ _id: factId, applicationId }).session(session)
    if (!previous) throw new HttpError(404, 'NOT_FOUND', 'Fact not found.')
    const latest = await CaseFact.findOne({ applicationId, field: previous.field }).sort({ revision: -1 }).session(session)
    if (!latest._id.equals(previous._id)) throw new HttpError(409, 'CONFLICT', 'This fact has a newer correction.')
    const updated = await advance(application, session)
    const [fact] = await CaseFact.create([{
      applicationId,
      caseId: application.caseId,
      field: previous.field,
      value,
      sourceType: 'APPLICANT_CONFIRMED',
      sourcePersonId: application.applicantPersonId,
      captureMethod: 'STAFF',
      applicantConfirmed: true,
      confirmedByPersonId: application.applicantPersonId,
      confirmationAttestation: attestation,
      supersedesFactId: previous._id,
      revision: previous.revision + 1,
      recordedByUserId: actor.userId,
    }], { session })
    await appendAudit({
      applicationId,
      caseId: application.caseId,
      sequence: updated.auditSequence,
      action: 'APPLICANT_CORRECTION_ATTESTED',
      actorUserId: actor.userId,
      actorRole: 'DLAO_OFFICER',
      previousState: { factId: previous.id, sourceType: previous.sourceType },
      newState: { factId: fact.id, sourceType: fact.sourceType, applicantConfirmed: true },
      reason: attestation,
    }, session)
    return fact
  })
}

export async function setSafeContact(applicationId, input, actor) {
  return mongoose.connection.transaction(async (session) => {
    const application = await officeApplication(applicationId, actor, session)
    const previous = await SafeContactProfile.findOne({ applicationId }).sort({ version: -1 }).session(session)
    const updated = await advance(application, session)
    const [profile] = await SafeContactProfile.create([{
      ...input,
      applicationId,
      caseId: application.caseId,
      version: (previous?.version || 0) + 1,
      supersedesProfileId: previous?._id,
      recordedByUserId: actor.userId,
    }], { session })
    await appendAudit({
      applicationId,
      caseId: application.caseId,
      sequence: updated.auditSequence,
      action: 'SAFE_CONTACT_UPDATED',
      actorUserId: actor.userId,
      actorRole: 'DLAO_OFFICER',
      previousState: previous ? { profileId: previous.id, version: previous.version } : null,
      newState: { profileId: profile.id, version: profile.version },
    }, session)
    return { version: profile.version, id: profile.id }
  })
}

export async function recordConsent(applicationId, { scope, state, attestation }, actor) {
  return mongoose.connection.transaction(async (session) => {
    const application = await officeApplication(applicationId, actor, session)
    const previous = await ConsentRecord.findOne({ applicationId, scope }).sort({ revision: -1 }).session(session)
    const updated = await advance(application, session)
    const [consent] = await ConsentRecord.create([{
      applicationId,
      personId: application.applicantPersonId,
      scope,
      state,
      revision: (previous?.revision || 0) + 1,
      attestation,
      sourceType: 'APPLICANT_REPORTED',
      recordedByUserId: actor.userId,
    }], { session })
    await appendAudit({
      applicationId,
      caseId: application.caseId,
      sequence: updated.auditSequence,
      action: 'CONSENT_RECORDED',
      actorUserId: actor.userId,
      actorRole: 'DLAO_OFFICER',
      previousState: previous ? { consentId: previous.id, state: previous.state } : null,
      newState: { consentId: consent.id, scope, state, revision: consent.revision },
      reason: attestation,
    }, session)
    return { id: consent.id, scope, state, revision: consent.revision }
  })
}

export async function getApplication(applicationId, actor) {
  const application = await Application.findOne({ applicationId }).lean()
  if (!application) throw new HttpError(404, 'NOT_FOUND', 'Application not found.')
  if (!hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode) && !hasOfficeRole(actor, 'CASE_SUPPORT', application.officeCode)) {
    throw new HttpError(403, 'FORBIDDEN', 'This role cannot read the application.')
  }
  const [person, nextTask, representation] = await Promise.all([
    Person.findById(application.applicantPersonId).select('displayName identityStatus').lean(),
    Task.findOne({ applicationId, status: 'OPEN' }).sort({ createdAt: 1 }).select('title ownerRole nextAction dueAt').lean(),
    Representation.findOne({ applicationId }).sort({ createdAt: -1 }).populate('representativePersonId', 'displayName').lean(),
  ])
  return {
    applicationId, caseId: application.caseId ?? null, status: application.status,
    reviewState: application.reviewState, version: application.version, channel: application.channel,
    officeCode: application.officeCode, applicantName: person?.displayName ?? 'Unavailable',
    identityStatus: person?.identityStatus ?? 'INCOMPLETE', nextTask,
    representation: representation ? {
      representativeName: representation.representativePersonId?.displayName ?? 'Unavailable',
      relationship: representation.relationship, authorityStatus: representation.authorityStatus,
    } : null,
  }
}

export async function searchRecord(identifier, actor) {
  const applicationId = identifier.startsWith('APP-')
    ? identifier
    : (await Case.findOne({ caseId: identifier }).select('applicationId').lean())?.applicationId
  if (!applicationId) throw new HttpError(404, 'NOT_FOUND', 'Record not found.')
  return getApplication(applicationId, actor)
}

export async function listWorkspace(role, actor) {
  const assignment = actor.assignments.find((item) => item.role === role)
  if (!assignment) throw new HttpError(403, 'FORBIDDEN', 'This role is not assigned to this user.')
  if (role === 'DLAO_OFFICER' || role === 'CASE_SUPPORT') {
    const applications = await Application.find({ officeCode: assignment.officeCode })
      .sort({ updatedAt: -1 }).limit(25).select('applicationId caseId status reviewState applicantPersonId updatedAt').lean()
    const people = await Person.find({ _id: { $in: applications.map(({ applicantPersonId }) => applicantPersonId) } }).select('displayName').lean()
    const names = new Map(people.map((person) => [person._id.toString(), person.displayName]))
    return { role, officeCode: assignment.officeCode, records: applications.map((item) => ({
      applicationId: item.applicationId, caseId: item.caseId ?? null, status: item.status,
      reviewState: item.reviewState, applicantName: names.get(item.applicantPersonId.toString()) ?? 'Unavailable',
      updatedAt: item.updatedAt,
    })) }
  }
  if (role === 'PANEL_LAWYER') {
    const assignments = await LawyerAssignment.find({ lawyerUserId: actor.userId, active: true }).select('caseId applicationId').limit(25).lean()
    return { role, officeCode: assignment.officeCode, records: assignments.map(({ caseId, applicationId }) => ({ caseId, applicationId })) }
  }
  return { role, officeCode: assignment.officeCode, records: [] }
}

export async function listTasks(applicationId, actor) {
  const application = await Application.findOne({ applicationId }).select('officeCode').lean()
  if (!application) throw new HttpError(404, 'NOT_FOUND', 'Application not found.')
  if (!hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode) && !hasOfficeRole(actor, 'CASE_SUPPORT', application.officeCode)) throw new HttpError(403, 'FORBIDDEN', 'This office cannot read tasks.')
  return Task.find({ applicationId }).sort({ createdAt: 1 }).lean()
}

export async function createTask(applicationId, { title, ownerRole, ownerUserId, nextAction, dueAt }, actor) {
  return mongoose.connection.transaction(async (session) => {
    const application = await Application.findOne({ applicationId }).session(session)
    if (!application) throw new HttpError(404, 'NOT_FOUND', 'Application not found.')
    if (!hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode) && !hasOfficeRole(actor, 'CASE_SUPPORT', application.officeCode)) throw new HttpError(403, 'FORBIDDEN', 'This office cannot manage tasks.')
    if (ownerUserId && !await RoleAssignment.exists({ userId: ownerUserId, role: ownerRole, officeCode: application.officeCode, active: true }).session(session)) throw new HttpError(400, 'INVALID_OWNER', 'The owner is not active in this office and role.')
    const updated = await advance(application, session)
    const [task] = await Task.create([{
      applicationId, caseId: application.caseId, kind: 'MANUAL', title, ownerRole,
      ownerUserId, nextAction, dueAt,
    }], { session })
    await appendAudit({
      applicationId, caseId: application.caseId, sequence: updated.auditSequence,
      action: 'TASK_CREATED', actorUserId: actor.userId,
      actorRole: hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode) ? 'DLAO_OFFICER' : 'CASE_SUPPORT',
      newState: { taskId: task.id, ownerRole, ownerUserId: ownerUserId ?? null, nextAction, dueAt: dueAt ?? null },
    }, session)
    return task
  })
}

export async function completeTask(applicationId, taskId, actor) {
  return mongoose.connection.transaction(async (session) => {
    const application = await Application.findOne({ applicationId }).session(session)
    if (!application) throw new HttpError(404, 'NOT_FOUND', 'Application not found.')
    if (!hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode) && !hasOfficeRole(actor, 'CASE_SUPPORT', application.officeCode)) throw new HttpError(403, 'FORBIDDEN', 'This office cannot manage tasks.')
    const task = await Task.findOne({ _id: taskId, applicationId }).session(session)
    if (!task) throw new HttpError(404, 'NOT_FOUND', 'Task not found.')
    if (task.kind !== 'MANUAL' || task.status !== 'OPEN') throw new HttpError(409, 'INVALID_TRANSITION', 'Only an open manual task can be completed here.')
    const updated = await advance(application, session)
    task.status = 'DONE'
    task.completedAt = new Date()
    task.completedByUserId = actor.userId
    await task.save({ session })
    await appendAudit({
      applicationId, caseId: application.caseId, sequence: updated.auditSequence,
      action: 'TASK_COMPLETED', actorUserId: actor.userId,
      actorRole: hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode) ? 'DLAO_OFFICER' : 'CASE_SUPPORT',
      previousState: { taskId: task.id, status: 'OPEN' }, newState: { taskId: task.id, status: 'DONE' },
    }, session)
    return { id: task.id, status: task.status }
  })
}

export async function listContactAttempts(applicationId, actor) {
  const application = await Application.findOne({ applicationId }).select('officeCode').lean()
  if (!application) throw new HttpError(404, 'NOT_FOUND', 'Application not found.')
  if (!hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode) && !hasOfficeRole(actor, 'CASE_SUPPORT', application.officeCode)) throw new HttpError(403, 'FORBIDDEN', 'This office cannot read contact history.')
  return ContactAttempt.find({ applicationId }).sort({ createdAt: -1 }).lean()
}

export async function recordContactAttempt(applicationId, { channel, outcome, reason }, actor) {
  return mongoose.connection.transaction(async (session) => {
    const application = await officeApplication(applicationId, actor, session)
    const profile = await SafeContactProfile.findOne({ applicationId }).sort({ version: -1 }).session(session)
    const updated = await advance(application, session)
    const [attempt] = await ContactAttempt.create([{
      applicationId, caseId: application.caseId, channel, outcome, reason,
      disclosedSensitive: false, safeContactVersion: profile?.version,
      recordedByUserId: actor.userId,
    }], { session })
    // An unknown person answering fails safe: neutral wording only, then a safer follow-up for a human to plan.
    const failedSafe = outcome === 'UNKNOWN_PERSON'
    const [followUp] = failedSafe ? await Task.create([{
      applicationId, caseId: application.caseId, kind: 'FOLLOW_UP', title: 'Plan safer follow-up', ownerRole: 'DLAO_OFFICER',
      nextAction: 'An unknown person answered and nothing was disclosed. Choose a safer route or time before trying again.',
    }], { session }) : []
    await appendAudit({
      applicationId, caseId: application.caseId, sequence: updated.auditSequence,
      action: 'CONTACT_ATTEMPT_LOGGED', actorUserId: actor.userId, actorRole: 'DLAO_OFFICER',
      newState: { contactAttemptId: attempt.id, channel, outcome, disclosedSensitive: false, failedSafe, followUpTaskId: followUp?.id ?? null, safeContactVersion: profile?.version ?? null },
      reason,
    }, session)
    return {
      id: attempt.id, channel, outcome, disclosedSensitive: false, safeContactVersion: profile?.version ?? null,
      ...(failedSafe ? { neutralScript: NEUTRAL_UNKNOWN_ANSWER, followUpTaskId: followUp.id } : {}),
    }
  })
}

export async function getFacts(applicationId, actor) {
  await officeApplication(applicationId, actor)
  return CaseFact.find({ applicationId }).sort({ field: 1, revision: 1 }).lean()
}

export async function getSafeContact(applicationId, actor) {
  await officeApplication(applicationId, actor)
  return SafeContactProfile.findOne({ applicationId }).sort({ version: -1 })
    .select('version allowedChannels prohibitedChannels contactValue safeTimeWindow smsSafe neutralWordingRequired unknownAnswerAction').lean()
}

export async function getTranscript(applicationId, actor) {
  await officeApplication(applicationId, actor)
  return VoiceTranscript.findOne({ applicationId }).select('turns transcribedBy createdAt').lean()
}

export async function getApplicationAudit(applicationId, actor) {
  await officeApplication(applicationId, actor)
  return getAuditTrail(applicationId)
}

export async function getCase(caseId, actor) {
  const record = await Case.findOne({ caseId }).lean()
  if (!record) throw new HttpError(404, 'NOT_FOUND', 'Case not found.')
  const officeAccess = hasOfficeRole(actor, 'DLAO_OFFICER', record.officeCode) || hasOfficeRole(actor, 'CASE_SUPPORT', record.officeCode)
  const lawyerAccess = actor.assignments.some(({ role }) => role === 'PANEL_LAWYER')
    && await LawyerAssignment.exists({ caseId, lawyerUserId: actor.userId, active: true })
  if (!officeAccess && !lawyerAccess) throw new HttpError(403, 'FORBIDDEN', 'This case is not assigned to this user.')
  return { caseId, applicationId: record.applicationId, status: record.status }
}

export async function getDocument(documentId, actor) {
  const document = await Document.findById(documentId).lean()
  if (!document) throw new HttpError(404, 'NOT_FOUND', 'Document not found.')
  const application = await Application.findOne({ applicationId: document.applicationId }).lean()
  if (!application) throw new HttpError(404, 'NOT_FOUND', 'Application not found.')
  const staffRole = hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode) || hasOfficeRole(actor, 'CASE_SUPPORT', application.officeCode)
  const explicitGrant = document.accessState === 'EXPLICIT_GRANT' && document.allowedUserIds.some((id) => id.equals(actor.userId))
  if (!staffRole || (document.sensitivity === 'RESTRICTED' && !explicitGrant)) throw new HttpError(403, 'FORBIDDEN', 'This evidence is restricted.')
  const version = await DocumentVersion.findOne({ documentId: document._id }).sort({ version: -1 }).select('version label qualityState note createdAt').lean()
  return { id: document._id, applicationId: document.applicationId, label: document.label, sensitivity: document.sensitivity, accessState: document.accessState, currentVersion: document.currentVersion, version }
}

export async function listDocuments(applicationId, actor) {
  const application = await Application.findOne({ applicationId }).select('officeCode').lean()
  if (!application) throw new HttpError(404, 'NOT_FOUND', 'Application not found.')
  if (!hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode) && !hasOfficeRole(actor, 'CASE_SUPPORT', application.officeCode)) throw new HttpError(403, 'FORBIDDEN', 'This office cannot read documents.')
  const documents = await Document.find({ applicationId }).sort({ createdAt: -1 }).lean()
  return documents
    .filter((item) => item.sensitivity !== 'RESTRICTED' || (item.accessState === 'EXPLICIT_GRANT' && item.allowedUserIds.some((id) => id.equals(actor.userId))))
    .map(({ _id, label, sensitivity, currentVersion }) => ({ id: _id, label, sensitivity, currentVersion }))
}

export async function createDocumentMetadata(applicationId, { label, qualityState, note }, actor) {
  return mongoose.connection.transaction(async (session) => {
    const application = await officeApplication(applicationId, actor, session)
    const updated = await advance(application, session)
    const [document] = await Document.create([{
      applicationId, caseId: application.caseId, label, sensitivity: 'STANDARD',
    }], { session })
    await DocumentVersion.create([{
      applicationId, caseId: application.caseId, documentId: document._id,
      version: 1, label, qualityState, note, recordedByUserId: actor.userId,
    }], { session })
    await appendAudit({
      applicationId, caseId: application.caseId, sequence: updated.auditSequence,
      action: 'DOCUMENT_METADATA_CREATED', actorUserId: actor.userId, actorRole: 'DLAO_OFFICER',
      newState: { documentId: document.id, version: 1, qualityState },
    }, session)
    return { id: document.id, applicationId, label, currentVersion: 1, qualityState }
  })
}

export async function addDocumentVersion(documentId, { label, qualityState, note }, actor) {
  return mongoose.connection.transaction(async (session) => {
    const document = await Document.findById(documentId).session(session)
    if (!document) throw new HttpError(404, 'NOT_FOUND', 'Document not found.')
    const application = await officeApplication(document.applicationId, actor, session)
    if (document.sensitivity === 'RESTRICTED' && (document.accessState !== 'EXPLICIT_GRANT' || !document.allowedUserIds.some((id) => id.equals(actor.userId)))) throw new HttpError(403, 'FORBIDDEN', 'This evidence is restricted.')
    const changed = await Document.findOneAndUpdate(
      { _id: document._id, currentVersion: document.currentVersion },
      { $inc: { currentVersion: 1 }, $set: { label } },
      { returnDocument: 'after', session },
    )
    if (!changed) throw new HttpError(409, 'CONFLICT', 'The document changed. Refresh and retry.')
    const updated = await advance(application, session)
    const [version] = await DocumentVersion.create([{
      applicationId: application.applicationId, caseId: application.caseId,
      documentId: document._id, version: changed.currentVersion, label, qualityState, note,
      recordedByUserId: actor.userId,
    }], { session })
    await appendAudit({
      applicationId: application.applicationId, caseId: application.caseId, sequence: updated.auditSequence,
      action: 'DOCUMENT_VERSION_ADDED', actorUserId: actor.userId, actorRole: 'DLAO_OFFICER',
      previousState: { documentId: document.id, version: document.currentVersion },
      newState: { documentId: document.id, version: version.version, qualityState },
    }, session)
    return { documentId: document.id, version: version.version, qualityState }
  })
}

export async function listDocumentVersions(documentId, actor) {
  await getDocument(documentId, actor)
  return DocumentVersion.find({ documentId }).sort({ version: 1 }).select('version label qualityState note createdAt').lean()
}
