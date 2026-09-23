import { Router } from 'express'
import { read, receivers, respond } from '../controllers/referralController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { referralIdParam, validateReferralResponse } from '../validators/requests.js'

const router = Router()
router.use(requireAuth)
router.get('/receivers', requireRole('DLAO_OFFICER'), receivers)
router.get('/:referralId', referralIdParam, requireRole('RECEIVING_DLAO'), read)
router.post('/:referralId/respond', referralIdParam, requireRole('RECEIVING_DLAO'), validateReferralResponse, respond)
export default router
