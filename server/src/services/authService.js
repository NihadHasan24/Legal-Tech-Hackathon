import { createHash, randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { DemoSession, RoleAssignment, User } from '../models/index.js'
import { HttpError } from '../utils/httpError.js'
import { verifyPassword } from '../utils/password.js'

export const tokenHash = (token) => createHash('sha256').update(token).digest('hex')

const failedLogins = new Map()
const loginWindowMs = 15 * 60 * 1000
const maxLoginFailures = 5
const maxLoginBuckets = 4096
const demoAccounts = new Map([['DLAO_OFFICER', 'demo.officer'], ['UDC_OPERATOR', 'demo.udc']])
const staffLoginEnabled = () => process.env.NODE_ENV !== 'production' || process.env.STAFF_LOGIN_ENABLED === 'true'

export async function getDemoCredentials(role) {
  if (process.env.NODE_ENV === 'production') throw new HttpError(503, 'DEMO_AUTH_DISABLED', 'Demo authentication is disabled in production.')
  const username = demoAccounts.get(role)
  if (!username) throw new HttpError(404, 'DEMO_ACCOUNT_NOT_FOUND', 'That demo role is not available.')

  let credentials
  try {
    credentials = JSON.parse(await readFile(new URL('../../.demo-credentials.json', import.meta.url), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') throw new HttpError(503, 'DEMO_ACCOUNTS_NOT_SEEDED', 'Demo accounts are not ready. Seed the server demo accounts first.')
    throw error
  }
  const password = credentials?.[username]
  if (typeof password !== 'string' || !password) throw new HttpError(503, 'DEMO_ACCOUNTS_NOT_SEEDED', 'Demo accounts are not ready. Seed the server demo accounts first.')
  return { username, password }
}

export async function login(username, password, remoteAddress = '') {
  if (!staffLoginEnabled()) throw new HttpError(503, 'DEMO_AUTH_DISABLED', 'Staff sign-in is disabled on this server.')
  const key = createHash('sha256').update(`${remoteAddress}\0${username.toLowerCase()}`).digest('hex')
  const now = Date.now()
  let failures = failedLogins.get(key)
  if (failures?.resetAt <= now) {
    failedLogins.delete(key)
    failures = null
  }
  if (failures?.count >= maxLoginFailures) throw new HttpError(429, 'LOGIN_RATE_LIMITED', 'Too many sign-in attempts. Try again later.')

  const user = await User.findOne({ username: username.toLowerCase(), active: true }).select('+passwordHash')
  const dummyHash = `${'0'.repeat(32)}:${'0'.repeat(128)}`
  if (!await verifyPassword(password, user?.passwordHash ?? dummyHash)) {
    if (!failures) {
      // ponytail: bounded per-process buckets; use a shared limiter before horizontal scaling.
      if (failedLogins.size >= maxLoginBuckets) {
        for (const [entry, value] of failedLogins) if (value.resetAt <= now) failedLogins.delete(entry)
        if (failedLogins.size >= maxLoginBuckets) failedLogins.delete(failedLogins.keys().next().value)
      }
      failures = { count: 0, resetAt: now + loginWindowMs }
    }
    failures.count += 1
    failedLogins.set(key, failures)
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.')
  }
  failedLogins.delete(key)
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  await DemoSession.create({ tokenHash: tokenHash(token), userId: user._id, expiresAt })
  return { token, expiresAt, user: { id: user.id, displayName: user.displayName } }
}

export async function getSession(token) {
  if (!staffLoginEnabled()) return null
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
