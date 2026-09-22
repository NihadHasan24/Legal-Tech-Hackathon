import { createLiveVoiceToken } from '../services/ai/liveVoice.js'

// Live smoke check: real ephemeral token (server-locked prompt and tools) -> Live API -> one Bangla turn.
// Passes only if the model answers with a tool call, audio, or transcription. Costs a few seconds of API use.
const url = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'

try {
  const { token, model } = await createLiveVoiceToken()
  const result = await new Promise((resolve) => {
    const seen = { setup: false, audio: false, transcript: '', tools: [] }
    const socket = new WebSocket(`${url}?access_token=${encodeURIComponent(token)}`)
    const finish = (outcome) => { clearTimeout(timer); socket.close(); resolve({ ...outcome, seen }) }
    const timer = setTimeout(() => finish({ ok: false, reason: 'No complete model turn within 30 seconds.' }), 30000)
    socket.onopen = () => socket.send(JSON.stringify({ setup: { model: `models/${model}` } }))
    socket.onmessage = async (event) => {
      const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text())
      if (message.setupComplete) {
        seen.setup = true
        socket.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: 'আমি আমার বোনের পক্ষে ফোন করছি। কেউ বিপদে নেই।' }] }], turnComplete: true } }))
      }
      for (const part of message.serverContent?.modelTurn?.parts ?? []) if (part.inlineData) seen.audio = true
      seen.transcript += message.serverContent?.outputTranscription?.text ?? ''
      for (const call of message.toolCall?.functionCalls ?? []) {
        seen.tools.push(`${call.name}(${JSON.stringify(call.args ?? {})})`)
        socket.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response: { ok: true } }] } }))
      }
      if (message.serverContent?.turnComplete) finish({ ok: seen.audio || seen.tools.length > 0 || Boolean(seen.transcript) })
    }
    socket.onclose = (event) => finish({ ok: false, reason: `Connection closed (${event.code}) ${event.reason}`.trim() })
  })
  console.log(`Model: ${model}`)
  console.log(`Setup complete: ${result.seen.setup} · audio: ${result.seen.audio} · tool calls: ${result.seen.tools.join(', ') || 'none'}`)
  if (result.seen.transcript) console.log(`Assistant said: ${result.seen.transcript.slice(0, 200)}`)
  console.log(result.ok ? 'LIVE VOICE CHECK: PASS' : `LIVE VOICE CHECK: FAIL — ${result.reason ?? 'no model output'}`)
  process.exitCode = result.ok ? 0 : 1
} catch (error) {
  console.log(`LIVE VOICE CHECK: FAIL — ${error.message}`)
  process.exitCode = 1
}
