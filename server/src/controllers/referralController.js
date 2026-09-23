import { createReferral, decideRouting, getReferral, listReceivers, listReferrals, respondReferral } from '../services/referralService.js'

export async function receivers(_request, response) {
  response.json(await listReceivers())
}

export async function send(request, response) {
  response.status(201).json(await createReferral(request.params.applicationId, request.body, request.auth))
}

export async function readForApplication(request, response) {
  response.json(await listReferrals(request.params.applicationId, request.auth))
}

export async function read(request, response) {
  response.json(await getReferral(request.params.referralId, request.auth))
}

export async function respond(request, response) {
  response.json(await respondReferral(request.params.referralId, request.body, request.auth))
}

export async function routingDecision(request, response) {
  response.json(await decideRouting(request.params.applicationId, request.body, request.auth))
}
