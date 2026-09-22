import express from 'express'
import healthRoutes from './routes/healthRoutes.js'
import authRoutes from './routes/authRoutes.js'
import applicationRoutes from './routes/applicationRoutes.js'
import caseRoutes from './routes/caseRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import workspaceRoutes from './routes/workspaceRoutes.js'
import voiceRoutes from './routes/voiceRoutes.js'
import { errorHandler, notFound } from './middleware/errors.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '32kb' }))
app.use('/health', healthRoutes)
app.use('/api', (_request, response, next) => { response.set('Cache-Control', 'no-store'); next() })
app.use('/api/auth', authRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/cases', caseRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/workspace', workspaceRoutes)
app.use('/api/voice', voiceRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
