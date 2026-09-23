import { createAssisted, getAssisted, resolveAssisted, reviseAssisted } from '../services/assistedService.js'

export async function create(request, response) {
  response.status(201).json(await createAssisted(request.body, request.auth))
}

export async function read(request, response) {
  response.json(await getAssisted(request.params.applicationId, request.auth))
}

export async function revise(request, response) {
  const result = await reviseAssisted(request.params.applicationId, request.body, request.auth)
  response.status(result.kind === 'CONFLICT' ? 409 : 200).json(result)
}

export async function resolve(request, response) {
  response.json(await resolveAssisted(request.params.applicationId, request.body, request.auth))
}
