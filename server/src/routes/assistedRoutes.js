import { Router } from 'express'
import { create, read, resolve, revise } from '../controllers/assistedController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { assistedParam, validateAssistedCreate, validateAssistedRevision, validateConflictResolution } from '../validators/assisted.js'

const router = Router()
router.use(requireAuth, requireRole('UDC_OPERATOR'))
router.post('/', validateAssistedCreate, create)
router.get('/:applicationId', assistedParam, read)
router.post('/:applicationId/revisions', assistedParam, validateAssistedRevision, revise)
router.post('/:applicationId/conflicts/resolve', assistedParam, validateConflictResolution, resolve)
export default router
