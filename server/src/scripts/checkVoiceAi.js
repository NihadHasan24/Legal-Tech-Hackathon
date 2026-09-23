import { readFileSync } from 'node:fs'
import { extractAnswers, extractionModel, speechModel, transcribeAnswer, voiceAiEnabled } from '../services/ai/groq.js'

// Smoke check for the voice AI path. Pass an audio file to test Bangla transcription too:
//   npm run check:voice --workspace server -- recordings/sample.webm
const sample = 'আমি রিপন, আমার বোন ময়ূরীর পক্ষে ফোন করছি। জয়পুরহাটে থাকে। ওর স্বামী ওকে মারধর করে আর তার এনআইডি আটকে রেখেছে।'
const fields = ['callerRole', 'callerName', 'relationship', 'applicantName', 'identityDocument', 'problem', 'district']

if (!voiceAiEnabled()) {
  console.log('VOICE AI CHECK: FAIL — GROQ_API_KEY is missing or VOICE_AI=off.')
  process.exitCode = 1
} else {
  console.log(`Speech model: ${speechModel()} · extraction model: ${extractionModel()}`)
  let text = sample
  const file = process.argv[2]
  try {
    if (file) {
      const started = Date.now()
      text = await transcribeAnswer(readFileSync(file), file.endsWith('.wav') ? 'audio/wav' : 'audio/webm')
      console.log(`Transcribed ${file} in ${Date.now() - started} ms: ${text}`)
    } else {
      console.log('No audio file given; checking extraction on a written Bangla sample instead.')
    }
    const started = Date.now()
    const { values, sensitive } = await extractAnswers(text, fields)
    console.log(`Extracted in ${Date.now() - started} ms:`, JSON.stringify(values))
    console.log(`Flagged sensitive: ${sensitive}`)
    const ok = Boolean(text) && Object.keys(values).length >= 3
    console.log(ok ? 'VOICE AI CHECK: PASS' : 'VOICE AI CHECK: FAIL — too little was understood.')
    process.exitCode = ok ? 0 : 1
  } catch (error) {
    console.log(`VOICE AI CHECK: FAIL — ${error.message}`)
    process.exitCode = 1
  }
}
