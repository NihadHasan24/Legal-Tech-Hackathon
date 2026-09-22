import { Router } from 'express'
import { startLiveVoice, submitVoice } from '../controllers/applicationController.js'
import { HttpError } from '../utils/httpError.js'
import { validateEmptyBody, validateVoiceIntake } from '../validators/requests.js'

// ponytail: per-process memory window; move to a shared store if the API runs as several instances.
const recent = new Map()
function limitPublic(request, _response, next) {
  const now = Date.now()
  const hits = (recent.get(request.ip) || []).filter((time) => now - time < 10 * 60 * 1000)
  if (hits.length >= 20) throw new HttpError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.')
  recent.set(request.ip, [...hits, now])
  next()
}

const router = Router()
router.post('/live-session', limitPublic, validateEmptyBody, startLiveVoice)
router.post('/intakes', limitPublic, validateVoiceIntake, submitVoice)
export default router
