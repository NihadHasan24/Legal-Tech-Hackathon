import { expect, test } from 'vitest'
import { appendTranscript, applyExtraction, parseAnswer, pauseDetector, spokenDigits, spokenKey } from './voiceAgent.js'
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
  expect(appendTranscript([{ speaker: 'CALLER', text: 'না' }], 'CALLER', 'রিপন')).toEqual([{ speaker: 'CALLER', text: 'না' }, { speaker: 'CALLER', text: 'রিপন' }])
})

// Feeds loudness readings every 100 ms, as the page samples the microphone; returns when the answer ends, or null.
function endsAt(segments, pauseMs = 2500) {
  const paused = pauseDetector(pauseMs)
  let now = 0
  for (const [level, ms] of segments) for (let end = now + ms; now < end; now += 100) if (paused(level, now)) return now
  return null
}

test('a spoken answer ends after the caller speaks and then pauses, not while they think or cough', () => {
  const quiet = 0.002
  // Beep echo, thinking, "আমার নাম … রহিমা খাতুন" with a short gap between words, then quiet: ends 2.5 s after speech.
  expect(endsAt([[0.2, 300], [quiet, 1500], [0.08, 600], [quiet, 500], [0.08, 600], [quiet, 5000]])).toBe(6000)
  expect(endsAt([[quiet, 10000]])).toBeNull() // never spoke: # or the time limit ends it
  expect(endsAt([[quiet, 1000], [0.1, 200], [quiet, 6000]])).toBeNull() // a cough is not an answer
  // Steady room hum louder than the minimum level is the floor, not speech.
  expect(endsAt([[0.03, 2000], [0.3, 1000], [0.03, 4000]])).toBe(5500)
  // The problem question allows longer pauses to think: a 3 s gap does not end it, 4 s of quiet does.
  expect(endsAt([[quiet, 1000], [0.08, 1000], [quiet, 3000], [0.08, 1000], [quiet, 6000]], 4000)).toBe(10000)
})

test('a key number or phone number said aloud is matched like one pressed on the keypad', () => {
  expect(spokenKey('দুই।')).toBe(2)
  expect(spokenKey(' ৩ ')).toBe(3)
  expect(spokenKey('এক')).toBe(1)
  expect(spokenKey('একজন')).toBeUndefined() // a word that only starts like a number is not a key
  expect(spokenKey('নিজের জন্য')).toBeUndefined() // words go to the model instead
  expect(spokenDigits('০১৭০০ ১২৩-৪৫৬')).toBe('01700123456')
  expect(spokenDigits('12345')).toBeUndefined() // too short to be a phone number
  expect(spokenDigits(null)).toBeUndefined()
})
