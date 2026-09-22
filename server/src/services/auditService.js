import { createHash } from 'node:crypto'
import { AuditEvent } from '../models/index.js'

function digest(event) {
  const payload = {
    applicationId: event.applicationId ?? null,
    caseId: event.caseId ?? null,
    sequence: event.sequence ?? null,
    action: event.action,
    actorUserId: event.actorUserId?.toString() ?? null,
    actorRole: event.actorRole,
    channel: event.channel ?? null,
    previousState: event.previousState ?? null,
    newState: event.newState ?? null,
    reason: event.reason ?? null,
    previousHash: event.previousHash ?? null,
    createdAt: new Date(event.createdAt).toISOString(),
  }
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export async function appendAudit(event, session) {
  const previous = event.applicationId
    ? await AuditEvent.findOne({ applicationId: event.applicationId }).sort({ sequence: -1 }).session(session).lean()
    : null
  const entry = { ...event, previousHash: previous?.hash ?? null, createdAt: new Date() }
  entry.hash = digest(entry)
  const [saved] = await AuditEvent.create([entry], { session })
  return saved
}

export async function getAuditTrail(applicationId) {
  const events = await AuditEvent.find({ applicationId }).sort({ sequence: 1 }).lean()
  let previousHash = null
  let valid = true
  for (const [index, event] of events.entries()) {
    if (event.sequence !== index + 1 || event.previousHash !== previousHash || event.hash !== digest(event)) valid = false
    previousHash = event.hash
  }
  return { valid, events }
}
