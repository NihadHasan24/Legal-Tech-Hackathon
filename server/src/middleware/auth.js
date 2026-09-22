import { getSession } from '../services/authService.js'
import { HttpError } from '../utils/httpError.js'

export async function requireAuth(request, _response, next) {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(request.get('authorization') || '')
  const auth = match ? await getSession(match[1]) : null
  if (!auth) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.')
  request.auth = auth
  request.token = match[1]
  next()
}

export function requireRole(...roles) {
  return (request, _response, next) => {
    if (!request.auth?.assignments.some((assignment) => roles.includes(assignment.role))) {
      throw new HttpError(403, 'FORBIDDEN', 'This role cannot perform that action.')
    }
    next()
  }
}

export function hasOfficeRole(auth, role, officeCode) {
  return auth.assignments.some((assignment) => assignment.role === role && assignment.officeCode === officeCode)
}
