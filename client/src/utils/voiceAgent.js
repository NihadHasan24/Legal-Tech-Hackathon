import { answer, nextField, steps } from './voiceScript.js'

// Boundary between the AI and the intake draft. Whatever the model extracted from the caller's speech is
// checked here against the same script the keyboard uses: only the question being asked and only allowed values.
// So a later question is never skipped, and an earlier answer (a keypad choice included) is never overwritten or
// given this clip; earlier answers change only through a correction, which makes that question current again.
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

// A caller may answer a choice by saying its key number ("দুই"). The model cannot see the key order, so an answer
// that is only a number is matched to its key here, like pressing it.
const numberWords = { এক: 1, দুই: 2, দু: 2, তিন: 3 }
export function spokenKey(text) {
  const word = asciiDigits(text ?? '').replace(/[\s।.,!?'"-]+/g, '')
  return numberWords[word] ?? (/^[1-9]$/.test(word) ? Number(word) : undefined)
}

// A spoken safe number is kept as digits only and checked like one typed on the keypad.
export function spokenDigits(raw) {
  const value = parseAnswer('contactValue', raw)?.replace(/[^0-9]/g, '')
  return /^[0-9]{6,20}$/.test(value ?? '') ? value : undefined
}

// Applies an extraction result. Returns the new draft plus the fields that were actually accepted.
export function applyExtraction(call, values) {
  const accepted = []
  const next = Object.entries(values ?? {}).reduce((draft, [field, raw]) => {
    if (field !== nextField(draft)) return draft
    const value = parseAnswer(field, raw)
    if (value === undefined) return draft
    accepted.push(field)
    return answer(draft, field, value, 'AI')
  }, call)
  return { call: next, accepted }
}

// One turn per answer, so a long problem description is not cut short by the answers around it.
export const appendTranscript = (turns, speaker, text) => [...turns, { speaker, text: text.slice(0, 2000) }].slice(-300)

// One microphone stream serves the whole call: the full-call recording and each spoken answer share it.
export const openMicrophone = () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
export const closeMicrophone = (stream) => stream?.getTracks().forEach((track) => track.stop())

// End of a spoken answer by loudness, like an IVR line: the caller has spoken for a moment and then stayed quiet
// for `pauseMs`. The quietest level heard so far is the room's floor, so steady hum does not count as speech;
// silence before the caller starts (thinking) never ends the answer, and the beep's echo at the start is ignored.
// ponytail: loudness only; a TV or crowd that never goes quiet leaves # and the time limit to end the answer.
// A model VAD (e.g. Silero) if field tests show that happens often.
const SPEECH_LEVEL = 0.015 // lowest RMS that counts as speech: the calibration knob for real phones and microphones
const SPEECH_OVER_FLOOR = 4 // speech must also be this many times louder than the room's floor (about 12 dB)
const MIN_SPEECH_MS = 300 // a cough or a click alone does not start the pause clock
const BEEP_MS = 300 // the "speak now" beep plays as recording starts

export function pauseDetector(pauseMs) {
  let start, last, quietSince
  let floor = Infinity
  let spoken = 0
  return (level, now) => {
    start ??= now
    const elapsed = now - (last ?? now)
    last = now
    const speech = level > Math.max(SPEECH_LEVEL, floor * SPEECH_OVER_FLOOR)
    floor = Math.min(floor, level)
    if (now - start < BEEP_MS) return false
    if (speech) {
      spoken += elapsed
      quietSince = undefined
      return false
    }
    if (spoken < MIN_SPEECH_MS) return false
    quietSince ??= now
    return now - quietSince >= pauseMs
  }
}

// Samples the microphone's loudness ten times a second, in the browser only; returns a function that stops it.
function watchPause(stream, { context, pauseMs, onPause }) {
  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  source.connect(analyser)
  const samples = new Float32Array(analyser.fftSize)
  const paused = pauseDetector(pauseMs)
  const id = setInterval(() => {
    analyser.getFloatTimeDomainData(samples)
    if (!paused(Math.hypot(...samples) / Math.sqrt(samples.length), performance.now())) return
    clearInterval(id)
    onPause()
  }, 100)
  return () => { clearInterval(id); source.disconnect() }
}

// Records from the open stream until stopped; the caller of this owns the stream and closes it.
// With `pause` ({ context, pauseMs, onPause }), onPause is called once when the caller stops talking.
export function startRecording(stream, pause) {
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type))
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 24000 } : {})
  const chunks = []
  const clip = () => new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
  recorder.start()
  const unwatch = pause ? watchPause(stream, pause) : () => {}
  return {
    stop: () => new Promise((resolve) => {
      unwatch()
      if (recorder.state === 'inactive') return resolve(clip())
      recorder.onstop = () => resolve(clip())
      recorder.stop()
    }),
    cancel: () => { unwatch(); if (recorder.state !== 'inactive') recorder.stop() },
  }
}
