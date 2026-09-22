import { Router } from 'express'
import { accept, addConsent, addContactAttempt, addRepresentative, addTask, finishTask, overrideReview, read, readAudit, readContactAttempts, readFacts, readSafeContact, readTasks, readTranscript, recordCorrection, recordFact, review, search, submit, updateSafeContact } from '../controllers/applicationController.js'
import { addDocument, readDocuments } from '../controllers/documentController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { applicationIdParam, factIdParam, taskIdParam, validateAcceptance, validateConsent, validateContactAttempt, validateCorrection, validateDocument, validateFact, validateRepresentation, validateReview, validateReviewOverride, validateSafeContact, validateSearch, validateSubmission, validateTask } from '../validators/requests.js'

const router = Router()
router.use(requireAuth)
router.post('/', requireRole('DLAO_OFFICER', 'CASE_SUPPORT', 'HELPLINE_AGENT', 'UDC_OPERATOR'), validateSubmission, submit)
router.get('/search', requireRole('DLAO_OFFICER', 'CASE_SUPPORT'), validateSearch, search)
router.get('/:applicationId', applicationIdParam, read)
router.post('/:applicationId/review', applicationIdParam, requireRole('DLAO_OFFICER'), validateReview, review)
router.post('/:applicationId/review-override', applicationIdParam, requireRole('DLAO_OFFICER'), validateReviewOverride, overrideReview)
router.post('/:applicationId/accept', applicationIdParam, requireRole('DLAO_OFFICER'), validateAcceptance, accept)
router.get('/:applicationId/tasks', applicationIdParam, requireRole('DLAO_OFFICER', 'CASE_SUPPORT'), readTasks)
router.post('/:applicationId/tasks', applicationIdParam, requireRole('DLAO_OFFICER', 'CASE_SUPPORT'), validateTask, addTask)
router.post('/:applicationId/tasks/:taskId/complete', applicationIdParam, taskIdParam, requireRole('DLAO_OFFICER', 'CASE_SUPPORT'), finishTask)
router.get('/:applicationId/contact-attempts', applicationIdParam, requireRole('DLAO_OFFICER', 'CASE_SUPPORT'), readContactAttempts)
router.post('/:applicationId/contact-attempts', applicationIdParam, requireRole('DLAO_OFFICER'), validateContactAttempt, addContactAttempt)
router.get('/:applicationId/documents', applicationIdParam, requireRole('DLAO_OFFICER', 'CASE_SUPPORT'), readDocuments)
router.post('/:applicationId/documents', applicationIdParam, requireRole('DLAO_OFFICER'), validateDocument, addDocument)
router.post('/:applicationId/representations', applicationIdParam, requireRole('DLAO_OFFICER'), validateRepresentation, addRepresentative)
router.get('/:applicationId/facts', applicationIdParam, requireRole('DLAO_OFFICER'), readFacts)
router.post('/:applicationId/facts', applicationIdParam, requireRole('DLAO_OFFICER'), validateFact, recordFact)
router.post('/:applicationId/facts/:factId/corrections', applicationIdParam, factIdParam, requireRole('DLAO_OFFICER'), validateCorrection, recordCorrection)
router.post('/:applicationId/safe-contact', applicationIdParam, requireRole('DLAO_OFFICER'), validateSafeContact, updateSafeContact)
router.get('/:applicationId/safe-contact', applicationIdParam, requireRole('DLAO_OFFICER'), readSafeContact)
router.post('/:applicationId/consents', applicationIdParam, requireRole('DLAO_OFFICER'), validateConsent, addConsent)
router.get('/:applicationId/audit', applicationIdParam, requireRole('DLAO_OFFICER'), readAudit)
router.get('/:applicationId/transcript', applicationIdParam, requireRole('DLAO_OFFICER'), readTranscript)
export default router
