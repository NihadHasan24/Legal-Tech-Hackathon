import { Router } from 'express'
import { listTriage, runTriage, decideTriage } from '../controllers/triageController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { applicationIdParam, validateEmptyBody } from '../validators/requests.js'
import { triageAssessmentIdParam, validateTriageDecision } from '../validators/triage.js'

const router = Router()
router.use(requireAuth)
router.get('/applications/:applicationId/triage', applicationIdParam, requireRole('DLAO_OFFICER'), listTriage)
router.post('/applications/:applicationId/triage', applicationIdParam, requireRole('DLAO_OFFICER'), validateEmptyBody, runTriage)
router.post('/applications/:applicationId/triage/:assessmentId/decision', applicationIdParam, triageAssessmentIdParam, requireRole('DLAO_OFFICER'), validateTriageDecision, decideTriage)
export default router
