import { getCase } from '../services/applicationService.js'

export async function readCase(request, response) {
  response.json(await getCase(request.params.caseId, request.auth))
}
