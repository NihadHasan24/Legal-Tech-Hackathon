import express, { Router } from 'express'
import { storeRecording, submitVoice, transcribeVoiceAnswer } from '../controllers/applicationController.js'
import { limitPublic } from '../middleware/rateLimit.js'
import { applicationIdParam, validateAnswerAudio, validateCallRecording, validateVoiceIntake } from '../validators/requests.js'

const router = Router()
// One spoken answer at a time: the clip is transcribed, understood, and discarded.
router.post('/answers', limitPublic(120), express.raw({ type: ['audio/*', 'video/webm'], limit: '2mb' }), validateAnswerAudio, transcribeVoiceAnswer)
router.post('/intakes', limitPublic(20), validateVoiceIntake, submitVoice)
// The full call recording, uploaded once after submission and proven with that submission's one-time status code.
router.post('/intakes/:applicationId/recording', limitPublic(20), applicationIdParam, express.raw({ type: ['audio/*', 'video/webm'], limit: '8mb' }), validateCallRecording, storeRecording)
export default router
