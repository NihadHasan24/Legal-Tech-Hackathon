import { createHash, randomBytes } from 'node:crypto'
import { DemoSession, RoleAssignment, User } from '../models/index.js'
import { HttpError } from '../utils/httpError.js'
import { verifyPassword } from '../utils/password.js'

export const tokenHash = (token) => createHash('sha256').update(token).digest('hex')

export async function login(username, password) {
  if (process.env.NODE_ENV === 'production') throw new HttpError(503, 'DEMO_AUTH_DISABLED', 'Demo authentication is disabled in production.')
  const user = await User.findOne({ username: username.toLowerCase(), active: true }).select('+passwordHash')
  if (!user || !await verifyPassword(password, user.passwordHash)) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.')
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  await DemoSession.create({ tokenHash: tokenHash(token), userId: user._id, expiresAt })
  return { token, expiresAt, user: { id: user.id, displayName: user.displayName } }
}

export async function getSession(token) {
  if (process.env.NODE_ENV === 'production') return null
  if (!/^[a-f0-9]{64}$/.test(token || '')) return null
  const session = await DemoSession.findOne({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } })
  if (!session) return null
  const user = await User.findOne({ _id: session.userId, active: true })
  if (!user) return null
  const assignments = await RoleAssignment.find({ userId: user._id, active: true }).lean()
  return { userId: user._id, displayName: user.displayName, assignments }
}

export async function logout(token) {
  await DemoSession.deleteOne({ tokenHash: tokenHash(token) })
}
