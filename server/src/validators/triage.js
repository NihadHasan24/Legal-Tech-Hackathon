import mongoose from 'mongoose'
import { HttpError } from '../utils/httpError.js'

const fail = (message) => { throw new HttpError(400, 'VALIDATION_ERROR', message) }
const categories = ['LABOUR', 'FAMILY', 'LAND', 'CRIMINAL', 'OTHER', 'UNCERTAIN']
const dispositions = ['PRIORITIZE_FOR_HUMAN_REVIEW', 'CONTINUE_ROUTINE_REVIEW', 'SEEK_MORE_INFORMATION', 'REQUEST_JURISDICTION_REVIEW', 'NO_CHANGE']

export function triageAssessmentIdParam(request, _response, next) {
  if (!mongoose.isValidObjectId(request.params.assessmentId)) fail('Triage assessment ID is invalid.')
  next()
}

export function validateTriageDecision(request, _response, next) {
  const value = request.body
  const allowed = ['category', 'disposition', 'reason']
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== allowed.length || Object.keys(value).some((field) => !allowed.includes(field))) fail('Category, disposition, and reason are required.')
  if (!categories.includes(value.category)) fail('Human triage category is invalid.')
  if (!dispositions.includes(value.disposition)) fail('Human triage disposition is invalid.')
  if (typeof value.reason !== 'string' || value.reason.trim().length < 10 || value.reason.trim().length > 1000) fail('Human decision reason must be 10-1000 characters.')
  value.reason = value.reason.trim()
  next()
}
