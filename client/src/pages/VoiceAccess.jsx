import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { api } from '../services/api.js'
import { appendTranscript, applyExtraction, closeMicrophone, openMicrophone, startRecording } from '../utils/voiceAgent.js'
import { activeFields, answer, correct, displayValue, nextField, payload, startCall, steps } from '../utils/voiceScript.js'

// A phone-call screen for the 16699 simulation, run like an IVR line: a recorded Bangla clip asks each question,
// the caller answers choices and numbers on the keypad, speaks other answers after the beep and presses # when done.
// The whole call is recorded under the greeting's notice.
const copy = {
  simulation: 'ওয়েব সিমুলেশন · আসল ফোন কল নয়',
  call: 'কল করুন',
  hangUp: 'কল শেষ করুন',
  hangUpConfirm: 'কল শেষ করবেন? আপনার উত্তরগুলো জমা হবে না।',
  recording: 'কলটি রেকর্ড হচ্ছে',
  repeatKey: 'আবার শুনুন',
  finishKey: 'শেষ',
  submitKey: 'জমা দিন',
  typeInstead: 'লিখে উত্তর দিন',
  readback: 'যা বলেছেন, একবার দেখে নিন',
  listening: 'শুনছি… বলা শেষ হলে # চাপুন।',
  transcribing: 'আপনার কথা বোঝা হচ্ছে…',
  submitting: 'আবেদন জমা হচ্ছে…',
  micDenied: 'মাইক্রোফোন চালু করা যায়নি। এই কল শুরু করতে মাইক্রোফোনের অনুমতি দিন।',
  voiceOff: 'ভয়েস বোঝার সেবা এখন পাওয়া যাচ্ছে না। লিখে উত্তর দিন; আপনার উত্তরগুলো রাখা আছে।',
  urgent: 'আপনার নিরাপত্তাই আগে। শুধু যোগাযোগের তথ্য নেব, একজন কর্মী ফোন করবেন। তাৎক্ষণিক বিপদে ৯৯৯-এ ফোন করুন।',
  representative: 'এগুলো প্রতিনিধির দেওয়া তথ্য; আবেদনকারী নিজে নিশ্চিত না করা পর্যন্ত এভাবেই থাকবে।',
  failed: 'জমা দেওয়া যায়নি; আপনার উত্তরগুলো রাখা আছে। আবার ১ চাপুন।',
  uploading: 'আবেদন জমা হয়েছে। কলের রেকর্ডিং সংরক্ষণ হচ্ছে; এই পৃষ্ঠা খোলা রাখুন।',
  recordingFailed: 'আবেদন জমা হয়েছে, কিন্তু কলের রেকর্ডিং সংরক্ষণ হয়নি। এই পৃষ্ঠা খোলা রেখে আবার চেষ্টা করুন।',
  recordingMissing: 'আবেদন জমা হয়েছে, কিন্তু কলের রেকর্ডিং পাওয়া যায়নি। আবেদন নম্বর লিখে রাখুন এবং কর্মীর সাহায্য নিন।',
  recordingUnavailable: 'আবেদন জমা হয়েছে, কিন্তু কলের রেকর্ডিং সংরক্ষণ করা যায়নি। আবেদন নম্বর লিখে রাখুন এবং কর্মীর সাহায্য নিন।',
  retryRecording: 'রেকর্ডিং আবার পাঠান',
  review: 'একজন লিগ্যাল এইড কর্মকর্তা আবেদনটি দেখে যোগাযোগ করবেন।',
  callback: 'একজন কর্মী আপনার দেওয়া নিরাপদ নম্বরে, নিরাপদ সময়ে ফোন করবেন।',
  code: 'স্ট্যাটাস জানার গোপন কোড',
  codeNote: 'কোডটি একবারই দেখানো হচ্ছে। লিখে রাখুন, কাউকে দেবেন না।',
  newCall: 'নতুন কল',
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], '*': [941, 1209], 0: [941, 1336], '#': [941, 1477] }
const NO_INPUT_MS = 12000 // a choice or number question waits this long before the "no answer" clip
const MIN_SPOKEN_MS = 700 // a # sooner than this after the beep counts as no answer
const MAX_MISSES = 2 // after this many "no answer" clips in a row, wait quietly for a key
const bnDigits = (text) => text.replace(/[0-9]/g, (digit) => '০১২৩৪৫৬৭৮৯'[digit])
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

const twoDigits = new Intl.NumberFormat('bn-BD', { minimumIntegerDigits: 2 })

// Kept in its own component so the ticking clock re-renders only itself.
function CallTimer() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="call-timer" role="timer">{twoDigits.format(Math.floor(seconds / 60))}:{twoDigits.format(seconds % 60)}</span>
}

function Keypad({ hints, onPress }) {
  return (
    <div className="keypad" role="group" aria-label="কিপ্যাড">
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
      <button type="submit" className="secondary-button">উত্তর দিন</button>
    </form>
  )
}

function Readback({ call, recordings, onCorrect }) {
  return (
    <>
      {call.mode === 'INTAKE' && call.answers.callerRole === 'REPRESENTATIVE' && <p className="call-note">{copy.representative}</p>}
      <dl className="details readback">
        {activeFields(call).map((field) => <div key={field}>
          <dt>{steps[field].label}</dt>
          <dd>
            {displayValue(call, field)}
            {recordings[field] && <audio controls preload="none" src={recordings[field]} aria-label={`আপনার কণ্ঠ: ${steps[field].label}`} />}
            <button type="button" className="text-button" onClick={() => onCorrect(field)}>সংশোধন করুন <span className="visually-hidden">{steps[field].label}</span></button>
          </dd>
        </div>)}
      </dl>
    </>
  )
}

export default function VoiceAccess() {
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
  const field = call ? nextField(call) : undefined
  const kind = kindOf(field)
  const done = ['DONE', 'UPLOADING_RECORDING', 'RECORDING_FAILED'].includes(submission.status)
  const turn = call ? `${call.mode}:${field ?? 'READBACK'}:${done}:${attempt}` : 'IDLE'
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
    const clips = [...leadRef.current, ...intros, ...(done ? submission.status === 'DONE' ? ['submitted'] : [] : [field ?? 'readback'])]
    leadRef.current = []
    const finished = lightMode() || await playerRef.current.play(clips)
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

  // After the clip: choices and numbers wait for keys; a spoken answer records after a beep until #.
  function listen() {
    if (kind !== 'SPOKEN') {
      setMode('WAITING')
      if (kind !== 'READBACK') armNoInput()
      return
    }
    if (voiceOff || !streamRef.current) return setMode('TYPING')
    try {
      answerRef.current = { recorder: startRecording(streamRef.current), startedAt: Date.now() }
    } catch {
      return setMode('TYPING')
    }
    playTone(toneRef.current, [1000], 200)
    setMode('RECORDING')
    timerRef.current = setTimeout(finishSpoken, steps[field].long ? 180000 : 20000)
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

  function choose(value) {
    cancelAnswer()
    setCall(answer(call, field, value))
  }

  function pressKey(key) {
    if (!call || done || mode === 'PROCESSING' || submission.status === 'PROCESSING') return
    playTone(toneRef.current, DTMF[key])
    missesRef.current.count = 0
    if (key === '*') return repeat()
    if (mode === 'PROMPT') {
      playerRef.current.stop() // a key cuts the clip short, like type-ahead on a phone line
      listen()
      if (kind === 'SPOKEN') return // for a spoken answer the key only skips to the beep
    }
    if (kind === 'READBACK') return key === '1' && submit()
    if (kind === 'CHOICE') {
      const option = steps[field].choices[Number(key) - 1]
      return option ? choose(option[0]) : repeat('wrongKey')
    }
    if (kind === 'DIGITS') {
      if (key === '#') return /^[0-9]{6,20}$/.test(digits) ? choose(digits) : repeat('noInput')
      editDigits((value) => (value + key).slice(0, 20))
      return armNoInput()
    }
    if (key === '#' && answerRef.current) finishSpoken()
  }

  // # ends a spoken answer: transcribe it, keep what validates, and move on; otherwise ask again.
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
    try {
      const result = await api(`/api/voice/answers?fields=${activeFields(call).join(',')}`, { method: 'POST', audio: clip })
      if (run !== runRef.current) return
      if (result.text) transcriptRef.current = appendTranscript(transcriptRef.current, 'CALLER', result.text)
      const { call: next, accepted } = applyExtraction(call, result.values)
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
      setMode('TYPING')
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

  async function submit() {
    setSubmission({ status: 'PROCESSING' })
    let result
    try {
      result = await api('/api/voice/intakes', { method: 'POST', body: payload(call, { transcript: transcriptRef.current }) })
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
  if (kind === 'CHOICE') steps[field].choices.forEach(([, label], index) => { hints[index + 1] = label })
  if (kind === 'DIGITS' || mode === 'RECORDING') hints['#'] = copy.finishKey
  if (kind === 'READBACK') hints[1] = copy.submitKey
  return (
    <section className="call-page" aria-labelledby="voice-title" lang="bn">
      <header className="call-head">
        <h1 id="voice-title">লিগ্যাল এইড হেল্পলাইন <span translate="no">১৬৬৯৯</span></h1>
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
            {mode === 'RECORDING' && <p>{copy.listening}</p>}
            {mode === 'PROCESSING' && <p>{copy.transcribing}</p>}
            {submission.status === 'PROCESSING' && <p>{copy.submitting}</p>}
            {notice && <p>{notice}</p>}
            {call.mode === 'CALLBACK' && field && <p className="call-note">{copy.urgent}</p>}
          </div>

          {done
            ? <div className="call-turn">
              <h2 id="voice-prompt" ref={promptRef} tabIndex={-1}>আবেদন জমা হয়েছে: <span lang="en" translate="no">{submission.applicationId}</span></h2>
              <p>{call.mode === 'CALLBACK' ? copy.callback : copy.review}</p>
              <p className="call-code">{copy.code}: <strong lang="en" translate="no">{submission.lookupCode}</strong></p>
              <p className="muted">{copy.codeNote}</p>
              {submission.status === 'UPLOADING_RECORDING' && <p role="status">{copy.uploading}</p>}
              {submission.status === 'RECORDING_FAILED' && <p role="alert" className="error">{!pendingRecordingRef.current ? copy.recordingMissing : submission.retryable ? copy.recordingFailed : copy.recordingUnavailable}</p>}
              {submission.status === 'RECORDING_FAILED' && submission.retryable && <button type="button" className="secondary-button" onClick={() => uploadRecording(submission)}>{copy.retryRecording}</button>}
              {submission.status === 'DONE' && <button type="button" className="secondary-button" onClick={() => setCall(null)}>{copy.newCall}</button>}
            </div>
            : <div className="call-turn">
              <h2 id="voice-prompt" ref={promptRef} tabIndex={-1}>{field ? steps[field].prompt : copy.readback}</h2>
              {kind === 'DIGITS' && <div className="call-digits">
                <output aria-label={steps[field].label}>{bnDigits(digits)}</output>
                {digits && <button type="button" className="text-button" onClick={() => editDigits((value) => value.slice(0, -1))}>মুছুন</button>}
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
