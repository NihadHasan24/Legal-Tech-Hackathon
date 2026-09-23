import { Router } from 'express'
import { changeUserPassword, currentUser, demoAccount, signIn, signOut, signUp } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateLogin } from '../validators/requests.js'

const router = Router()
router.post('/login', validateLogin, signIn)
router.post('/register', signUp)
router.get('/demo-credentials/:role', demoAccount)
router.get('/me', requireAuth, currentUser)
router.post('/logout', requireAuth, signOut)
router.put('/change-password', requireAuth, changeUserPassword)
export default router

