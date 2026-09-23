import { Router } from 'express'
import { currentUser, demoAccount, signIn, signOut } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateLogin } from '../validators/requests.js'

const router = Router()
router.post('/login', validateLogin, signIn)
router.get('/demo-credentials/:role', demoAccount)
router.get('/me', requireAuth, currentUser)
router.post('/logout', requireAuth, signOut)
export default router
