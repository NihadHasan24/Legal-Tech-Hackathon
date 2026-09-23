import { getTriageAssessments, proposeTriageAssessment, recordTriageDecision } from '../services/triageService.js'

export async function listTriage(request, response) {
  response.json(await getTriageAssessments(request.params.applicationId, request.auth))
}

export async function runTriage(request, response) {
  response.status(201).json(await proposeTriageAssessment(request.params.applicationId, request.auth))
}

export async function decideTriage(request, response) {
  response.json(await recordTriageDecision(request.params.applicationId, request.params.assessmentId, request.body, request.auth))
}
