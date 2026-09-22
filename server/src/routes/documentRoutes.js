import { Router } from 'express'
import { addVersion, readDocument, readVersions } from '../controllers/documentController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { documentIdParam, validateDocument } from '../validators/requests.js'

const router = Router()
router.get('/:documentId', requireAuth, documentIdParam, readDocument)
router.get('/:documentId/versions', requireAuth, documentIdParam, readVersions)
router.post('/:documentId/versions', requireAuth, documentIdParam, requireRole('DLAO_OFFICER'), validateDocument, addVersion)
export default router
