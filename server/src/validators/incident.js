import mongoose from 'mongoose'
import { HttpError } from '../utils/httpError.js'

const fail = (message) => { throw new HttpError(400, 'VALIDATION_ERROR', message) }
const text = (value, label, min = 10, max = 1000) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(`${label} must be ${min}-${max} characters.`)
  return value.trim()
}

function body(request, fields) {
  const value = request.body
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some((key) => !fields.includes(key))) fail('Unexpected or missing fields.')
  return value
}

export function incidentGroupIdParam(request, _response, next) {
  if (!mongoose.isValidObjectId(request.params.groupId)) fail('Related incident group ID is invalid.')
  next()
}

export function otherApplicationIdParam(request, _response, next) {
  if (!/^APP-\d{4}-\d{6}$/.test(request.params.otherApplicationId)) fail('Candidate Application ID is invalid.')
  next()
}

export function validateIncidentGroup(request, _response, next) {
  const value = body(request, ['applicationIds', 'title', 'reason'])
  if (!Array.isArray(value.applicationIds) || value.applicationIds.length < 2 || value.applicationIds.length > 10 || value.applicationIds.some((id) => typeof id !== 'string' || !/^APP-\d{4}-\d{6}$/.test(id))) fail('Choose 2-10 valid Application IDs.')
  if (!value.applicationIds.includes(request.params.applicationId)) fail('Include the current Application in the related-incident group.')
  value.title = text(value.title, 'Group title', 3, 120)
  value.reason = text(value.reason, 'Reason')
  next()
}

export function validateIncidentEvidence(request, _response, next) {
  const value = body(request, ['documentId', 'reason'])
  if (typeof value.documentId !== 'string' || !mongoose.isValidObjectId(value.documentId)) fail('Document ID is invalid.')
  value.reason = text(value.reason, 'Evidence-link reason')
  next()
}

export function validateDuplicateReview(request, _response, next) {
  const value = body(request, ['decision', 'reason'])
  if (!['CONFIRMED_DUPLICATE', 'NOT_DUPLICATE'].includes(value.decision)) fail('Human review decision is invalid.')
  value.reason = text(value.reason, 'Human review reason')
  next()
}
