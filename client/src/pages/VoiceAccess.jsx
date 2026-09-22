import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api.js'
import { appendTranscript, applyToolCall, guidance, openLiveSession } from '../utils/liveVoice.js'
import { activeFields, answer, consentScopes, correct, displayValue, nextField, payload, requestHuman, startCall, steps } from '../utils/voiceScript.js'

// Bangla is what callers and screen readers get; the English gloss is visual help for reviewers only.
const Gloss = ({ children }) => <span className="gloss" lang="en" aria-hidden="true">{children}</span>
const say = ([bangla, english]) => <>{bangla} <Gloss>{english}</Gloss></>

const copy = {
  disclosure: ['এটি প্রতিযোগিতার জন্য তৈরি একটি প্রোটোটাইপ ও সিমুলেশন — জাতীয় ১৬৬৯৯ টেলিফোন সেবার আসল সংযোগ নয়। শুধু কাল্পনিক তথ্য দিন। ভয়েসে কথা বলুন, অথবা এআই ছাড়াই কীবোর্ডে উত্তর দিন।', 'This is a competition prototype and simulation, not the live national 16699 telephone service. Use fictional information only. Talk by voice, or answer by keyboard without AI.'],
  live: {
    CONNECTING: ['মাইক্রোফোন ও লাইভ ভয়েস চালু হচ্ছে…', 'Starting the microphone and live voice…'],
    ON: ['লাইভ ভয়েস চালু। আপনি একটি এআই সহকারীর সাথে কথা বলছেন; সব তথ্য একজন কর্মকর্তা পর্যালোচনা করবেন। প্রশ্নের উত্তর মুখে বলুন।', 'Live voice is on. You are talking to an AI assistant; an officer reviews everything. Answer aloud.'],
    FAILED: ['লাইভ ভয়েস এখন পাওয়া যাচ্ছে না। আপনার উত্তরগুলো রাখা আছে — কীবোর্ডে চালিয়ে যান।', 'Live voice is unavailable right now. Your answers are kept; continue with the keyboard.'],
  },
  handoff: {
    URGENT_HANDOFF: ['আপনার নিরাপত্তাই আগে। আর কোনো বিস্তারিত প্রশ্ন নয় — শুধু নিরাপদে যোগাযোগের তথ্য নেব, একজন মানুষ যোগাযোগ করবেন। তাৎক্ষণিক বিপদে ৯৯৯-এ ফোন করুন।', 'Your safety comes first. No more detailed questions: only safe contact details, and a person will follow up. In immediate danger, call 999.'],
    LIVE_VOICE_REFUSED: ['ঠিক আছে। লাইভ ভয়েস ছাড়াই, শুধু কলব্যাকের জন্য সামান্য তথ্য নেব।', 'Understood. Without live voice, we will take only minimal details for a callback.'],
    CALLER_REQUESTED_HUMAN: ['ঠিক আছে। একজন মানুষ আপনাকে ফোন করবেন; শুধু কলব্যাকের জন্য সামান্য তথ্য নেব।', 'Understood. A person will call you back; we will take only minimal details.'],
    SENSITIVE_OR_UNCLEAR: ['বিষয়টি একজন মানুষের দেখা দরকার। শুধু কলব্যাকের জন্য সামান্য তথ্য নেব।', 'This needs a person. We will take only minimal details for a callback.'],
  },
  consentDraft: ['খসড়া ভাষা — আইনি দলের অনুমোদন বাকি।', 'Placeholder wording pending law-team approval.'],
  representative: ['আপনি প্রতিনিধি হিসেবে এই তথ্য দিয়েছেন। আবেদনকারী নিজে নিশ্চিত না করা পর্যন্ত এটি “প্রতিনিধির দেওয়া তথ্য” হিসেবে থাকবে, আর আপনার প্রতিনিধিত্বের অনুমতি এখনও যাচাই হয়নি।', 'You gave this as a representative. It stays marked representative-reported until the applicant confirms it personally, and your authority to act for them is not yet verified.'],
  identity: ['পরিচয় যাচাই এখনও অসম্পূর্ণ; একজন কর্মকর্তা পরে দেখবেন।', 'Identity is not yet verified; an officer will check it later.'],
  failed: ['জমা দেওয়া যায়নি। কিছুই জমা হয়নি; আপনার উত্তরগুলো রাখা আছে। আবার চেষ্টা করুন।', 'Could not submit. Nothing was saved; your answers are kept. Please try again.'],
  review: ['একজন লিগ্যাল এইড কর্মকর্তা এটি পর্যালোচনা করবেন। কোনো সিদ্ধান্ত স্বয়ংক্রিয়ভাবে নেওয়া হয়নি।', 'A legal aid officer will review it. No decision was made automatically.'],
  callback: ['একজন কর্মী আপনার দেওয়া নিরাপদ নম্বরে, নিরাপদ সময়ে ফোন করবেন।', 'A staff member will call the safe number you gave, at the safe time.'],
  audioDenied: ['আপনি অডিও সংরক্ষণে রাজি হননি, তাই কোনো রেকর্ডিং রাখা হয়নি। সেবা চালু আছে।', 'You declined audio storage, so no recording was kept. Your service continues.'],
}

function phaseOf(call, field, live, speaking, status) {
  if (!call) return 'IDLE'
  if (status !== 'IDLE') return { PROCESSING: 'PROCESSING', FAILED: 'FAILED_SAFE', DONE: 'COMPLETED' }[status]
  if (live === 'CONNECTING') return 'REQUESTING_MIC'
  if (!field) return 'AWAITING_CONFIRMATION'
  if (consentScopes.includes(field)) return 'EXPLAINING_CONSENT'
  if (call.mode === 'CALLBACK') return call.reason === 'URGENT_HANDOFF' ? 'HUMAN_HANDOFF' : 'MINIMAL_DATA_FALLBACK'
  return live === 'ON' && speaking ? 'AI_SPEAKING' : 'LISTENING'
}

function ChoiceTurn({ field, onAnswer, promptRef }) {
  const step = steps[field]
  return (
    <div role="group" aria-labelledby="voice-prompt" className="form-stack">
      <h2 id="voice-prompt" ref={promptRef} tabIndex={-1}>{step.prompt} <Gloss>{step.en}</Gloss></h2>
      {consentScopes.includes(field) && <p className="muted">{say(copy.consentDraft)}</p>}
      <div className="choice-row">
        {step.choices.map(([value, label, english]) => <button key={label} type="button" className="secondary-button" onClick={() => onAnswer(value)}>{label} <Gloss>{english}</Gloss></button>)}
      </div>
    </div>
  )
}

function TextTurn({ field, initial, onAnswer, promptRef }) {
  const step = steps[field]
  const [draft, setDraft] = useState(initial ?? '')
  const Field = step.long ? 'textarea' : 'input'
  const typeProps = step.tel ? { type: 'tel', inputMode: 'tel', pattern: '\\+?[0-9][0-9 \\-]{5,19}' } : {}
  return (
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); onAnswer(draft.trim()) }}>
      <h2 id="voice-prompt" ref={promptRef} tabIndex={-1}>{step.prompt} <Gloss>{step.en}</Gloss></h2>
      <Field id="voice-answer" name={field} aria-labelledby="voice-prompt" value={draft} onChange={(event) => setDraft(event.target.value)}
        required minLength={step.min ?? 2} maxLength={step.max ?? 20} autoComplete="off" {...typeProps} />
      <button type="submit">উত্তর দিন <Gloss>Answer</Gloss></button>
    </form>
  )
}

function LiveTurn({ field, captions, promptRef, onKeyboard }) {
  return (
    <div className="form-stack">
      <h2 id="voice-prompt" ref={promptRef} tabIndex={-1}>{steps[field].prompt} <Gloss>{steps[field].en}</Gloss></h2>
      <ol className="captions" aria-label="লাইভ ক্যাপশন">
        {captions.map((line, index) => <li key={index}><strong>{line.speaker === 'CALLER' ? 'আপনি' : 'সহকারী'}:</strong> {line.text}</li>)}
      </ol>
      <button type="button" className="secondary-button" onClick={onKeyboard}>কীবোর্ডে চালিয়ে যান <Gloss>Continue with keyboard</Gloss></button>
    </div>
  )
}

function Readback({ call, busy, failed, onCorrect, onSubmit, promptRef }) {
  const fields = activeFields(call).filter((field) => !consentScopes.includes(field))
  return (
    <div className="form-stack">
      <h2 id="voice-prompt" ref={promptRef} tabIndex={-1}>যা বলেছেন, একবার শুনে নিন <Gloss>Check what you told us</Gloss></h2>
      {call.mode === 'INTAKE' && call.answers.callerRole === 'REPRESENTATIVE' && <p className="safety-note">{say(copy.representative)}</p>}
      {call.mode === 'INTAKE' && <p>{say(copy.identity)}</p>}
      <dl className="details readback">
        {fields.map((field) => <div key={field}>
          <dt>{steps[field].label}</dt>
          <dd>{displayValue(call, field)} <button type="button" className="text-button" onClick={() => onCorrect(field)}>সংশোধন করুন <span className="visually-hidden">{steps[field].label}</span></button></dd>
        </div>)}
      </dl>
      {failed && <p role="alert" className="error">{say(copy.failed)}</p>}
      <button type="button" onClick={onSubmit} disabled={busy}>{busy ? 'জমা হচ্ছে…' : 'ঠিক আছে, জমা দিন'} <Gloss>Confirm and submit</Gloss></button>
    </div>
  )
}

export default function VoiceAccess() {
  const [call, setCallState] = useState(null)
  const [live, setLive] = useState('OFF') // OFF | CONNECTING | ON | FAILED
  const [speaking, setSpeaking] = useState(false)
  const [captions, setCaptions] = useState([])
  const [submission, setSubmission] = useState({ status: 'IDLE' })
  const promptRef = useRef(null)
  const callRef = useRef(null)
  const sessionRef = useRef(null)
  const transcriptRef = useRef([])
  const finishingRef = useRef(false)
  const field = call ? nextField(call) : undefined
  const phase = phaseOf(call, field, live, speaking, submission.status)
  const voiceActive = live === 'ON' || live === 'CONNECTING'
  const turn = call ? `${call.mode}:${field ?? 'READBACK'}:${submission.status === 'DONE'}:${voiceActive}` : 'IDLE'

  // Keyboard route: each new question takes focus so a screen reader speaks it. Live voice takes focus once while
  // connecting, then the assistant speaks; when voice ends or fails, focus returns to the pending question.
  useEffect(() => { if (turn !== 'IDLE' && live !== 'ON') promptRef.current?.focus() }, [turn, live])
  useEffect(() => () => sessionRef.current?.close(), [])

  // Live callbacks read the latest draft, so every change goes through the ref as well as state.
  function setCall(next) {
    callRef.current = next
    setCallState(next)
  }

  function endLive(status = 'OFF') {
    sessionRef.current?.close()
    sessionRef.current = null
    setSpeaking(false)
    setLive(status)
  }

  async function submit(confirmation) {
    setSubmission({ status: 'PROCESSING' })
    try {
      const result = await api('/api/voice/intakes', { method: 'POST', body: payload(callRef.current, { confirmation, transcript: transcriptRef.current }) })
      setSubmission({ status: 'DONE', applicationId: result.applicationId })
      return { ok: true, applicationId: result.applicationId }
    } catch {
      setSubmission({ status: 'FAILED' })
      return { ok: false, error: 'Submission failed and nothing was saved. Offer to try again or to continue by keyboard.' }
    }
  }

  // Any failure (no key, token refused, microphone denied, socket drop, timeout) keeps the draft and falls back.
  async function startLive() {
    setLive('CONNECTING')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const { token, model } = await api('/api/voice/live-session', { method: 'POST', signal: AbortSignal.timeout(10000) })
      sessionRef.current = await openLiveSession({
        token, model, stream,
        on: {
          ready: () => {
            setLive('ON')
            sessionRef.current?.say(`[Session start] Greet the caller in one short Bangla sentence, then ask the next approved question. ${JSON.stringify(guidance(callRef.current))}`)
          },
          toolCall: async (functionCall) => {
            const result = applyToolCall(callRef.current, functionCall)
            setCall(result.call)
            const response = result.submit ? await submit('VOICE') : result.response
            if (result.submit && response.ok) finishingRef.current = true
            sessionRef.current?.respond(functionCall.id, functionCall.name, response)
          },
          transcript: (speaker, text) => {
            transcriptRef.current = appendTranscript(transcriptRef.current, speaker, text)
            setCaptions(transcriptRef.current.slice(-4))
          },
          speaking: setSpeaking,
          turnComplete: () => { if (finishingRef.current) endLive() },
          ended: () => {
            sessionRef.current = null
            setSpeaking(false)
            setLive(finishingRef.current ? 'OFF' : 'FAILED')
          },
        },
      })
    } catch {
      stream?.getTracks().forEach((track) => track.stop())
      endLive('FAILED')
    }
  }

  function record(value) {
    const next = answer(call, field, value)
    setCall(next)
    const consentsDone = next.answers.LIVE_VOICE === 'GRANTED' && !consentScopes.includes(nextField(next))
    if (next.wantsLive && live === 'OFF' && next.mode === 'INTAKE' && consentsDone) startLive()
  }

  function newCall() {
    endLive()
    setCall(null)
    setSubmission({ status: 'IDLE' })
    setCaptions([])
    transcriptRef.current = []
    finishingRef.current = false
  }

  const representative = call?.mode === 'INTAKE' && call.answers.callerRole === 'REPRESENTATIVE'
  const liveNotice = copy.live[live]
  return (
    <section className="voice-page" aria-labelledby="voice-title" lang="bn">
      <p className="eyebrow" lang="en">Citizen access · simulation</p>
      <h1 id="voice-title" lang="en">Call 16699 – Voice Access Prototype</h1>
      <div className="notice-card">
        <p><strong>{copy.disclosure[0]}</strong></p>
        <p lang="en">{copy.disclosure[1]}</p>
      </div>
      <p className="voice-state" lang="en">Prototype state: {phase}</p>

      {!call && <div className="form-stack">
        <button type="button" onClick={() => setCall({ ...startCall(), wantsLive: true })}>ভয়েসে কথা বলুন <Gloss>Talk by voice (live AI)</Gloss></button>
        <button type="button" className="secondary-button" onClick={() => setCall(startCall())}>কীবোর্ডে উত্তর দিন <Gloss>Answer by keyboard (no AI)</Gloss></button>
      </div>}

      {call && submission.status === 'DONE' && <div className="card voice-turn form-stack">
        <h2 id="voice-prompt" ref={promptRef} tabIndex={-1}>আবেদন জমা হয়েছে: <span lang="en" translate="no">{submission.applicationId}</span> <Gloss>Application submitted</Gloss></h2>
        <p>{say(copy.review)}</p>
        {call.mode === 'CALLBACK' && <p>{say(copy.callback)}</p>}
        {representative && <p className="safety-note">{say(copy.representative)}</p>}
        {call.answers.AUDIO_STORAGE === 'DENIED' && <p>{say(copy.audioDenied)}</p>}
        <button type="button" className="secondary-button" onClick={newCall}>নতুন কল <Gloss>New call</Gloss></button>
      </div>}

      {call && submission.status !== 'DONE' && <div className="card voice-turn">
        <div role="status">
          {liveNotice && <p className="safety-note">{say(liveNotice)}</p>}
          {call.mode === 'CALLBACK' && field && <p className="safety-note">{say(copy.handoff[call.reason])}</p>}
        </div>
        {!field
          ? <Readback call={call} busy={submission.status === 'PROCESSING'} failed={submission.status === 'FAILED'} promptRef={promptRef}
            onSubmit={async () => { if ((await submit('BUTTON')).ok) endLive() }}
            onCorrect={(item) => { endLive(); setSubmission({ status: 'IDLE' }); setCall(correct(call, item)) }} />
          : voiceActive
            ? <LiveTurn field={field} captions={captions} promptRef={promptRef} onKeyboard={() => endLive()} />
            : steps[field].choices
              ? <ChoiceTurn key={field} field={field} promptRef={promptRef} onAnswer={record} />
              : <TextTurn key={field} field={field} initial={call.previous[field]} promptRef={promptRef} onAnswer={record} />}
        {live === 'FAILED' && field && call.mode === 'INTAKE' && <button type="button" className="text-button" onClick={startLive}>আবার ভয়েস চেষ্টা করুন <Gloss>Try voice again</Gloss></button>}
        {call.mode === 'INTAKE' && field && <button type="button" className="text-button human-button" onClick={() => { endLive(); setCall(requestHuman(call)) }}>মানুষের সাথে কথা বলতে চাই <Gloss>I want to talk to a person</Gloss></button>}
      </div>}
    </section>
  )
}
