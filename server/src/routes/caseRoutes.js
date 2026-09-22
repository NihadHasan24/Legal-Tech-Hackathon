import { Router } from 'express'
import { readCase } from '../controllers/caseController.js'
import { requireAuth } from '../middleware/auth.js'
import { caseIdParam } from '../validators/requests.js'

const router = Router()
router.get('/:caseId', requireAuth, caseIdParam, readCase)
export default router
