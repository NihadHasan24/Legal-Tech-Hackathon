import { login, logout } from '../services/authService.js'

export async function signIn(request, response) {
  response.json(await login(request.body.username, request.body.password))
}

export function currentUser(request, response) {
  response.json({ user: { id: request.auth.userId, displayName: request.auth.displayName, assignments: request.auth.assignments.map(({ role, officeCode }) => ({ role, officeCode })) } })
}

export async function signOut(request, response) {
  await logout(request.token)
  response.status(204).end()
}
