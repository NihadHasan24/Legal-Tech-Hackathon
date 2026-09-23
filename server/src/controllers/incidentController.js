import {
  createRelatedIncidentGroup, getApplicationIncidentGroups, getDuplicateCandidates, getRelatedIncidentGroup,
  linkRelatedIncidentEvidence, reviewDuplicateCandidate,
} from '../services/incidentService.js'

export async function applicationGroups(request, response) {
  response.json(await getApplicationIncidentGroups(request.params.applicationId, request.auth))
}

export async function createGroup(request, response) {
  response.status(201).json(await createRelatedIncidentGroup(request.body, request.auth))
}

export async function readGroup(request, response) {
  response.json(await getRelatedIncidentGroup(request.params.groupId, request.auth))
}

export async function linkEvidence(request, response) {
  response.status(201).json(await linkRelatedIncidentEvidence(request.params.groupId, request.body, request.auth))
}

export async function duplicateCandidates(request, response) {
  response.json(await getDuplicateCandidates(request.params.applicationId, request.auth))
}

export async function reviewDuplicate(request, response) {
  response.json(await reviewDuplicateCandidate(request.params.applicationId, request.params.otherApplicationId, request.body, request.auth))
}
