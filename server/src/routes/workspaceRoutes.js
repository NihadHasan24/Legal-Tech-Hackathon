import { Router } from 'express'
import { workspace } from '../controllers/applicationController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateWorkspace } from '../validators/requests.js'

const router = Router()
router.get('/', requireAuth, validateWorkspace, workspace)
export default router
