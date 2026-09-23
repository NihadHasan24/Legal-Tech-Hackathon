import { activeFields, answer, steps } from './voiceScript.js'

// Boundary between the AI and the intake draft. Whatever the model extracted from the caller's speech is
// checked here against the same script the keyboard uses: only questions already asked and only allowed values.
// The server validates the whole payload again before anything is saved.
const toolCode = (value) => (value === true ? 'YES' : value === false ? 'NO' : value)
const asciiDigits = (text) => text.replace(/[০-৯]/g, (digit) => '০১২৩৪৫৬৭৮৯'.indexOf(digit))

export function parseAnswer(field, raw) {
  const step = steps[field]
  if (!step) return undefined
  if (typeof raw === 'boolean') return step.choices?.some(([option]) => option === raw) ? raw : undefined
  if (typeof raw !== 'string') return undefined
  const value = step.tel ? asciiDigits(raw.trim()) : raw.trim()
  if (step.choices) return step.choices.map(([option]) => option).find((option) => toolCode(option) === value.toUpperCase())
  if (value.length < (step.min ?? 2) || value.length > (step.max ?? 20)) return undefined
  if (step.tel && !/^\+?[0-9][0-9 -]{5,19}$/.test(value)) return undefined
  return value
}

// Applies an extraction result. Returns the new draft plus the fields that were actually accepted.
export function applyExtraction(call, values) {
  const accepted = []
  const next = Object.entries(values ?? {}).reduce((draft, [field, raw]) => {
    if (!activeFields(draft).includes(field)) return draft
    const value = parseAnswer(field, raw)
    if (value === undefined) return draft
    accepted.push(field)
    return answer(draft, field, value, 'AI')
  }, call)
  return { call: next, accepted }
}

export function appendTranscript(turns, speaker, text) {
  const last = turns.at(-1)
  return last?.speaker === speaker ? [...turns.slice(0, -1), { speaker, text: `${last.text}${text}`.slice(0, 2000) }] : [...turns, { speaker, text }].slice(-300)
}

// One microphone stream serves the whole call: the full-call recording and each spoken answer share it.
export const openMicrophone = () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
export const closeMicrophone = (stream) => stream?.getTracks().forEach((track) => track.stop())

// Records from the open stream until stopped; the caller of this owns the stream and closes it.
export function startRecording(stream) {
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type))
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 24000 } : {})
  const chunks = []
  const clip = () => new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
  recorder.start()
  return {
    stop: () => new Promise((resolve) => {
      if (recorder.state === 'inactive') return resolve(clip())
      recorder.onstop = () => resolve(clip())
      recorder.stop()
    }),
    cancel: () => { if (recorder.state !== 'inactive') recorder.stop() },
  }
}
