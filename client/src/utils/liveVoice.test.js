import { expect, test } from 'vitest'
import { appendTranscript, applyToolCall, handleServerMessage } from './liveVoice.js'
import { answer, payload, startCall } from './voiceScript.js'

const consented = ['LIVE_VOICE', 'AUDIO_STORAGE', 'TRANSCRIPT_STORAGE'].reduce((call, scope) => answer(call, scope, 'GRANTED'), startCall())
const tool = (call, name, args) => applyToolCall(call, { name, args })
const record = (call, field, value) => tool(call, 'record_answer', { field, value }).call

test('tool arguments are validated before they touch the draft', () => {
  const accepted = tool(consented, 'record_answer', { field: 'callerRole', value: 'representative' })
  expect(accepted.call.answers.callerRole).toBe('REPRESENTATIVE')
  expect(accepted.response).toMatchObject({ ok: true, nextField: 'urgent' }) // volunteered answers are kept; the danger check still comes first

  for (const args of [
    { field: 'callerRole', value: 'DLAO_OFFICER' }, // not an allowed code
    { field: 'callerName', value: 'Ripon' }, // not asked until the caller is a representative
    { field: 'LIVE_VOICE', value: 'GRANTED' }, // the model can never grant consent
    { field: 'role', value: 'DLAO_OFFICER' }, // injected field
    { field: 'urgent', value: 'NO', applicantConfirmed: true }, // injected argument
  ]) {
    const rejected = tool(consented, 'record_answer', args)
    expect(rejected.response.ok).toBe(false)
    expect(rejected.call).toBe(consented)
  }
  expect(tool(consented, 'grant_role', { role: 'DLAO_OFFICER' }).response.ok).toBe(false)
})

test('representative answers stay AI-extracted caller reports and a spoken correction is tracked', () => {
  let call = consented
  for (const [field, value] of [['urgent', 'NO'], ['callerRole', 'REPRESENTATIVE'], ['callerName', 'Ripon'], ['relationship', 'Brother'],
    ['applicantName', 'Moyuri'], ['identityDocument', 'UNAVAILABLE'], ['problem', 'Fictional family dispute.'], ['district', 'Jaipurhat'],
    ['contactChannel', 'PHONE'], ['contactValue', '০১৭০০০০০০০০'], ['contactOwner', 'CALLER'], ['safeTime', 'Morning'], ['smsSafe', 'NO']]) {
    call = record(call, field, value)
  }
  expect(call.answers.contactValue).toBe('01700000000')
  const beforeReadback = tool({ ...call, readbackGiven: false }, 'submit_confirmed_intake')
  expect(beforeReadback.submit).toBeUndefined()
  call = record(call, 'district', 'Joypurhat')
  const body = payload(call, { confirmation: 'VOICE', transcript: [{ speaker: 'CALLER', text: 'আমার বোনের জন্য' }] })
  expect(body.answers.district).toBe('Joypurhat')
  expect(body.correctedFields).toEqual(['district'])
  expect(body.aiFields).toContain('problem')
  expect(body.transcript).toHaveLength(1)
  expect(JSON.stringify(body)).not.toMatch(/applicantConfirmed|sourceType|audio/)
  expect(tool(call, 'submit_confirmed_intake').submit).toBe(true)
})

test('transcript is left out without consent, and handoff switches to the minimal callback', () => {
  const noTranscript = answer(consented, 'TRANSCRIPT_STORAGE', 'DENIED')
  expect(payload(noTranscript, { transcript: [{ speaker: 'CALLER', text: 'hello' }] }).transcript).toBeUndefined()
  const handoff = tool(consented, 'request_human_callback', { reason: 'SENSITIVE_OR_UNCLEAR' })
  expect(handoff.call).toMatchObject({ mode: 'CALLBACK', reason: 'SENSITIVE_OR_UNCLEAR' })
  expect(handoff.response.nextField).toBe('contactValue')
  expect(tool(consented, 'request_human_callback', { reason: 'CLOSE_CASE' }).response.ok).toBe(false)
})

test('server messages dispatch barge-in, audio, transcripts, and tool calls', () => {
  const seen = []
  handleServerMessage({ serverContent: { interrupted: true, outputTranscription: { text: 'নমস্কার' } }, toolCall: { functionCalls: [{ id: '1', name: 'record_answer', args: {} }] } }, {
    interrupted: () => seen.push('interrupted'), transcript: (speaker) => seen.push(speaker), toolCall: ({ id }) => seen.push(`tool:${id}`),
  })
  expect(seen).toEqual(['interrupted', 'ASSISTANT', 'tool:1'])
  expect(appendTranscript([{ speaker: 'CALLER', text: 'আমি ' }], 'CALLER', 'রিপন')).toEqual([{ speaker: 'CALLER', text: 'আমি রিপন' }])
})
