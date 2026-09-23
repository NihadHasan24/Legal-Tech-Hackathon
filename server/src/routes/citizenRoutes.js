import { Router } from 'express'
import { createApplication, getProfile, listCases, submitLawyerChange, updateProfile } from '../controllers/citizenController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)
router.use(requireRole('CITIZEN'))

router.get('/profile', getProfile)
router.put('/profile', updateProfile)
router.get('/cases', listCases)
router.post('/applications', createApplication)
router.post('/cases/:applicationId/lawyer-change', submitLawyerChange)

export default router

