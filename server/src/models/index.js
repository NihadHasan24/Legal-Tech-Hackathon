import mongoose from 'mongoose'

const { Schema, model } = mongoose
const ref = (name, required = true) => ({ type: Schema.Types.ObjectId, ref: name, required })
const recordId = { type: String, required: true, index: true }
const roles = ['DLAO_OFFICER', 'MEDIATOR', 'HELPLINE_AGENT', 'UDC_OPERATOR', 'PANEL_LAWYER', 'RECEIVING_DLAO', 'CASE_SUPPORT', 'CLAO', 'SYSTEM']
const sources = ['APPLICANT_REPORTED', 'APPLICANT_CONFIRMED', 'REPRESENTATIVE_REPORTED', 'INTERMEDIARY_TRANSLATED', 'INTERMEDIARY_TYPED', 'STAFF_ENTERED', 'DOCUMENT_EXTRACTED', 'AI_INFERRED', 'UNKNOWN_OR_UNVERIFIED']

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  active: { type: Boolean, default: true },
  fictional: { type: Boolean, default: true },
}, { timestamps: true })
export const User = model('User', userSchema)

const roleAssignmentSchema = new Schema({
  userId: ref('User'),
  role: { type: String, required: true, enum: roles },
  officeCode: { type: String, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })
roleAssignmentSchema.index({ userId: 1, role: 1, officeCode: 1 }, { unique: true })
export const RoleAssignment = model('RoleAssignment', roleAssignmentSchema)

export const Person = model('Person', new Schema({
  displayName: { type: String, required: true },
  identityStatus: { type: String, enum: ['INCOMPLETE', 'PENDING_REVIEW', 'VERIFIED'], default: 'INCOMPLETE' },
  fictional: { type: Boolean, default: true },
}, { timestamps: true }))

const applicationSchema = new Schema({
  applicationId: { type: String, required: true, unique: true },
  demoSeedKey: { type: String },
  applicantPersonId: ref('Person'),
  officeCode: { type: String, required: true },
  channel: { type: String, required: true, enum: ['WEB', 'HELPLINE_SIM', 'VOICE_SIM', 'UDC', 'DLAO'] },
  status: { type: String, enum: ['SUBMITTED', 'ACCEPTED'], default: 'SUBMITTED' },
  reviewState: { type: String, enum: ['PENDING_REVIEW', 'NEEDS_INFORMATION', 'READY_FOR_DECISION'], default: 'PENDING_REVIEW' },
  caseId: String,
  version: { type: Number, default: 1 },
  auditSequence: { type: Number, default: 1 },
  submittedByUserId: ref('User'),
  acceptedByUserId: ref('User', false),
  acceptedAt: Date,
}, { timestamps: true })
applicationSchema.index({ caseId: 1 }, { unique: true, partialFilterExpression: { caseId: { $type: 'string' } } })
applicationSchema.index({ demoSeedKey: 1 }, { unique: true, partialFilterExpression: { demoSeedKey: { $type: 'string' } } })
export const Application = model('Application', applicationSchema)

const caseSchema = new Schema({
  caseId: { type: String, required: true, unique: true },
  applicationId: { type: String, required: true, unique: true },
  officeCode: { type: String, required: true },
  status: { type: String, enum: ['OPEN'], default: 'OPEN' },
  acceptedByUserId: ref('User'),
}, { timestamps: true })
export const Case = model('Case', caseSchema)

const factSchema = new Schema({
  applicationId: recordId,
  caseId: String,
  field: { type: String, required: true },
  value: { type: String, required: true, maxlength: 4000 },
  sourceType: { type: String, required: true, enum: sources },
  sourcePersonId: ref('Person', false),
  captureMethod: { type: String, required: true, enum: ['VOICE', 'TYPED', 'TRANSLATED', 'DOCUMENT', 'STAFF', 'AI'] },
  translatedByPersonId: ref('Person', false),
  typedByPersonId: ref('Person', false),
  callerConfirmed: { type: Boolean, default: false },
  applicantConfirmed: { type: Boolean, default: false },
  confirmedByPersonId: ref('Person', false),
  confirmationAttestation: String,
  aiInferred: { type: Boolean, default: false },
  supersedesFactId: ref('CaseFact', false),
  revision: { type: Number, required: true },
  recordedByUserId: ref('User'),
}, { timestamps: { createdAt: true, updatedAt: false } })
factSchema.index({ applicationId: 1, field: 1, revision: 1 }, { unique: true })
export const CaseFact = model('CaseFact', factSchema)

export const Representation = model('Representation', new Schema({
  applicationId: recordId,
  applicantPersonId: ref('Person'),
  representativePersonId: ref('Person'),
  relationship: { type: String, required: true },
  scope: { type: String, required: true },
  authorityStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REVOKED'], default: 'PENDING' },
  recordedByUserId: ref('User'),
}, { timestamps: true }))

const consentSchema = new Schema({
  applicationId: recordId,
  personId: ref('Person'),
  scope: { type: String, required: true, enum: ['LIVE_VOICE', 'AUDIO_STORAGE', 'TRANSCRIPT_STORAGE', 'STRUCTURED_FACTS', 'ASSISTED_INTAKE', 'CONTACT'] },
  state: { type: String, required: true, enum: ['PENDING', 'GRANTED', 'DENIED', 'WITHDRAWN'] },
  revision: { type: Number, required: true },
  attestation: { type: String, required: true },
  sourceType: { type: String, required: true, enum: sources },
  recordedByUserId: ref('User'),
}, { timestamps: { createdAt: true, updatedAt: false } })
consentSchema.index({ applicationId: 1, scope: 1, revision: 1 }, { unique: true })
export const ConsentRecord = model('ConsentRecord', consentSchema)

const safeContactSchema = new Schema({
  applicationId: recordId,
  caseId: String,
  version: { type: Number, required: true },
  allowedChannels: [{ type: String, enum: ['PHONE', 'SMS', 'WEB', 'IN_PERSON'] }],
  prohibitedChannels: [{ type: String, enum: ['PHONE', 'SMS', 'WEB', 'IN_PERSON'] }],
  contactValue: String,
  contactOwnerPersonId: ref('Person', false),
  safeTimeWindow: String,
  smsSafe: { type: Boolean, default: false },
  neutralWordingRequired: { type: Boolean, default: true },
  unknownAnswerAction: { type: String, enum: ['DISCLOSE_NOTHING', 'APPROVED_NEUTRAL_ONLY'], default: 'DISCLOSE_NOTHING' },
  supersedesProfileId: ref('SafeContactProfile', false),
  recordedByUserId: ref('User'),
}, { timestamps: { createdAt: true, updatedAt: false } })
safeContactSchema.index({ applicationId: 1, version: 1 }, { unique: true })
export const SafeContactProfile = model('SafeContactProfile', safeContactSchema)

export const Task = model('Task', new Schema({
  applicationId: recordId,
  caseId: String,
  kind: { type: String, required: true, enum: ['INTAKE_REVIEW', 'DECISION', 'FOLLOW_UP', 'MANUAL'] },
  title: { type: String, required: true },
  status: { type: String, enum: ['OPEN', 'DONE'], default: 'OPEN' },
  ownerRole: { type: String, required: true, enum: roles },
  ownerUserId: ref('User', false),
  nextAction: { type: String, required: true },
  dueAt: Date,
  completedAt: Date,
  completedByUserId: ref('User', false),
}, { timestamps: true }))

export const ContactAttempt = model('ContactAttempt', new Schema({
  applicationId: recordId,
  caseId: String,
  channel: { type: String, required: true },
  outcome: { type: String, required: true },
  reason: { type: String, required: true },
  disclosedSensitive: { type: Boolean, default: false },
  safeContactVersion: Number,
  recordedByUserId: ref('User'),
}, { timestamps: { createdAt: true, updatedAt: false } }))

const auditSchema = new Schema({
  applicationId: String,
  caseId: String,
  sequence: Number,
  action: { type: String, required: true },
  actorUserId: ref('User', false),
  actorRole: { type: String, required: true, enum: roles },
  channel: String,
  previousState: Schema.Types.Mixed,
  newState: Schema.Types.Mixed,
  reason: String,
  previousHash: String,
  hash: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })
auditSchema.index({ applicationId: 1, sequence: 1 }, { unique: true, partialFilterExpression: { applicationId: { $type: 'string' } } })
export const AuditEvent = model('AuditEvent', auditSchema)

// Stored only when the caller granted transcript consent; text is machine transcription, not verbatim proof.
export const VoiceTranscript = model('VoiceTranscript', new Schema({
  applicationId: { type: String, required: true, unique: true },
  turns: [{ _id: false, speaker: { type: String, enum: ['CALLER', 'ASSISTANT'], required: true }, text: { type: String, required: true, maxlength: 2000 } }],
  transcribedBy: { type: String, required: true },
  consentId: ref('ConsentRecord'),
}, { timestamps: { createdAt: true, updatedAt: false } }))

export const Document = model('Document', new Schema({
  applicationId: recordId,
  caseId: String,
  label: { type: String, required: true },
  sensitivity: { type: String, enum: ['STANDARD', 'RESTRICTED'], default: 'STANDARD' },
  accessState: { type: String, enum: ['PENDING_POLICY', 'EXPLICIT_GRANT'], default: 'PENDING_POLICY' },
  allowedUserIds: [ref('User', false)],
  currentVersion: { type: Number, default: 1 },
}, { timestamps: true }))

const documentVersionSchema = new Schema({
  applicationId: recordId,
  caseId: String,
  documentId: ref('Document'),
  version: { type: Number, required: true },
  label: { type: String, required: true },
  qualityState: { type: String, enum: ['PENDING_REVIEW', 'READABLE', 'UNREADABLE'], default: 'PENDING_REVIEW' },
  note: String,
  recordedByUserId: ref('User'),
}, { timestamps: { createdAt: true, updatedAt: false } })
documentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true })
export const DocumentVersion = model('DocumentVersion', documentVersionSchema)

export const LawyerAssignment = model('LawyerAssignment', new Schema({
  applicationId: recordId,
  caseId: { type: String, required: true, index: true },
  lawyerUserId: ref('User'),
  active: { type: Boolean, default: true },
}, { timestamps: true }))

export const DemoSession = model('DemoSession', new Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: ref('User'),
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: { createdAt: true, updatedAt: false } }))

export const Counter = model('Counter', new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number, required: true, default: 0 },
}))
