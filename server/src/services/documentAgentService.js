import mongoose from 'mongoose'
import { Application, AssistanceRecord, Document, DocumentBriefing, DocumentVersion } from '../models/index.js'
import { hasOfficeRole } from '../middleware/auth.js'
import { HttpError } from '../utils/httpError.js'
import { extractionModel, summarizeDocuments } from './ai/groq.js'
import { appendAudit } from './auditService.js'

export const documentChecklist = {
  FAMILY: ['Applicant identity evidence', 'Relationship record', 'Relevant communication'],
  LAND: ['Applicant identity evidence', 'Land record or deed', 'Location or plot details', 'Witness or other supporting record'],
  LABOUR: ['Applicant identity evidence', 'Employment or wage record', 'Employer communication'],
  CRIMINAL: ['Applicant identity evidence', 'Police or court document', 'Incident chronology'],
  OTHER: ['Applicant identity evidence', 'Problem chronology', 'Available supporting record'],
}

async function officerApplication(applicationId, actor, session) {
  const application = await Application.findOne({ applicationId }).session(session)
  if (!application) throw new HttpError(404, 'NOT_FOUND', 'Application not found.')
  if (!hasOfficeRole(actor, 'DLAO_OFFICER', application.officeCode)) throw new HttpError(403, 'FORBIDDEN', 'Only the owning DLAO officer may review document content.')
  return application
}

async function latestDocuments(applicationId) {
  const documents = await Document.find({ applicationId, sensitivity: 'STANDARD' }).select('label checklistItem currentVersion').lean()
  const versions = await DocumentVersion.find({ documentId: { $in: documents.map((item) => item._id) } }).sort({ version: -1 }).select('+textContent').lean()
  const latest = new Map()
  for (const version of versions) if (!latest.has(version.documentId.toString())) latest.set(version.documentId.toString(), version)
  return documents.map((document) => ({ document, version: latest.get(document._id.toString()) })).filter(({ version }) => version)
}

export async function proposeBriefing(applicationId, actor) {
  const application = await officerApplication(applicationId, actor)
  const assistance = await AssistanceRecord.findOne({ applicationId }).select('caseType').lean()
  if (!assistance) throw new HttpError(409, 'CASE_TYPE_REQUIRED', 'A recorded assisted case type is required for this checklist.')
  const items = documentChecklist[assistance.caseType]
  const documents = await latestDocuments(applicationId)
  const missing = items.filter((item) => !documents.some(({ document }) => document.checklistItem === item))
  const unreadable = documents.filter(({ version }) => version.qualityState !== 'READABLE' || !version.textContent).map(({ document }) => document.label)
  const citations = documents.filter(({ version }) => version.qualityState === 'READABLE' && version.textContent).flatMap(({ document, version }) =>
    version.textContent.split(/\r?\n/).map((line, index) => ({ line: index + 1, excerpt: line.trim().slice(0, 240) }))
      .filter(({ excerpt }) => excerpt).slice(0, 2).map(({ line, excerpt }) => ({ documentVersionId: version._id, label: document.label, line, excerpt })))
  let summary = `Provisional inventory: ${citations.length} cited excerpt${citations.length === 1 ? '' : 's'} from readable fictional documents. ${missing.length} checklist item${missing.length === 1 ? '' : 's'} missing; ${unreadable.length} unreadable or unverified document${unreadable.length === 1 ? '' : 's'}. No legal conclusion is made.`
  let model = 'deterministic-mock'
  if (citations.length) {
    try {
      const suggested = await summarizeDocuments(citations)
      if (suggested) { summary = suggested; model = `groq:${extractionModel()}` }
    } catch { /* Preserve the cited deterministic inventory when AI is unavailable. */ }
  }
  return mongoose.connection.transaction(async (session) => {
    const current = await officerApplication(applicationId, actor, session)
    if (current.version !== application.version) throw new HttpError(409, 'CONFLICT', 'The record changed while the briefing was prepared. Regenerate it.')
    const updated = await Application.findOneAndUpdate({ applicationId, version: current.version }, { $inc: { version: 1, auditSequence: 1 } }, { returnDocument: 'after', session })
    if (!updated) throw new HttpError(409, 'CONFLICT', 'The record changed. Regenerate the briefing.')
    const briefing = await DocumentBriefing.findOneAndUpdate({ applicationId }, { $set: {
      caseType: assistance.caseType, sourceVersion: updated.version, status: 'PROPOSED', model, summary, citations, missing, unreadable,
      approvedByUserId: null, approvedAt: null,
    } }, { upsert: true, returnDocument: 'after', session })
    await appendAudit({ applicationId, caseId: current.caseId, sequence: updated.auditSequence,
      action: 'DOCUMENT_BRIEFING_PROPOSED', actorUserId: actor.userId, actorRole: 'DLAO_OFFICER', channel: 'DLAO',
      newState: { briefingId: briefing.id, status: 'PROPOSED', model, citationVersionIds: citations.map((item) => item.documentVersionId.toString()), missing, unreadable },
    }, session)
    return briefing
  })
}

export async function getBriefing(applicationId, actor) {
  await officerApplication(applicationId, actor)
  const briefing = await DocumentBriefing.findOne({ applicationId }).lean()
  return briefing ?? { applicationId, status: 'NOT_GENERATED' }
}

export async function approveBriefing(applicationId, reason, actor) {
  return mongoose.connection.transaction(async (session) => {
    const application = await officerApplication(applicationId, actor, session)
    const briefing = await DocumentBriefing.findOne({ applicationId }).session(session)
    if (!briefing || briefing.status !== 'PROPOSED') throw new HttpError(409, 'NO_PROPOSAL', 'Generate an unapproved briefing first.')
    if (application.version !== briefing.sourceVersion) throw new HttpError(409, 'STALE_BRIEFING', 'The record changed. Regenerate the briefing.')
    for (const citation of briefing.citations) {
      const version = await DocumentVersion.findById(citation.documentVersionId).session(session)
      const document = version && await Document.findById(version.documentId).session(session)
      if (!document || document.currentVersion !== version.version) throw new HttpError(409, 'STALE_BRIEFING', 'A cited document changed. Regenerate the briefing.')
    }
    const updated = await Application.findOneAndUpdate({ applicationId, version: application.version }, { $inc: { version: 1, auditSequence: 1 } }, { returnDocument: 'after', session })
    if (!updated) throw new HttpError(409, 'CONFLICT', 'The record changed. Refresh and retry.')
    briefing.status = 'APPROVED'
    briefing.approvedByUserId = actor.userId
    briefing.approvedAt = new Date()
    await briefing.save({ session })
    await appendAudit({ applicationId, caseId: application.caseId, sequence: updated.auditSequence,
      action: 'DOCUMENT_BRIEFING_APPROVED', actorUserId: actor.userId, actorRole: 'DLAO_OFFICER', channel: 'DLAO',
      previousState: { status: 'PROPOSED' }, newState: { status: 'APPROVED', briefingId: briefing.id }, reason,
    }, session)
    return { applicationId, status: briefing.status, approvedAt: briefing.approvedAt }
  })
}
