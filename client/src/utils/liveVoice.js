import { activeFields, answer, consentScopes, displayValue, nextField, requestHuman, steps } from './voiceScript.js'

// ---- Tool boundary: the model can only propose answers to the same draft the keyboard edits. ----
// It cannot grant consent, set provenance, read records, or submit before a complete read-back;
// the server validates the final payload again.
const toolCode = (value) => (value === true ? 'YES' : value === false ? 'NO' : value)
const asciiDigits = (text) => text.replace(/[০-৯]/g, (digit) => '০১২৩৪৫৬৭৮৯'.indexOf(digit))
const handoffReasons = ['CALLER_REQUESTED_HUMAN', 'URGENT_HANDOFF', 'SENSITIVE_OR_UNCLEAR']

export function guidance(call) {
  const field = nextField(call)
  if (field) return { nextField: field, approvedQuestion: steps[field].prompt, ...(steps[field].choices ? { allowedValues: steps[field].choices.map(([value]) => toolCode(value)) } : {}) }
  return { nextField: null, readback: activeFields(call).filter((item) => !consentScopes.includes(item)).map((item) => `${steps[item].label}: ${displayValue(call, item)}`) }
}

function parseAnswer(field, raw) {
  const step = steps[field]
  if (typeof raw !== 'string') return undefined
  const value = step.tel ? asciiDigits(raw.trim()) : raw.trim()
  if (step.choices) return step.choices.map(([option]) => option).find((option) => toolCode(option) === value.toUpperCase())
  if (value.length < (step.min ?? 2) || value.length > (step.max ?? 20)) return undefined
  if (step.tel && !/^\+?[0-9][0-9 -]{5,19}$/.test(value)) return undefined
  return value
}

const settle = (call) => (nextField(call) ? call : { ...call, readbackGiven: true })

export function applyToolCall(call, { name, args = {} }) {
  const reject = (error) => ({ call, response: { ok: false, error, ...guidance(call) } })
  if (name === 'record_answer') {
    if (Object.keys(args).some((key) => key !== 'field' && key !== 'value')) return reject('Unexpected arguments.')
    if (consentScopes.includes(args.field) || !activeFields(call).includes(args.field)) return reject(`${args.field} cannot be recorded now.`)
    const value = parseAnswer(args.field, args.value)
    if (value === undefined) return reject(`That answer is not valid for ${args.field}; ask again.`)
    const next = settle(answer(call, args.field, value, 'AI'))
    return { call: next, response: { ok: true, ...guidance(next) } }
  }
  if (name === 'request_human_callback') {
    if (!handoffReasons.includes(args.reason)) return reject('Unknown handoff reason.')
    const next = settle(call.mode === 'CALLBACK' ? call : requestHuman(call, args.reason))
    return { call: next, response: { ok: true, ...guidance(next) } }
  }
  if (name === 'submit_confirmed_intake') {
    if (nextField(call)) return reject('Some answers are still missing.')
    if (!call.readbackGiven) return reject('Read the summary back and get confirmation first.')
    return { call, response: { ok: true }, submit: true }
  }
  return reject(`Unknown tool ${name}.`)
}

export function appendTranscript(turns, speaker, text) {
  const last = turns.at(-1)
  return last?.speaker === speaker ? [...turns.slice(0, -1), { speaker, text: `${last.text}${text}`.slice(0, 2000) }] : [...turns, { speaker, text }].slice(-300)
}

export function handleServerMessage(message, on) {
  const content = message.serverContent
  if (message.setupComplete) on.ready?.()
  if (content?.interrupted) on.interrupted?.()
  for (const part of content?.modelTurn?.parts ?? []) if (part.inlineData?.data) on.audio?.(part.inlineData.data)
  if (content?.inputTranscription?.text) on.transcript?.('CALLER', content.inputTranscription.text)
  if (content?.outputTranscription?.text) on.transcript?.('ASSISTANT', content.outputTranscription.text)
  if (content?.turnComplete) on.turnComplete?.()
  for (const functionCall of message.toolCall?.functionCalls ?? []) on.toolCall?.(functionCall)
  if (message.goAway) on.goAway?.()
}

// ---- Browser session: 16 kHz PCM up, 24 kHz PCM down, with barge-in. ----
// ponytail: no session resumption; a dropped or ~10-minute-old connection falls back to the keyboard route.
const LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'
const captureProcessor = "registerProcessor('pcm-capture', class extends AudioWorkletProcessor { process([input]) { if (input[0]) this.port.postMessage(input[0].slice(0)); return true } })"
const toBase64 = (bytes) => {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return btoa(binary)
}

export async function openLiveSession({ token, model, stream, on }) {
  const input = new AudioContext({ sampleRate: 16000 })
  const output = new AudioContext({ sampleRate: 24000 })
  const playing = new Set()
  let playAt = 0
  let queued = []
  let ready = false
  let closed = false
  await input.audioWorklet.addModule(URL.createObjectURL(new Blob([captureProcessor], { type: 'text/javascript' })))
  const source = input.createMediaStreamSource(stream)
  const capture = new AudioWorkletNode(input, 'pcm-capture')
  source.connect(capture)
  const socket = new WebSocket(`${LIVE_URL}?access_token=${encodeURIComponent(token)}`)
  const send = (message) => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)) }

  function close(reason) {
    if (closed) return
    closed = true
    clearTimeout(setupTimer)
    capture.disconnect()
    source.disconnect()
    stream.getTracks().forEach((track) => track.stop())
    input.close()
    output.close()
    if (socket.readyState <= WebSocket.OPEN) socket.close()
    if (reason) on.ended?.(reason)
  }
  const stopPlayback = () => { playing.forEach((node) => node.stop()); playing.clear(); playAt = 0 }
  const setupTimer = setTimeout(() => { if (!ready) close('TIMEOUT') }, 10000)

  capture.port.onmessage = ({ data }) => {
    if (!ready) return
    queued.push(data)
    const length = queued.reduce((total, chunk) => total + chunk.length, 0)
    if (length < 1600) return // about 100 ms per message
    const pcm = new Int16Array(length)
    let offset = 0
    for (const chunk of queued) for (const sample of chunk) pcm[offset++] = Math.max(-1, Math.min(1, sample)) * 0x7fff
    queued = []
    send({ realtimeInput: { audio: { data: toBase64(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' } } })
  }

  function play(base64) {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
    const pcm = new Int16Array(bytes.buffer, 0, bytes.length >> 1)
    const buffer = output.createBuffer(1, pcm.length, 24000)
    buffer.getChannelData(0).set(Float32Array.from(pcm, (sample) => sample / 0x8000))
    const node = output.createBufferSource()
    node.buffer = buffer
    node.connect(output.destination)
    playAt = Math.max(playAt, output.currentTime)
    node.start(playAt)
    playAt += buffer.duration
    playing.add(node)
    node.onended = () => playing.delete(node)
  }

  socket.onopen = () => send({ setup: { model: `models/${model}` } }) // The token's locked setup replaces this.
  socket.onmessage = async (event) => {
    const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text())
    handleServerMessage(message, {
      ...on,
      ready: () => { ready = true; clearTimeout(setupTimer); output.resume(); on.ready?.() },
      audio: (data) => { play(data); on.speaking?.(true) },
      interrupted: () => { stopPlayback(); on.speaking?.(false) },
      turnComplete: () => { on.speaking?.(false); on.turnComplete?.() },
      goAway: () => close('GO_AWAY'),
    })
  }
  socket.onerror = () => close('ERROR')
  socket.onclose = () => close('CLOSED')

  return {
    respond: (id, name, response) => send({ toolResponse: { functionResponses: [{ id, name, response }] } }),
    say: (text) => send({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } }),
    close: () => close(null),
  }
}
