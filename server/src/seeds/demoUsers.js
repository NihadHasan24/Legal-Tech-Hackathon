import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import mongoose from 'mongoose'
import { Application, AuditEvent, Case, Person, RoleAssignment, Task, User } from '../models/index.js'
import { acceptApplication, reviewApplication, submitApplication } from '../services/applicationService.js'
import { hashPassword } from '../utils/password.js'

const accounts = [
  ['demo.officer', 'Demo DLAO Officer', 'DLAO_OFFICER'],
  ['demo.mediator', 'Demo Mediator', 'MEDIATOR'],
  ['demo.helpline', 'Demo Helpline Agent', 'HELPLINE_AGENT'],
  ['demo.udc', 'Demo UDC Operator', 'UDC_OPERATOR'],
  ['demo.lawyer', 'Demo Panel Lawyer', 'PANEL_LAWYER'],
  ['demo.receiving', 'Demo Receiving DLAO', 'RECEIVING_DLAO'],
  ['demo.support', 'Demo Case Support', 'CASE_SUPPORT'],
  ['demo.clao', 'Demo CLAO', 'CLAO'],
]

const credentialsFile = new URL('../../.demo-credentials.json', import.meta.url)

async function credentials() {
  try {
    return JSON.parse(await readFile(credentialsFile, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const generated = Object.fromEntries(accounts.map(([username]) => [username, randomBytes(24).toString('base64url')]))
  await writeFile(credentialsFile, JSON.stringify(generated, null, 2), { flag: 'wx', mode: 0o600 })
  return generated
}

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dlas', { dbName: process.env.MONGODB_DB || 'dlas', serverSelectionTimeoutMS: 10000 })
  await Promise.all([User, RoleAssignment, Application, Person, Case, Task, AuditEvent].map((item) => item.init()))
  const passwords = await credentials()
  for (const [username, displayName, role] of accounts) {
    if (typeof passwords[username] !== 'string') throw new Error('Demo credential file is incomplete.')
    const passwordHash = await hashPassword(passwords[username])
    const user = await User.findOneAndUpdate(
      { username },
      { $set: { displayName, passwordHash, active: true, fictional: true } },
      { upsert: true, returnDocument: 'after' },
    )
    await RoleAssignment.updateOne(
      { userId: user._id, role, officeCode: 'DEMO' },
      { $set: { active: true } },
      { upsert: true },
    )
  }
  let sample = await Application.findOne({ demoSeedKey: 'STEP3_SIMPLE' })
  if (!sample) {
    const helpline = await User.findOne({ username: 'demo.helpline' })
    const assignment = await RoleAssignment.findOne({ userId: helpline._id, role: 'HELPLINE_AGENT', active: true })
    const submitted = await submitApplication(
      { applicantName: 'Fictional Demo Applicant', demoSeedKey: 'STEP3_SIMPLE' },
      { userId: helpline._id, assignments: [assignment] },
    )
    sample = await Application.findOne({ applicationId: submitted.applicationId })
  }
  if (sample.status === 'SUBMITTED') {
    const officer = await User.findOne({ username: 'demo.officer' })
    const assignment = await RoleAssignment.findOne({ userId: officer._id, role: 'DLAO_OFFICER', active: true })
    const actor = { userId: officer._id, assignments: [assignment] }
    if (sample.reviewState !== 'READY_FOR_DECISION') {
      await reviewApplication(sample.applicationId, {
        reviewState: 'READY_FOR_DECISION',
        reason: 'Fictional seed record reviewed by the demo officer.',
      }, actor)
    }
    await acceptApplication(sample.applicationId, 'Fictional seed record accepted by the demo officer.', actor)
  }
  console.log('Seeded 8 fictional provider accounts and one shared demo case. Credentials are in the ignored server/.demo-credentials.json file.')
} catch (error) {
  console.error('Demo account seeding failed:', error.name, error.codeName || error.code || '')
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
