import { expect, test } from 'vitest'
import { appendTranscript, applyExtraction, parseAnswer } from './voiceAgent.js'
import { answer, correct, nextField, payload, startCall } from './voiceScript.js'


test('extracted answers are validated against the same script the keyboard uses', () => {
  const { call, accepted } = applyExtraction(startCall(), {
    urgent: false,
    callerRole: 'REPRESENTATIVE',
    identityDocument: 'MAYBE', // not an allowed code
    callerName: 'Ripon', // asked only once the caller is a representative, so it lands in the same pass
    LIVE_VOICE: 'DENIED', // not a question in the script
    role: 'DLAO_OFFICER', // injected field
    applicantConfirmed: true, // injected field
  })
  expect(accepted).toEqual(['urgent', 'callerRole', 'callerName'])
  expect(call.answers.identityDocument).toBeUndefined()
  expect(call.answers.LIVE_VOICE).toBeUndefined()
  expect(call.aiFields).toEqual(['urgent', 'callerRole', 'callerName'])
  expect(Object.keys(call.answers)).not.toContain('role')
})

test('a spoken answer fills only the question being asked', () => {
  let call = startCall()
  for (const [field, value] of [['urgent', false], ['callerRole', 'SELF']]) call = answer(call, field, value)
  // Mentioning the problem while giving a name does not skip the problem question.
  let result = applyExtraction(call, { applicantName: 'Moyuri', problem: 'স্বামী মারধর করে।', district: 'Joypurhat' })
  expect(result.accepted).toEqual(['applicantName'])
  call = answer(result.call, 'identityDocument', 'UNKNOWN')
  expect(nextField(call)).toBe('problem')
  // Telling the problem does not re-answer the keypad question, so it gets no AI flag and no voice clip.
  result = applyExtraction(call, { callerRole: 'SELF', problem: 'আমি নিজের জন্য ফোন করছি। স্বামী মারধর করে।' })
  expect(result.accepted).toEqual(['problem'])
  expect(result.call.aiFields).not.toContain('callerRole')
})

test('a spoken correction is tracked and Bangla digits become a usable phone number', () => {
  let call = startCall()
  for (const [field, value] of [['urgent', false], ['callerRole', 'SELF'], ['applicantName', 'Moyuri'], ['identityDocument', 'UNAVAILABLE'],
    ['problem', 'স্বামী মারধর করে।'], ['district', 'Jaipurhat'], ['contactChannel', 'PHONE'], ['contactValue', '০১৭০০০০০০০০'],
    ['safeTime', 'সকাল ১০টা'], ['smsSafe', false]]) {
    call = applyExtraction(call, { [field]: value }).call
  }
  expect(call.answers.contactValue).toBe('01700000000')
  call = applyExtraction(correct(call, 'district'), { district: 'Joypurhat' }).call
  const body = payload(call, { confirmation: 'VOICE', transcript: [{ speaker: 'CALLER', text: 'আমার সমস্যা…' }] })
  expect(body.answers.district).toBe('Joypurhat')
  expect(body.correctedFields).toEqual(['district'])
  expect(body.aiFields).toContain('problem')
  expect(body.transcript).toHaveLength(1)
  expect(JSON.stringify(body)).not.toMatch(/applicantConfirmed|sourceType|"audio"/)
})

test('the payload carries no consent choices or empty transcript, and answers are range-checked', () => {
  const call = answer(startCall(), 'urgent', false)
  expect(payload(call)).not.toHaveProperty('consents')
  expect(payload(call, { transcript: [] })).not.toHaveProperty('transcript')
  expect(payload(call, { transcript: [{ speaker: 'CALLER', text: 'hello' }] }).transcript).toHaveLength(1)
  expect(parseAnswer('problem', 'ok')).toBeUndefined() // shorter than the minimum
  expect(parseAnswer('contactValue', 'not a number')).toBeUndefined()
  expect(parseAnswer('urgent', 'YES')).toBe(true)
  expect(appendTranscript([{ speaker: 'CALLER', text: 'আমি ' }], 'CALLER', 'রিপন')).toEqual([{ speaker: 'CALLER', text: 'আমি রিপন' }])
})
