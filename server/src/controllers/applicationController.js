import { createLiveVoiceToken } from '../services/ai/liveVoice.js'
import { acceptApplication, addFact, addRepresentation, completeTask, correctFact, createTask, getApplication, getApplicationAudit, getFacts, getSafeContact, getTranscript, listContactAttempts, listTasks, listWorkspace, recordConsent, recordContactAttempt, reviewApplication, searchRecord, setSafeContact, submitApplication, submitVoiceIntake } from '../services/applicationService.js'

export async function submit(request, response) {
  response.status(201).json(await submitApplication(request.body, request.auth))
}

export async function submitVoice(request, response) {
  response.status(201).json(await submitVoiceIntake(request.body))
}

export async function startLiveVoice(_request, response) {
  response.status(201).json(await createLiveVoiceToken())
}

export async function readTranscript(request, response) {
  response.json(await getTranscript(request.params.applicationId, request.auth))
}

export async function read(request, response) {
  response.json(await getApplication(request.params.applicationId, request.auth))
}

export async function search(request, response) {
  response.json(await searchRecord(request.query.identifier, request.auth))
}

export async function workspace(request, response) {
  response.json(await listWorkspace(request.query.role, request.auth))
}

export async function review(request, response) {
  response.json(await reviewApplication(request.params.applicationId, request.body, request.auth))
}

export async function overrideReview(request, response) {
  response.json(await reviewApplication(request.params.applicationId, request.body, request.auth, true))
}

export async function accept(request, response) {
  response.json(await acceptApplication(request.params.applicationId, request.body.reason, request.auth))
}

export async function addRepresentative(request, response) {
  response.status(201).json(await addRepresentation(request.params.applicationId, request.body, request.auth))
}

export async function recordFact(request, response) {
  const fact = await addFact(request.params.applicationId, request.body, request.auth)
  response.status(201).json(fact)
}

export async function recordCorrection(request, response) {
  const fact = await correctFact(request.params.applicationId, request.params.factId, request.body, request.auth)
  response.status(201).json(fact)
}

export async function readFacts(request, response) {
  response.json(await getFacts(request.params.applicationId, request.auth))
}

export async function updateSafeContact(request, response) {
  response.status(201).json(await setSafeContact(request.params.applicationId, request.body, request.auth))
}

export async function readSafeContact(request, response) {
  response.json(await getSafeContact(request.params.applicationId, request.auth))
}

export async function addConsent(request, response) {
  response.status(201).json(await recordConsent(request.params.applicationId, request.body, request.auth))
}

export async function readTasks(request, response) {
  response.json(await listTasks(request.params.applicationId, request.auth))
}

export async function addTask(request, response) {
  response.status(201).json(await createTask(request.params.applicationId, request.body, request.auth))
}

export async function finishTask(request, response) {
  response.json(await completeTask(request.params.applicationId, request.params.taskId, request.auth))
}

export async function readContactAttempts(request, response) {
  response.json(await listContactAttempts(request.params.applicationId, request.auth))
}

export async function addContactAttempt(request, response) {
  response.status(201).json(await recordContactAttempt(request.params.applicationId, request.body, request.auth))
}

export async function readAudit(request, response) {
  response.json(await getApplicationAudit(request.params.applicationId, request.auth))
}
