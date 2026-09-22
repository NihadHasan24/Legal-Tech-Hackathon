import { addDocumentVersion, createDocumentMetadata, getDocument, listDocuments, listDocumentVersions } from '../services/applicationService.js'

export async function readDocument(request, response) {
  response.json(await getDocument(request.params.documentId, request.auth))
}

export async function readDocuments(request, response) {
  response.json(await listDocuments(request.params.applicationId, request.auth))
}

export async function addDocument(request, response) {
  response.status(201).json(await createDocumentMetadata(request.params.applicationId, request.body, request.auth))
}

export async function readVersions(request, response) {
  response.json(await listDocumentVersions(request.params.documentId, request.auth))
}

export async function addVersion(request, response) {
  response.status(201).json(await addDocumentVersion(request.params.documentId, request.body, request.auth))
}
