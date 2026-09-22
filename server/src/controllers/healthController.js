import { checkDatabase } from '../services/healthService.js'

export async function getHealth(_request, response) {
  const databaseReady = await checkDatabase()
  response.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ok' : 'unavailable', database: databaseReady ? 'connected' : 'disconnected' })
}
