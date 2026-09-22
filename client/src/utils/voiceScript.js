// Intake script: one approved question at a time. The keyboard route answers it directly; live voice
// (liveVoice.js) answers it through validated tool calls. Both build the same payload the server re-validates.
export const consentScopes = ['LIVE_VOICE', 'AUDIO_STORAGE', 'TRANSCRIPT_STORAGE']
const consentChoices = [['GRANTED', 'হ্যাঁ, রাজি', 'Yes, I agree'], ['DENIED', 'না', 'No']]
const yesNo = [[true, 'হ্যাঁ', 'Yes'], [false, 'না', 'No']]

export const steps = {
  LIVE_VOICE: { prompt: 'আপনার সাথে এখন কথা বলতে আমরা কি লাইভ ভয়েস প্রসেসিং ব্যবহার করতে পারি? না বললে শুধু কলব্যাকের জন্য সামান্য তথ্য নেওয়া হবে।', en: 'May we use live voice processing to talk with you now? If you say no, we will take only minimal details for a callback.', choices: consentChoices },
  AUDIO_STORAGE: { prompt: 'কথোপকথনের অডিও রেকর্ডিং কি সংরক্ষণ করতে পারি? না বললেও সেবা চলবে।', en: 'May we store an audio recording of this conversation? Saying no will not stop the service.', choices: consentChoices },
  TRANSCRIPT_STORAGE: { prompt: 'কথোপকথনের লিখিত রূপ (ট্রান্সক্রিপ্ট) কি রাখতে পারি? না বললেও সেবা চলবে।', en: 'May we keep a written transcript? Saying no will not stop the service.', choices: consentChoices },
  urgent: { label: 'তাৎক্ষণিক বিপদ', prompt: 'এই মুহূর্তে কেউ কি তাৎক্ষণিক বিপদে আছেন?', en: 'Is anyone in immediate danger right now?', choices: yesNo },
  callerRole: { label: 'কার জন্য ফোন', prompt: 'আপনি কি নিজের জন্য ফোন করছেন, নাকি অন্য কারও পক্ষে?', en: 'Are you calling for yourself or for someone else?', choices: [['SELF', 'নিজের জন্য', 'For myself'], ['REPRESENTATIVE', 'অন্য কারও পক্ষে', 'For someone else']] },
  callerName: { label: 'আপনার নাম', prompt: 'আপনার নাম কী?', en: 'What is your name?', max: 120 },
  relationship: { label: 'সম্পর্ক', prompt: 'যাঁর পক্ষে ফোন করছেন, তিনি আপনার কী হন?', en: 'How are you related to the person you are calling for?', max: 80 },
  applicantName: { label: 'আবেদনকারীর নাম', prompt: 'যিনি আইনি সহায়তা চান, তাঁর নাম কী?', en: 'What is the name of the person who needs legal aid?', max: 120 },
  identityDocument: { label: 'পরিচয়পত্র', prompt: 'আবেদনকারীর জাতীয় পরিচয়পত্র বা অন্য কোনো পরিচয়পত্র কি এখন হাতের কাছে আছে? নম্বর বলার দরকার নেই।', en: 'Does the applicant have their NID or another ID available now? Do not say the number.', choices: [['AVAILABLE', 'আছে', 'Available'], ['UNAVAILABLE', 'নেই', 'Not available'], ['UNKNOWN', 'জানি না', 'Do not know']] },
  problem: { label: 'সমস্যা', prompt: 'সমস্যাটি নিজের ভাষায় বলুন।', en: 'Describe the problem in your own words.', min: 5, max: 2000, long: true },
  district: { label: 'জেলা', prompt: 'আবেদনকারী কোন জেলায় থাকেন?', en: 'Which district does the applicant live in?', max: 60 },
  contactChannel: { label: 'নিরাপদ যোগাযোগ', prompt: 'আবেদনকারীর সাথে যোগাযোগের সবচেয়ে নিরাপদ উপায় কোনটি?', en: 'What is the safest way to contact the applicant?', choices: [['PHONE', 'নিরাপদ নম্বরে ফোন', 'Phone call to a safe number'], ['IN_PERSON', 'সরাসরি লিগ্যাল এইড অফিসে', 'In person at the legal aid office']] },
  contactValue: { label: 'নিরাপদ নম্বর', prompt: 'কোন ফোন নম্বরে ফোন করা নিরাপদ?', en: 'Which phone number is safe to call?', tel: true },
  contactOwner: { label: 'নম্বরটি কার', prompt: 'এই নম্বরটি কার?', en: 'Whose number is this?', choices: [['APPLICANT', 'আবেদনকারীর নিজের', 'The applicant’s own'], ['CALLER', 'আমার', 'Mine']] },
  safeTime: { label: 'নিরাপদ সময়', prompt: 'কোন সময়ে যোগাযোগ করা নিরাপদ?', en: 'When is it safe to make contact?', max: 100 },
  smsSafe: { label: 'এসএমএস নিরাপদ', prompt: 'এই নম্বরে এসএমএস পাঠানো কি নিরাপদ?', en: 'Is it safe to send an SMS to this number?', choices: yesNo },
}

const representative = (answers) => answers.callerRole === 'REPRESENTATIVE'
const phone = (answers) => answers.contactChannel === 'PHONE'
const flows = {
  INTAKE: [['LIVE_VOICE'], ['AUDIO_STORAGE'], ['TRANSCRIPT_STORAGE'], ['urgent'], ['callerRole'], ['callerName', representative], ['relationship', representative],
    ['applicantName'], ['identityDocument'], ['problem'], ['district'], ['contactChannel'], ['contactValue', phone],
    ['contactOwner', (answers) => phone(answers) && representative(answers)], ['safeTime'], ['smsSafe', phone]],
  // Minimal-data human callback: only what a person needs to follow up safely.
  CALLBACK: [['contactValue'], ['safeTime'], ['district'], ['urgent']],
}

export const startCall = () => ({ mode: 'INTAKE', reason: null, answers: {}, previous: {}, corrected: [], aiFields: [] })
export const activeFields = (call) => flows[call.mode].filter(([, applies]) => !applies || applies(call.answers)).map(([field]) => field)
export const nextField = (call) => activeFields(call).find((field) => call.answers[field] === undefined)
export const requestHuman = (call, reason = 'CALLER_REQUESTED_HUMAN') => ({ ...call, mode: 'CALLBACK', reason })
export const displayValue = (call, field) => steps[field].choices?.find(([value]) => value === call.answers[field])?.[1] ?? call.answers[field]

// `via` keeps provenance honest: answers the live model extracted are listed in aiFields for the server to flag.
export function answer(call, field, value, via = 'CALLER') {
  const changed = call.answers[field] !== undefined && call.answers[field] !== value
  const next = {
    ...call,
    answers: { ...call.answers, [field]: value },
    corrected: changed ? [...new Set([...call.corrected, field])] : call.corrected,
    aiFields: via === 'AI' ? [...new Set([...call.aiFields, field])] : call.aiFields.filter((item) => item !== field),
  }
  if (field === 'LIVE_VOICE' && value === 'DENIED') return { ...next, mode: 'CALLBACK', reason: 'LIVE_VOICE_REFUSED' }
  if (field === 'urgent' && value === true && call.mode === 'INTAKE') return { ...next, mode: 'CALLBACK', reason: 'URGENT_HANDOFF' }
  return next
}

export function correct(call, field) {
  const { [field]: previous, ...answers } = call.answers
  return { ...call, answers, previous: { ...call.previous, [field]: previous }, corrected: [...new Set([...call.corrected, field])] }
}

export function payload(call, { confirmation = 'BUTTON', transcript = [] } = {}) {
  const fields = activeFields(call).filter((field) => !consentScopes.includes(field))
  return {
    mode: call.mode,
    confirmation,
    ...(call.mode === 'CALLBACK' ? { callbackReason: call.reason } : {}),
    consents: Object.fromEntries(consentScopes.filter((scope) => call.answers[scope]).map((scope) => [scope, call.answers[scope]])),
    answers: Object.fromEntries(fields.map((field) => [field, call.answers[field]])),
    correctedFields: call.corrected.filter((field) => fields.includes(field)),
    aiFields: call.aiFields.filter((field) => fields.includes(field)),
    // A transcript leaves the browser only with explicit transcript consent; audio never does.
    ...(call.answers.TRANSCRIPT_STORAGE === 'GRANTED' && transcript.length ? { transcript } : {}),
  }
}
