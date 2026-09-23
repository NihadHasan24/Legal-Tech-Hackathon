import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { api } from '../services/api.js'
import { appendTranscript, applyExtraction, closeMicrophone, openMicrophone, spokenDigits, spokenKey, startRecording } from '../utils/voiceAgent.js'
import { activeFields, answer, correct, nextField, payload, startCall, steps } from '../utils/voiceScript.js'
import { getLang, useLang } from '../components/Bi.jsx'

// A phone-call screen for the 16699 simulation, run like an IVR line: a recorded Bangla clip asks each question and,
// after the beep, the caller answers by voice (then pauses or presses #) or on the keypad. A spoken safe number is read
// back digit by digit for the caller to confirm, so it is taken by voice only once those clips exist.
// The whole call is recorded under the greeting's notice. The clips are recorded in Bangla only, so English mode shows
// the questions as text and skips the clips (like light mode) until English recordings exist.
const copies = { bn: {
  simulation: 'ওয়েবে তৈরি নমুনা কল · আসল ১৬৬৯৯ ফোনসেবা নয়',
  call: 'কল করুন',
  hangUp: 'কল শেষ করুন',
  hangUpConfirm: 'কল শেষ করবেন? আপনার উত্তরগুলো জমা হবে না।',
  recording: 'কলটি রেকর্ড হচ্ছে',
  repeatKey: 'আবার শুনুন',
  finishKey: 'শেষ',
  submitKey: 'জমা দিন',
  typeInstead: 'লিখে উত্তর দিন',
  readback: 'আপনার উত্তরগুলো শুনে বা পড়ে মিলিয়ে নিন',
  listening: 'শুনছি… বলা শেষ হলে একটু থামুন বা # চাপুন।',
  transcribing: 'আপনার কথা থেকে উত্তরটি নেওয়া হচ্ছে…',
  submitting: 'আবেদন জমা হচ্ছে…',
  micDenied: 'মাইক্রোফোন চালু করা যায়নি। এই কল শুরু করতে মাইক্রোফোনের অনুমতি দিন।',
  voiceOff: 'এখন আপনার বলা উত্তরটি বোঝা যাচ্ছে না। লিখে উত্তর দিন; আগের উত্তরগুলো রাখা আছে।',
  urgent: 'আপনার নিরাপত্তাই আগে। শুধু যোগাযোগের তথ্য নেব, একজন কর্মী ফোন করবেন। তাৎক্ষণিক বিপদে ৯৯৯-এ ফোন করুন।',
  representative: 'তথ্যগুলো প্রতিনিধি জানিয়েছেন। আবেদনকারী নিজে নিশ্চিত না করা পর্যন্ত সেভাবেই নথিতে থাকবে।',
  failed: 'জমা দেওয়া যায়নি; আপনার উত্তরগুলো রাখা আছে। আবার ১ চাপুন।',
  uploading: 'আবেদন জমা হয়েছে। কলের রেকর্ডিং সংরক্ষণ হচ্ছে; এই পৃষ্ঠা খোলা রাখুন।',
  recordingFailed: 'আবেদন জমা হয়েছে, কিন্তু কলের রেকর্ডিং সংরক্ষণ হয়নি। এই পৃষ্ঠা খোলা রেখে আবার চেষ্টা করুন।',
  recordingMissing: 'আবেদন জমা হয়েছে, কিন্তু কলের রেকর্ডিং পাওয়া যায়নি। আবেদন নম্বর লিখে রাখুন এবং কর্মীর সাহায্য নিন।',
  recordingUnavailable: 'আবেদন জমা হয়েছে, কিন্তু কলের রেকর্ডিং সংরক্ষণ করা যায়নি। আবেদন নম্বর লিখে রাখুন এবং কর্মীর সাহায্য নিন।',
  retryRecording: 'রেকর্ডিং আবার পাঠান',
  review: 'একজন লিগ্যাল এইড কর্মকর্তা আবেদনটি দেখে যোগাযোগ করবেন।',
  callback: 'একজন কর্মী আপনার দেওয়া নিরাপদ নম্বরে, নিরাপদ সময়ে ফোন করবেন।',
  code: 'আবেদনের অবস্থা জানার গোপন কোড',
  codeNote: 'কোডটি একবারই দেখানো হচ্ছে। লিখে রাখুন, কাউকে দেবেন না।',
  newCall: 'নতুন কল',
  title: 'লিগ্যাল এইড হেল্পলাইন',
  keypad: 'কিপ্যাড',
  answer: 'উত্তর দিন',
  yourVoice: 'আপনার বলা উত্তর',
  fix: 'সংশোধন করুন',
  submitted: 'আবেদন জমা হয়েছে',
  erase: 'মুছুন',
  heardNumber: 'আপনার বলা নম্বর',
  correct: 'ঠিক আছে',
  wrong: 'ভুল',
}, en: {
  simulation: 'Web simulation · not a real phone call',
  call: 'Call',
  hangUp: 'End call',
  hangUpConfirm: 'End the call? Your answers will not be submitted.',
  recording: 'This call is being recorded',
  repeatKey: 'Repeat',
  finishKey: 'Done',
  submitKey: 'Submit',
  typeInstead: 'Type your answer',
  readback: 'Check what you said',
  listening: 'Listening… pause or press # when you finish.',
  transcribing: 'Understanding your answer…',
  submitting: 'Submitting the application…',
  micDenied: 'The microphone could not start. Allow microphone access to begin this call.',
  voiceOff: 'Voice understanding is not available right now. Type your answer; your answers are kept.',
  urgent: 'Your safety comes first. We will take only contact details and a staff member will call you. In immediate danger, call 999.',
  representative: 'This information comes from a representative; it stays that way until the applicant confirms it.',
  failed: 'Could not submit; your answers are kept. Press 1 again.',
  uploading: 'Application submitted. Saving the call recording; keep this page open.',
  recordingFailed: 'Application submitted, but the call recording was not saved. Keep this page open and try again.',
  recordingMissing: 'Application submitted, but no call recording was found. Note the application number and ask staff for help.',
  recordingUnavailable: 'Application submitted, but the call recording could not be saved. Note the application number and ask staff for help.',
  retryRecording: 'Send the recording again',
  review: 'A legal aid officer will review the application and contact you.',
  callback: 'A staff member will call the safe number you gave, at the safe time.',
  code: 'Secret code for checking status',
  codeNote: 'This code is shown only once. Write it down and do not share it.',
  newCall: 'New call',
  title: 'Legal Aid Helpline',
  keypad: 'Keypad',
  answer: 'Answer',
  yourVoice: 'Your voice',
  fix: 'Correct',
  submitted: 'Application submitted',
  erase: 'Erase',
  heardNumber: 'The number you said',
  correct: 'Correct',
  wrong: 'Wrong',
} }
const bn = () => getLang() === 'bn'
const text = () => copies[getLang()]
const labelOf = (field) => (bn() ? steps[field].label : steps[field].labelEn)
const promptOf = (field) => (bn() ? steps[field].prompt : steps[field].en)
const choiceText = (choice) => (bn() ? choice[1] : choice[2])
const shownValue = (call, field) => { const choice = steps[field].choices?.find(([value]) => value === call.answers[field]); return choice ? choiceText(choice) : call.answers[field] }

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], '*': [941, 1209], 0: [941, 1336], '#': [941, 1477] }
const NO_INPUT_MS = 12000 // a choice or number question waits this long before the "no answer" clip
const MIN_SPOKEN_MS = 700 // a # sooner than this after the beep counts as no answer
const MAX_MISSES = 2 // after this many "no answer" clips in a row, wait quietly for a key
const PAUSE_MS = 2500 // a spoken answer ends when the caller has been quiet this long, as if they pressed #
const LONG_PAUSE_MS = 4000 // the problem is told in the caller's own words, with longer pauses to think
const QUICK_PAUSE_MS = 1500 // a yes/no or a choice is one or two words
const READ_BACK_CLIPS = [...[...'0123456789'].map((digit) => `digit${digit}`), 'numberConfirm']
const bnDigits = (value) => (bn() ? value.replace(/[0-9]/g, (digit) => '০১২৩৪৫৬৭৮৯'[digit]) : value)
const kindOf = (field) => (!field ? 'READBACK' : steps[field].choices ? 'CHOICE' : steps[field].tel ? 'DIGITS' : 'SPOKEN')
const lightMode = () => { try { return localStorage.getItem('dlas-light-mode') === '1' } catch { return false } }

const PhoneIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.6 21 3 13.4 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z" /></svg>

// Short generated tones (key presses and the "speak now" beep); no audio files needed.
function playTone(context, frequencies, ms = 120) {
  if (!context || context.state === 'closed') return
  const gain = context.createGain()
  gain.gain.value = 0.06
  gain.connect(context.destination)
  for (const frequency of frequencies) {
    const oscillator = context.createOscillator()
    oscillator.frequency.value = frequency
    oscillator.connect(gain)
    oscillator.start()
    oscillator.stop(context.currentTime + ms / 1000)
  }
}

// Plays recorded clips in order. Resolves true when they finish (a missing clip is skipped), false when stopped.
function createClipPlayer() {
  const audio = new Audio()
  let settle = null
  const playOne = (clip) => new Promise((resolve) => {
    settle = resolve
    audio.onended = () => resolve(true)
    audio.onerror = () => resolve(true)
    audio.src = `/audio/${clip}.mp3`
    audio.play().catch(() => resolve(true))
  })
  return {
    async play(clips) {
      for (const clip of clips) if (!await playOne(clip)) return false
      return true
    },
    stop() { audio.pause(); settle?.(false) },
  }
}


// Kept in its own component so the ticking clock re-renders only itself.
function CallTimer() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const twoDigits = new Intl.NumberFormat(bn() ? 'bn-BD' : 'en-BD', { minimumIntegerDigits: 2 })
  return <span className="call-timer" role="timer">{twoDigits.format(Math.floor(seconds / 60))}:{twoDigits.format(seconds % 60)}</span>
}

function Keypad({ hints, onPress }) {
  return (
    <div className="keypad" role="group" aria-label={text().keypad}>
      {KEYS.map((key) => (
        <button key={key} type="button" className="keypad-key" onClick={() => onPress(key)}>
          <span className="keypad-digit">{bnDigits(key)}</span>{hints[key] && <>{' '}<span className="keypad-hint">{hints[key]}</span></>}
        </button>
      ))}
    </div>
  )
}

function TypedAnswer({ field, initial, onAnswer }) {
  const step = steps[field]
  const [draft, setDraft] = useState(initial ?? '')
  const Field = step.long ? 'textarea' : 'input'
  return (
    <form className="call-typed" onSubmit={(event) => { event.preventDefault(); onAnswer(draft.trim()) }}>
      <Field id="voice-answer" name={field} aria-labelledby="voice-prompt" value={draft} onChange={(event) => setDraft(event.target.value)}
        required minLength={step.min ?? 2} maxLength={step.max ?? 20} autoComplete="off" autoFocus />
      <button type="submit" className="secondary-button">{text().answer}</button>
    </form>
  )
}

function Readback({ call, recordings, onCorrect }) {
  const copy = copies[useLang()]
  return (
    <>
      {call.mode === 'INTAKE' && call.answers.callerRole === 'REPRESENTATIVE' && <p className="call-note">{copy.representative}</p>}
      <dl className="details readback">
        {activeFields(call).map((field) => <div key={field}>
          <dt>{labelOf(field)}</dt>
          <dd>
            {shownValue(call, field)}
            {recordings[field] && <audio controls preload="none" src={recordings[field]} aria-label={`${copy.yourVoice}: ${labelOf(field)}`} />}
            <button type="button" className="text-button" onClick={() => onCorrect(field)}>{copy.fix} <span className="visually-hidden">{labelOf(field)}</span></button>
          </dd>
        </div>)}
      </dl>
    </>
  )
}

export default function VoiceAccess() {
  const copy = copies[useLang()]
  const [call, setCall] = useState(null)
  const [modeState, setModeState] = useState({ turn: 'IDLE', mode: 'PROMPT' })
  const [attempt, setAttempt] = useState(0)
  const [digitState, setDigitState] = useState({ turn: 'IDLE', value: '' })
  const [voiceOff, setVoiceOff] = useState(false)
  const [notice, setNotice] = useState(null)
  const [micOpen, setMicOpen] = useState(false)
  const [recordings, setRecordings] = useState({})
  const [submission, setSubmission] = useState({ status: 'IDLE' })
  const [starting, setStarting] = useState(false)
  const [heardNumber, setHeardNumber] = useState({ turn: 'IDLE', value: null })
  const promptRef = useRef(null)
  const streamRef = useRef(null)
  const callRecorderRef = useRef(null)
  const answerRef = useRef(null) // the spoken answer being recorded: { recorder, startedAt }
  const playerRef = useRef(null)
  const toneRef = useRef(null)
  const timerRef = useRef(null)
  const runRef = useRef(0) // bumps whenever the current question is abandoned, so late callbacks do nothing
  const callIdRef = useRef(0)
  const leadRef = useRef([]) // a short clip to play before repeating the question (no answer, wrong key)
  const introsRef = useRef(null)
  const missesRef = useRef({ field: null, count: 0 })
  const transcriptRef = useRef([])
  const pendingRecordingRef = useRef(null)
  const readBackReadyRef = useRef(false) // every clip needed to read a spoken number back exists
  const field = call ? nextField(call) : undefined
  const done = ['DONE', 'UPLOADING_RECORDING', 'RECORDING_FAILED'].includes(submission.status)
  const question = call ? `${call.mode}:${field ?? 'READBACK'}:${done}:${attempt}` : 'IDLE'
  // A spoken number waiting for the caller's yes/no belongs to the question it was heard on.
  const spokenNumber = heardNumber.turn === question ? heardNumber.value : null
  const kind = spokenNumber ? 'CONFIRM' : kindOf(field)
  const turn = spokenNumber ? `${question}:CONFIRM` : question
  // Mode and typed digits belong to the question they were set for, so a new question starts clean. Without voice
  // understanding or a microphone, a spoken question opens straight into the typed answer.
  const typingDefault = kind === 'SPOKEN' && (voiceOff || !micOpen)
  const mode = modeState.turn === turn ? modeState.mode : typingDefault ? 'TYPING' : 'PROMPT' // PROMPT | WAITING | RECORDING | PROCESSING | TYPING
  const setMode = (next) => setModeState({ turn, mode: next })
  const digits = digitState.turn === turn ? digitState.value : ''
  const editDigits = (update) => setDigitState({ turn, value: update(digits) })

  // Each question (or a repeat) takes focus for screen readers, plays its clip, then waits for the caller.
  const askTurn = useEffectEvent(async () => {
    clearTimeout(timerRef.current)
    if (!call) return
    const run = ++runRef.current
    playerRef.current.stop()
    promptRef.current?.focus()
    if (missesRef.current.field !== field) missesRef.current = { field, count: 0 }
    const intro = field && (call.mode === 'INTAKE' ? 'greeting' : 'urgentHandoff')
    const intros = intro && !introsRef.current.has(intro) && (call.mode === 'CALLBACK' || field === 'urgent') ? [intro] : []
    intros.forEach((clip) => introsRef.current.add(clip))
    const ask = kind === 'CONFIRM' ? [...[...spokenNumber].map((digit) => `digit${digit}`), 'numberConfirm'] : [field ?? 'readback']
    const clips = [...leadRef.current, ...intros, ...(done ? submission.status === 'DONE' ? ['submitted'] : [] : ask)]
    leadRef.current = []
    const finished = lightMode() || !bn() || await playerRef.current.play(clips)
    if (finished && run === runRef.current && !done) listen()
  })
  useEffect(() => { askTurn() }, [turn])

  const onKeyboard = useEffectEvent((event) => {
    if (event.ctrlKey || event.altKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return
    if (event.key === 'Backspace' && kind === 'DIGITS') {
      event.preventDefault()
      editDigits((value) => value.slice(0, -1))
    } else if (KEYS.includes(event.key)) {
      event.preventDefault()
      pressKey(event.key)
    }
  })
  useEffect(() => {
    const listener = (event) => onKeyboard(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  // Leaving the page hangs up: clips, tones, recorders, and the microphone all stop.
  useEffect(() => () => {
    runRef.current += 1
    callIdRef.current += 1
    clearTimeout(timerRef.current)
    playerRef.current?.stop()
    answerRef.current?.recorder.cancel()
    callRecorderRef.current?.cancel()
    closeMicrophone(streamRef.current)
    toneRef.current?.close()
  }, [])

  // After the clip, every question records the caller's voice after a beep until a pause or #, while the keypad keeps
  // working. The number is spoken only when its read-back will be heard. Without voice, a spoken question opens the
  // typed answer and the rest wait for keys.
  function listen() {
    const readBackHeard = readBackReadyRef.current && bn() && !lightMode()
    if (voiceOff || !streamRef.current || (kind === 'DIGITS' && !readBackHeard)) return waitForKeys()
    const words = kind === 'SPOKEN' || kind === 'DIGITS'
    try {
      const pause = { context: toneRef.current, pauseMs: words ? steps[field].long ? LONG_PAUSE_MS : PAUSE_MS : QUICK_PAUSE_MS, onPause: () => { playTone(toneRef.current, [480], 150); finishSpoken() } }
      answerRef.current = { recorder: startRecording(streamRef.current, pause), startedAt: Date.now() }
    } catch {
      return waitForKeys()
    }
    playTone(toneRef.current, [1000], 200)
    setMode('RECORDING')
    if (words) timerRef.current = setTimeout(finishSpoken, steps[field].long ? 180000 : 20000)
    else if (kind !== 'READBACK') armNoInput()
  }

  function waitForKeys() {
    if (kind === 'SPOKEN') return setMode('TYPING')
    setMode('WAITING')
    if (kind !== 'READBACK') armNoInput()
  }

  function armNoInput() {
    clearTimeout(timerRef.current)
    if (missesRef.current.count >= MAX_MISSES) return
    timerRef.current = setTimeout(() => { missesRef.current.count += 1; repeat('noInput') }, NO_INPUT_MS)
  }

  function cancelAnswer() {
    clearTimeout(timerRef.current)
    answerRef.current?.recorder.cancel()
    answerRef.current = null
  }

  // Asks the same question again, optionally after a short clip ("no answer heard", "wrong key").
  function repeat(lead) {
    cancelAnswer()
    leadRef.current = lead ? [lead] : []
    setAttempt((value) => value + 1)
  }

  function choose(value, via) {
    cancelAnswer()
    setRecordings((existing) => ({ ...existing, [field]: undefined })) // a keyed, typed, or read-back answer has no voice clip
    setCall(answer(call, field, value, via))
  }

  function pressKey(key) {
    if (!call || done || mode === 'PROCESSING' || submission.status === 'PROCESSING') return
    playTone(toneRef.current, DTMF[key])
    missesRef.current.count = 0
    if (key === '*') return repeat()
    if (mode === 'PROMPT') {
      playerRef.current.stop() // a key cuts the clip short, like type-ahead on a phone line
      if (kind === 'SPOKEN' || key === '#') return listen() // skips to the beep
      setMode('WAITING')
    }
    if (key === '#' && answerRef.current) return finishSpoken()
    if (kind === 'READBACK') return key === '1' && submit()
    if (kind === 'CONFIRM') return key === '1' ? choose(spokenNumber, 'AI') : key === '2' ? repeat() : repeat('wrongKey')
    if (kind === 'CHOICE') {
      const option = steps[field].choices[Number(key) - 1]
      return option ? choose(option[0]) : repeat('wrongKey')
    }
    if (kind === 'DIGITS') {
      if (key === '#') return /^[0-9]{6,20}$/.test(digits) ? choose(digits) : repeat('noInput')
      if (answerRef.current) { cancelAnswer(); setMode('WAITING') } // typing the number instead of saying it
      editDigits((value) => (value + key).slice(0, 20))
      return armNoInput()
    }
  }

  // A pause or # ends an answer given by voice: transcribe it, keep only what validates, and move on; otherwise ask
  // again. A spoken number is read back first, and a yes/no to a read-back is its own small question.
  async function finishSpoken() {
    const current = answerRef.current
    if (!current) return
    answerRef.current = null
    clearTimeout(timerRef.current)
    const run = runRef.current
    const heard = Date.now() - current.startedAt >= MIN_SPOKEN_MS
    const clip = await current.recorder.stop()
    if (run !== runRef.current) return
    if (!heard) return repeat('noInput')
    setMode('PROCESSING')
    const readBack = kind === 'CONFIRM' || kind === 'READBACK'
    try {
      const result = await api(`/api/voice/answers?fields=${readBack ? 'confirm' : field}`, { method: 'POST', audio: clip })
      if (run !== runRef.current) return
      if (result.text) transcriptRef.current = appendTranscript(transcriptRef.current, 'CALLER', result.text)
      const key = spokenKey(result.text) // "এক" or "দুই" said instead of pressed
      if (readBack) {
        const agreed = { 1: true, 2: false }[key] ?? result.values.confirm
        if (agreed !== true) return repeat(agreed === false ? undefined : 'noInput')
        return kind === 'READBACK' ? submit('VOICE') : choose(spokenNumber, 'AI')
      }
      if (kind === 'DIGITS') {
        const number = spokenDigits(result.values[field])
        return number ? setHeardNumber({ turn: question, value: number }) : repeat('noInput')
      }
      const option = kind === 'CHOICE' && steps[field].choices[key - 1]
      const { call: next, accepted } = applyExtraction(call, option ? { [field]: option[0] } : result.values)
      if (accepted.length) {
        const clipUrl = URL.createObjectURL(clip)
        setRecordings((existing) => ({ ...existing, ...Object.fromEntries(accepted.map((item) => [item, clipUrl])) }))
        setCall(result.sensitive ? { ...next, aiSensitive: true } : next)
      }
      if (nextField(next) === field) repeat('noInput')
    } catch (failure) {
      if (run !== runRef.current) return
      if (failure.status !== 503) return repeat('noInput')
      setVoiceOff(true)
      setNotice(copy.voiceOff)
      setMode(kind === 'SPOKEN' ? 'TYPING' : 'WAITING')
    }
  }

  function typeInstead() {
    playerRef.current?.stop()
    cancelAnswer()
    setMode('TYPING')
  }

  async function placeCall() {
    const callId = ++callIdRef.current
    setStarting(true)
    setNotice(null)
    let stream
    try {
      stream = await openMicrophone()
      if (callId !== callIdRef.current) return closeMicrophone(stream) // hung up while the permission prompt was open
      toneRef.current?.close()
      toneRef.current = new AudioContext()
      playerRef.current = createClipPlayer()
      introsRef.current = new Set()
      setVoiceOff(false)
      transcriptRef.current = []
      leadRef.current = []
      pendingRecordingRef.current = null
      setRecordings({})
      setSubmission({ status: 'IDLE' })
      setAttempt(0)
      // Per-question state from an earlier call must not leak into the same question of this one.
      setModeState({ turn: 'IDLE', mode: 'PROMPT' })
      setDigitState({ turn: 'IDLE', value: '' })
      setHeardNumber({ turn: 'IDLE', value: null })
      readBackReadyRef.current = false
      Promise.all(READ_BACK_CLIPS.map((clip) => fetch(`/audio/${clip}.mp3`, { method: 'HEAD' })
        .then((response) => response.ok && /^audio\//.test(response.headers.get('content-type') ?? ''), () => false)))
        .then((found) => { readBackReadyRef.current = found.every(Boolean) })
      streamRef.current = stream
      callRecorderRef.current = startRecording(stream)
      setMicOpen(true)
      setCall(startCall())
    } catch {
      closeMicrophone(stream)
      streamRef.current = callRecorderRef.current = null
      toneRef.current?.close()
      setNotice(copy.micDenied)
    } finally {
      setStarting(false)
    }
  }

  // Stops the clip, any answer, and the full-call recording; releases the microphone; returns the recorded call.
  async function finishRecording() {
    callIdRef.current += 1
    runRef.current += 1
    playerRef.current?.stop()
    cancelAnswer()
    let clip
    try {
      clip = await callRecorderRef.current?.stop()
    } catch {
      clip = null
    } finally {
      closeMicrophone(streamRef.current)
      streamRef.current = callRecorderRef.current = null
      setMicOpen(false)
    }
    return clip
  }

  async function hangUp() {
    if (!window.confirm(copy.hangUpConfirm)) return
    await finishRecording()
    setCall(null)
  }

  async function submit(confirmation = 'BUTTON') {
    setSubmission({ status: 'PROCESSING' })
    let result
    try {
      result = await api('/api/voice/intakes', { method: 'POST', body: payload(call, { confirmation, transcript: transcriptRef.current }) })
    } catch {
      return setSubmission({ status: 'FAILED' })
    }
    setSubmission({ status: 'UPLOADING_RECORDING', applicationId: result.applicationId, lookupCode: result.lookupCode })
    const clip = await finishRecording()
    pendingRecordingRef.current = clip?.size ? clip : null
    if (!pendingRecordingRef.current) return setSubmission({ ...result, status: 'RECORDING_FAILED', retryable: false })
    await uploadRecording(result)
  }

  async function uploadRecording({ applicationId, lookupCode }) {
    setSubmission({ applicationId, lookupCode, status: 'UPLOADING_RECORDING' })
    try {
      await api(`/api/voice/intakes/${applicationId}/recording`, { method: 'POST', audio: pendingRecordingRef.current, headers: { 'x-lookup-code': lookupCode } })
      pendingRecordingRef.current = null
      setSubmission({ applicationId, lookupCode, status: 'DONE' })
    } catch (failure) {
      setSubmission({ applicationId, lookupCode, status: 'RECORDING_FAILED', retryable: ![403, 409, 413].includes(failure.status) })
    }
  }

  const hints = { '*': copy.repeatKey }
  if (kind === 'CHOICE') steps[field].choices.forEach((choice, index) => { hints[index + 1] = choiceText(choice) })
  if (kind === 'DIGITS' || mode === 'RECORDING') hints['#'] = copy.finishKey
  if (kind === 'READBACK') hints[1] = copy.submitKey
  if (kind === 'CONFIRM') Object.assign(hints, { 1: copy.correct, 2: copy.wrong })
  return (
    <section className="call-page" aria-labelledby="voice-title" lang={getLang()}>
      <header className="call-head">
        <h1 id="voice-title">{copy.title} <span translate="no">{bnDigits('16699')}</span></h1>
        <p className="sim-badge">{copy.simulation}</p>
      </header>

      {!call
        ? <><button type="button" className="call-button" onClick={placeCall} disabled={starting}><PhoneIcon />{copy.call}</button>{notice && <p role="alert" className="error">{notice}</p>}</>
        : <div className="call-card">
          {!done && <div className="call-status">
            {micOpen && <span className="call-rec"><span className="call-rec-dot" aria-hidden="true" />{copy.recording}</span>}
            <CallTimer />
          </div>}
          <div role="status" className="call-notice">
            {/* Not announced: a screen reader speaking now would be recorded as the answer; the beep is the cue. */}
            {mode === 'RECORDING' && <p aria-hidden="true">{copy.listening}</p>}
            {mode === 'PROCESSING' && <p>{copy.transcribing}</p>}
            {submission.status === 'PROCESSING' && <p>{copy.submitting}</p>}
            {notice && <p>{notice}</p>}
            {call.mode === 'CALLBACK' && field && <p className="call-note">{copy.urgent}</p>}
          </div>

          {done
            ? <div className="call-turn">
              <h2 id="voice-prompt" ref={promptRef} tabIndex={-1}>{copy.submitted}: <span lang="en" translate="no">{submission.applicationId}</span></h2>
              <p>{call.mode === 'CALLBACK' ? copy.callback : copy.review}</p>
              <p className="call-code">{copy.code}: <strong lang="en" translate="no">{submission.lookupCode}</strong></p>
              <p className="muted">{copy.codeNote}</p>
              {submission.status === 'UPLOADING_RECORDING' && <p role="status">{copy.uploading}</p>}
              {submission.status === 'RECORDING_FAILED' && <p role="alert" className="error">{!pendingRecordingRef.current ? copy.recordingMissing : submission.retryable ? copy.recordingFailed : copy.recordingUnavailable}</p>}
              {submission.status === 'RECORDING_FAILED' && submission.retryable && <button type="button" className="secondary-button" onClick={() => uploadRecording(submission)}>{copy.retryRecording}</button>}
              {submission.status === 'DONE' && <button type="button" className="secondary-button" onClick={() => setCall(null)}>{copy.newCall}</button>}
            </div>
            : <div className="call-turn">
              <h2 id="voice-prompt" ref={promptRef} tabIndex={-1}>{kind === 'CONFIRM' ? <>{copy.heardNumber}: <span translate="no">{bnDigits(spokenNumber)}</span></> : field ? promptOf(field) : copy.readback}</h2>
              {kind === 'DIGITS' && <div className="call-digits">
                <output aria-label={labelOf(field)}>{bnDigits(digits)}</output>
                {digits && <button type="button" className="text-button" onClick={() => editDigits((value) => value.slice(0, -1))}>{copy.erase}</button>}
              </div>}
              {kind === 'READBACK' && <Readback call={call} recordings={recordings}
                onCorrect={(item) => { setSubmission({ status: 'IDLE' }); setCall(correct(call, item)) }} />}
              {submission.status === 'FAILED' && <p role="alert" className="error">{copy.failed}</p>}
              {mode === 'TYPING' && kind === 'SPOKEN'
                ? <TypedAnswer key={`${field}:${attempt}`} field={field} initial={call.previous[field]} onAnswer={choose} />
                : <Keypad hints={hints} onPress={pressKey} />}
              {kind === 'SPOKEN' && mode !== 'TYPING' && <button type="button" className="text-button" onClick={typeInstead}>{copy.typeInstead}</button>}
            </div>}

          {!done && <button type="button" className="hang-up" onClick={hangUp}>{copy.hangUp}</button>}
        </div>}
    </section>
  )
}
