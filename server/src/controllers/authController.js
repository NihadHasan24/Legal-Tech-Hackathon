import { getDemoCredentials, login, logout } from '../services/authService.js'

export async function demoAccount(request, response) {
  response.json(await getDemoCredentials(request.params.role))
}

export async function signIn(request, response) {
  response.json(await login(request.body.username, request.body.password, request.ip))
}

export function currentUser(request, response) {
  response.json({ user: { id: request.auth.userId, displayName: request.auth.displayName, assignments: request.auth.assignments.map(({ role, officeCode }) => ({ role, officeCode })) } })
}

export async function signOut(request, response) {
  await logout(request.token)
  response.status(204).end()
}
