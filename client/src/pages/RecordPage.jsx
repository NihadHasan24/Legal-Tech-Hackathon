import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, apiUrl } from '../services/api.js'
import DocumentReview from './DocumentReview.jsx'
import ReferralPanel from './ReferralPanel.jsx'
import LawyerManagement from './LawyerManagement.jsx'
import DuplicateReview from './DuplicateReview.jsx'
import RelatedIncidentPanel from './RelatedIncidentPanel.jsx'
import TriagePanel from './TriagePanel.jsx'
import MediationPanel from './MediationPanel.jsx'

const showDate = (value) => value ? new Date(value).toLocaleString() : 'Not set'
const channels = { VOICE_SIM: '16699 voice simulation', HELPLINE_SIM: 'Helpline agent (simulated 16699)', UDC: 'UDC assisted', DLAO: 'DLAO office', WEB: 'Web' }

// Officer-only playback of the full 16699 call. Fetched with the session token, which a bare <audio src> cannot send.
function CallRecording({ applicationId, token }) {
  const [url, setUrl] = useState(null)
  const [state, setState] = useState('LOADING')
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl
    fetch(apiUrl(`/api/applications/${applicationId}/recording`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.blob() : Promise.reject(response.status)))
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); setState('READY') })
      .catch((failure) => { if (failure?.name !== 'AbortError') setState(failure === 404 ? 'NONE' : 'FAILED') })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [applicationId, token])
  return (
    <section className="card" aria-labelledby="recording-title">
      <h2 id="recording-title">Call recording</h2>
      {state === 'READY'
        ? <audio controls preload="metadata" src={url} aria-label="Full call recording" />
        : <p className="muted">{{ LOADING: 'Loading the recording…', NONE: 'No call recording is stored for this application.', FAILED: 'The recording could not be loaded. Refresh to try again.' }[state]}</p>}
      <p className="muted">The greeting tells every caller the call is recorded; no opt-out is offered (project decision 2026-09-23, pending law-team review). Confirmed facts are listed separately.</p>
    </section>
  )
}

export default function RecordPage({ session }) {
  const { applicationId } = useParams()
  const officer = session.user.assignments.some(({ role }) => role === 'DLAO_OFFICER')
  const [data, setData] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [reviewState, setReviewState] = useState('READY_FOR_DECISION')
  const [reviewReason, setReviewReason] = useState('')
  const [priorityDecision, setPriorityDecision] = useState('URGENT')
  const [priorityReason, setPriorityReason] = useState('')
  const [acceptReason, setAcceptReason] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskAction, setTaskAction] = useState('')
  const [taskRole, setTaskRole] = useState('DLAO_OFFICER')
  const [docLabel, setDocLabel] = useState('')
  const [docQuality, setDocQuality] = useState('PENDING_REVIEW')
  const [docNote, setDocNote] = useState('')
  const [docRestricted, setDocRestricted] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [versions, setVersions] = useState([])
  const [contactChannel, setContactChannel] = useState('PHONE')
  const [contactOutcome, setContactOutcome] = useState('BLOCKED_UNSAFE')
  const [contactReason, setContactReason] = useState('')
  const [neutralScript, setNeutralScript] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const options = { token: session.token, signal: controller.signal }
    Promise.all([
      api(`/api/applications/${applicationId}`, options),
      api(`/api/applications/${applicationId}/tasks`, options),
      api(`/api/applications/${applicationId}/documents`, options),
      api(`/api/applications/${applicationId}/contact-attempts`, options),
      officer ? api(`/api/applications/${applicationId}/facts`, options) : Promise.resolve([]),
      officer ? api(`/api/applications/${applicationId}/audit`, options) : Promise.resolve(null),
      officer ? api(`/api/applications/${applicationId}/safe-contact`, options) : Promise.resolve(null),
      officer ? api(`/api/applications/${applicationId}/transcript`, options) : Promise.resolve(null),
      api(`/api/applications/${applicationId}/history`, options),
      officer ? api(`/api/applications/${applicationId}/referrals`, options) : Promise.resolve(null),
      officer ? api(`/api/applications/${applicationId}/evidence-access`, options) : Promise.resolve([]),
    ]).then(([record, tasks, documents, contacts, facts, audit, safeContact, transcript, history, referrals, evidenceAccess]) => {
      setData({ record, tasks, documents, contacts, facts, audit, safeContact, transcript, history, referrals, evidenceAccess })
      setLoading(false)
    }).catch((failure) => { if (failure.name !== 'AbortError') { setError(failure.message); setLoading(false) } })
    return () => controller.abort()
  }, [applicationId, officer, refresh, session.token])

  async function change(path, body, success) {
    setError('')
    setNotice('')
    try {
      const result = await api(path, { token: session.token, method: 'POST', body })
      setNotice(success)
      setRefresh((value) => value + 1)
      return result
    } catch (failure) { setError(failure.message); return null }
  }

  async function submitReview(event) {
    event.preventDefault()
    const override = reviewState === 'PENDING_REVIEW' || data.record.reviewState === 'READY_FOR_DECISION'
    const result = await change(`/api/applications/${applicationId}/${override ? 'review-override' : 'review'}`, { reviewState, reason: reviewReason }, override ? 'Human override recorded.' : 'Review recorded.')
    if (result) setReviewReason('')
  }

  async function submitAcceptance(event) {
    event.preventDefault()
    const result = await change(`/api/applications/${applicationId}/accept`, { reason: acceptReason }, 'Application accepted. A Case ID was created.')
    if (result) setAcceptReason('')
  }

  async function submitPriority(event) {
    event.preventDefault()
    const result = await change(`/api/applications/${applicationId}/priority-override`, { priorityDecision, reason: priorityReason }, 'Human priority override recorded in the audit timeline.')
    if (result) setPriorityReason('')
  }

  async function submitTask(event) {
    event.preventDefault()
    const result = await change(`/api/applications/${applicationId}/tasks`, { title: taskTitle, ownerRole: taskRole, nextAction: taskAction }, 'Task added to this record.')
    if (result) { setTaskTitle(''); setTaskAction('') }
  }

  async function submitDocument(event) {
    event.preventDefault()
    const path = selectedDocument ? `/api/documents/${selectedDocument.id}/versions` : `/api/applications/${applicationId}/documents`
    const result = await change(path, { label: docLabel, qualityState: docQuality, ...(docNote ? { note: docNote } : {}), ...(!selectedDocument && docRestricted ? { sensitivity: 'RESTRICTED' } : {}) }, selectedDocument ? 'Document version added.' : docRestricted ? 'Restricted evidence recorded. Only you hold an access grant.' : 'Document metadata added.')
    if (result) {
      setDocLabel('')
      setDocNote('')
      setDocRestricted(false)
      if (selectedDocument) setVersions(await api(`/api/documents/${selectedDocument.id}/versions`, { token: session.token }))
    }
  }

  async function selectDocument(document) {
    setError('')
    try {
      setVersions(await api(`/api/documents/${document.id}/versions`, { token: session.token }))
      setSelectedDocument(document)
      setDocLabel(document.label)
    } catch (failure) { setError(failure.message) }
  }

  async function submitContact(event) {
    event.preventDefault()
    const result = await change(`/api/applications/${applicationId}/contact-attempts`, { channel: contactChannel, outcome: contactOutcome, reason: contactReason }, 'Contact history recorded. No message or call was sent by the system.')
    if (result) setContactReason('')
  }

  async function simulateUnknownAnswer() {
    const result = await change(`/api/applications/${applicationId}/contact-attempts`, { channel: 'PHONE', outcome: 'UNKNOWN_PERSON', reason: 'Simulated call to the safe number: an unknown person answered.' }, 'Failed safe: nothing was disclosed and a safer follow-up task was created.')
    if (result) setNeutralScript(result.neutralScript)
  }

  return (
    <section aria-labelledby="record-title">
      <Link to="/">← Workspace</Link>
      <p className="eyebrow">Shared application record</p>
      <h1 id="record-title">{applicationId}</h1>
      {error && <p role="alert" className="error">{error}</p>}
      {notice && <p role="status" className="success">{notice}</p>}
      {loading && <p role="status">Loading record…</p>}
      {!loading && data?.record.applicationId === applicationId && <>
        <div className="summary-grid">
          <section className="card" aria-labelledby="summary-title">
            <h2 id="summary-title">Application</h2>
            <dl className="details">
              <div><dt>Applicant</dt><dd>{data.record.applicantName}</dd></div>
              <div><dt>Channel</dt><dd>{channels[data.record.channel] || data.record.channel}</dd></div>
              <div><dt>Reported by</dt><dd>{data.record.representation ? `${data.record.representation.representativeName} · ${data.record.representation.relationship} · authority ${data.record.representation.authorityStatus}` : 'No representative recorded'}</dd></div>
              <div><dt>Status</dt><dd><span className="badge">{data.record.status}</span></dd></div>
              <div><dt>Review</dt><dd>{data.record.reviewState?.replaceAll('_', ' ')}</dd></div>
              <div><dt>Human priority</dt><dd>{data.record.priorityDecision || 'Not recorded'}</dd></div>
              <div><dt>Identity</dt><dd>{data.record.identityStatus} · legal requirements pending verification</dd></div>
              <div><dt>Case ID</dt><dd>{data.record.caseId || 'Not created before acceptance'}</dd></div>
              <div><dt>Next action</dt><dd>{data.record.nextTask?.nextAction || 'No open task'}</dd></div>
              <div><dt>Owner</dt><dd>{data.record.nextTask?.ownerRole?.replaceAll('_', ' ') || 'Not assigned'}</dd></div>
            </dl>
          </section>
          {officer && <section className="card safety-card" aria-labelledby="safe-title">
            <h2 id="safe-title">Safe contact</h2>
            {!data.safeContact ? <p>No safe-contact profile is recorded. Do not disclose or send case details through an unverified route.</p> : <dl className="details">
              <div><dt>Profile version</dt><dd>{data.safeContact.version}</dd></div>
              <div><dt>Allowed</dt><dd>{data.safeContact.allowedChannels.join(', ') || 'None'}</dd></div>
              <div><dt>Prohibited</dt><dd>{data.safeContact.prohibitedChannels.join(', ') || 'None'}</dd></div>
              <div><dt>Safe time</dt><dd>{data.safeContact.safeTimeWindow || 'Not recorded'}</dd></div>
              <div><dt>Unknown answer</dt><dd>{data.safeContact.unknownAnswerAction.replaceAll('_', ' ')}</dd></div>
            </dl>}
            <p className="muted">This page logs contact history only; it never sends a message or places a call.</p>
            {data.safeContact?.allowedChannels.includes('PHONE') && <button type="button" className="secondary-button" onClick={simulateUnknownAnswer}>Simulate call: unknown person answers</button>}
            {neutralScript && <figure className="script-box" aria-label="Neutral script"><figcaption>Say only this (placeholder pending law-team approval):</figcaption><blockquote>{neutralScript}</blockquote></figure>}
          </section>}
        </div>

        {data.record.assistance && <section className="card" aria-labelledby="assistance-title"><h2 id="assistance-title">Assisted-intake provenance</h2><dl className="details">
          <div><dt>Helper</dt><dd>{data.record.assistance.helperName}</dd></div>
          <div><dt>Translator</dt><dd>{data.record.assistance.translatorName}</dd></div>
          <div><dt>Typist</dt><dd>{data.record.assistance.typistName}</dd></div>
          <div><dt>Original language</dt><dd>{data.record.assistance.originalLanguage}</dd></div>
          <div><dt>Case type</dt><dd>{data.record.assistance.caseType}</dd></div>
          <div><dt>Assisted consent</dt><dd>{data.record.assistance.consentState} (oral attestation; legal review pending)</dd></div>
          <div><dt>Original statement confirmed</dt><dd>{data.record.assistance.originalConfirmed ? 'yes' : 'pending'}</dd></div>
          <div><dt>Translation confirmed</dt><dd>{data.record.assistance.translationConfirmed ? 'yes' : 'pending'}</dd></div>
        </dl><p className="muted">The original account and translated text remain distinct facts. The helper phone is not treated as applicant contact.</p></section>}

        {officer && <section className="card" aria-labelledby="priority-title"><h2 id="priority-title">Human priority override</h2><p className="muted">Queue urgency is a rules-based recommendation (criteria pending legal verification). An officer decides whether to prioritize; this does not decide legal eligibility.</p>{data.record.urgencyReasons.length ? <><h3>Urgency recommendation reasons</h3><ul>{data.record.urgencyReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></> : <p>No urgency indicators are recorded.</p>}<form onSubmit={submitPriority} className="form-stack inline-form"><label htmlFor="priority-decision">Priority decision</label><select id="priority-decision" value={priorityDecision} onChange={(event) => setPriorityDecision(event.target.value)}><option value="URGENT">Prioritize urgently</option><option value="ROUTINE">Handle routinely</option></select><label htmlFor="priority-reason">Override reason</label><textarea id="priority-reason" value={priorityReason} onChange={(event) => setPriorityReason(event.target.value)} minLength="10" maxLength="1000" required /><button type="submit">Record priority override</button></form></section>}

        {!officer && <section className="card" aria-labelledby="history-title"><h2 id="history-title">Case reconstruction</h2><p className="muted">Action history without private reasons or fact text. Contact and task history on this page belong to the same record.</p><p>Audit integrity: {data.history.valid ? 'valid under demo assumptions' : 'check required'}</p><ol className="timeline">{data.history.events.map((event, index) => <li key={index}><strong>{event.action.replaceAll('_', ' ')}</strong><small> {event.actorRole.replaceAll('_', ' ')} · <time dateTime={event.createdAt}>{showDate(event.createdAt)}</time></small></li>)}</ol></section>}

        {officer && data.record.status === 'SUBMITTED' && <section className="card" aria-labelledby="decision-title">
          <h2 id="decision-title">Human review and acceptance</h2>
          <p className="muted">Review is a human workflow state, not proof of legal identity or eligibility.</p>
          <div className="action-grid">
            <form onSubmit={submitReview} className="form-stack">
              <label htmlFor="review-state">Review outcome</label>
              <select id="review-state" value={reviewState} onChange={(event) => setReviewState(event.target.value)}>
                <option value="READY_FOR_DECISION">Ready for officer decision</option>
                <option value="NEEDS_INFORMATION">Needs information</option>
                {data.record.reviewState !== 'PENDING_REVIEW' && <option value="PENDING_REVIEW">Return to pending review (override)</option>}
              </select>
              <label htmlFor="review-reason">Reason</label>
              <textarea id="review-reason" value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} minLength="10" maxLength="1000" required />
              <button type="submit">{reviewState === 'PENDING_REVIEW' || data.record.reviewState === 'READY_FOR_DECISION' ? 'Record human override' : 'Record review'}</button>
            </form>
            <form onSubmit={submitAcceptance} className="form-stack">
              <h3>Accept into case workflow</h3>
              <p className="muted">Only an authorised officer can create the Case ID after review.</p>
              <label htmlFor="accept-reason">Decision reason</label>
              <textarea id="accept-reason" value={acceptReason} onChange={(event) => setAcceptReason(event.target.value)} minLength="10" maxLength="1000" required />
              <button type="submit" disabled={data.record.reviewState !== 'READY_FOR_DECISION'}>Accept application</button>
            </form>
          </div>
        </section>}

        <section className="card" aria-labelledby="tasks-title">
          <h2 id="tasks-title">Tasks and next actions</h2>
          <ul className="plain-list">{data.tasks.map((task) => <li key={task._id}><div><strong>{task.title}</strong> <span className="badge">{task.status}</span><p>{task.nextAction}</p><small>Owner: {task.ownerRole.replaceAll('_', ' ')} · Due: {showDate(task.dueAt)}</small></div>{task.kind === 'MANUAL' && task.status === 'OPEN' && <button type="button" className="secondary-button" onClick={() => change(`/api/applications/${applicationId}/tasks/${task._id}/complete`, undefined, 'Task completed.')}>Complete</button>}</li>)}</ul>
          <form onSubmit={submitTask} className="form-stack inline-form">
            <h3>Add a task</h3>
            <label htmlFor="task-title">Task title</label><input id="task-title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} minLength="3" maxLength="120" required />
            <label htmlFor="task-owner">Owner role</label><select id="task-owner" value={taskRole} onChange={(event) => setTaskRole(event.target.value)}><option value="DLAO_OFFICER">DLAO officer</option><option value="CASE_SUPPORT">Case support</option><option value="MEDIATOR">Mediator</option><option value="RECEIVING_DLAO">Receiving DLAO</option></select>
            <label htmlFor="task-action">Next action</label><input id="task-action" value={taskAction} onChange={(event) => setTaskAction(event.target.value)} minLength="5" maxLength="300" required />
            <button type="submit" className="secondary-button">Add task</button>
          </form>
        </section>

        {officer && data.record.status === 'ACCEPTED' && <LawyerManagement applicationId={applicationId} token={session.token} onChanged={() => setRefresh((value) => value + 1)} />}
        {officer && data.record.status === 'ACCEPTED' && <TriagePanel applicationId={applicationId} token={session.token} />}
        {officer && data.record.status === 'ACCEPTED' && <RelatedIncidentPanel applicationId={applicationId} token={session.token} />}
        {officer && <DuplicateReview applicationId={applicationId} token={session.token} />}
        {officer && data.record.caseId && <MediationPanel applicationId={applicationId} session={session} role="DLAO_OFFICER" />}

        <div className="summary-grid">
          <section className="card" aria-labelledby="docs-title">
            <h2 id="docs-title">Document metadata</h2>
            <p className="muted">Metadata is versioned. Fictional text uploads and cited review appear below for assisted applications; unreadable content is never guessed.</p>
            {data.documents.length === 0 && <p>No metadata recorded.</p>}
            <ul className="plain-list">{data.documents.map((document) => <li key={document.id}><div><strong>{document.label}</strong>{document.sensitivity === 'RESTRICTED' && <> <span className="badge warn-badge">Restricted</span></>}<p>{document.redacted ? 'You hold no access grant; opening is refused and logged.' : `Version ${document.currentVersion}`}</p></div>{!document.redacted && <button type="button" className="secondary-button" onClick={() => selectDocument(document)} aria-label={`Versions of ${document.label}`}>Versions</button>}</li>)}</ul>
            {selectedDocument && <div className="version-history"><h3>Versions of {selectedDocument.label}</h3><ol>{versions.map((version) => <li key={version.version}>Version {version.version}: {version.label} — {version.qualityState.replaceAll('_', ' ')}{version.note ? ` · ${version.note}` : ''}</li>)}</ol></div>}
            {officer && <form onSubmit={submitDocument} className="form-stack">
              <h3>{selectedDocument ? 'Add a metadata version' : 'Add document metadata'}</h3>
              {selectedDocument && <button type="button" className="text-button" onClick={() => { setSelectedDocument(null); setVersions([]); setDocLabel('') }}>New document instead</button>}
              <label htmlFor="doc-label">Label</label><input id="doc-label" value={docLabel} onChange={(event) => setDocLabel(event.target.value)} minLength="3" maxLength="160" required />
              <label htmlFor="doc-quality">Quality state</label><select id="doc-quality" value={docQuality} onChange={(event) => setDocQuality(event.target.value)}><option value="PENDING_REVIEW">Pending review</option><option value="READABLE">Readable metadata</option><option value="UNREADABLE">Unreadable / human verification required</option></select>
              <label htmlFor="doc-note">Note (optional)</label><textarea id="doc-note" value={docNote} onChange={(event) => setDocNote(event.target.value)} maxLength="500" />
              {!selectedDocument && <label className="checkbox-label" htmlFor="doc-restricted"><input id="doc-restricted" type="checkbox" checked={docRestricted} onChange={(event) => setDocRestricted(event.target.checked)} />Highly sensitive evidence: restrict to me and explicit authorisations</label>}
              <button type="submit" className="secondary-button">{selectedDocument ? 'Add version' : 'Add metadata'}</button>
            </form>}
            {officer && data.evidenceAccess.length > 0 && <div className="version-history"><h3>Restricted evidence access log</h3><ol>{data.evidenceAccess.map((entry) => <li key={entry.id}>{entry.outcome} · {entry.user} ({entry.roles.join(', ').replaceAll('_', ' ')}) · {entry.document} · basis {entry.basis.replaceAll('_', ' ').toLowerCase()} · <time dateTime={entry.createdAt}>{showDate(entry.createdAt)}</time></li>)}</ol></div>}
          </section>
          <section className="card" aria-labelledby="contact-title">
            <h2 id="contact-title">Contact history</h2>
            <p className="muted">Recording an attempt does not send a notification or authorise sensitive disclosure.</p>
            {data.contacts.length === 0 && <p>No attempts recorded.</p>}
            <ul className="plain-list">{data.contacts.map((attempt) => <li key={attempt._id}><div><strong>{attempt.outcome.replaceAll('_', ' ')}</strong><p>{attempt.channel} · {attempt.reason}</p><small>{showDate(attempt.createdAt)} · Sensitive disclosure: no</small></div></li>)}</ul>
            {officer && <form onSubmit={submitContact} className="form-stack">
              <h3>Log an observed attempt</h3>
              <label htmlFor="contact-channel">Channel</label><select id="contact-channel" value={contactChannel} onChange={(event) => setContactChannel(event.target.value)}><option>PHONE</option><option>SMS</option><option>WEB</option><option>IN_PERSON</option></select>
              <label htmlFor="contact-outcome">Outcome</label><select id="contact-outcome" value={contactOutcome} onChange={(event) => setContactOutcome(event.target.value)}><option value="BLOCKED_UNSAFE">Blocked unsafe</option><option value="NO_ANSWER">No answer</option><option value="UNKNOWN_PERSON">Unknown person answered</option><option value="APPLICANT_REACHED">Applicant reached</option></select>
              <label htmlFor="contact-reason">Outcome reason</label><textarea id="contact-reason" value={contactReason} onChange={(event) => setContactReason(event.target.value)} minLength="5" maxLength="500" required />
              <button type="submit" className="secondary-button">Log attempt</button>
            </form>}
          </section>
        </div>

        {officer && <ReferralPanel applicationId={applicationId} officeCode={data.record.officeCode} accepted={data.record.status === 'ACCEPTED'} referrals={data.referrals} documents={data.documents} token={session.token} change={change} />}

        {officer && data.record.assistance && <DocumentReview applicationId={applicationId} caseType={data.record.assistance.caseType} documents={data.documents} token={session.token} onChanged={() => setRefresh((value) => value + 1)} />}

        {officer && data.record.channel === 'VOICE_SIM' && <CallRecording applicationId={applicationId} token={session.token} />}

        {officer && data.transcript && <section className="card" aria-labelledby="transcript-title">
          <h2 id="transcript-title">Voice transcript</h2>
          <p className="muted">Kept with the call recording. Machine transcription by {data.transcript.transcribedBy}, not a verbatim legal record; confirmed facts are listed separately.</p>
          <ol className="timeline">{data.transcript.turns.map((line, index) => <li key={index}><strong>{line.speaker === 'CALLER' ? 'Caller' : 'AI assistant'}</strong><p lang="bn">{line.text}</p></li>)}</ol>
        </section>}

        {officer && <div className="summary-grid">
          <section className="card" aria-labelledby="facts-title"><h2 id="facts-title">Fact provenance</h2>{data.facts.length === 0 ? <p>No facts recorded.</p> : <ol className="timeline">{data.facts.map((fact) => <li key={fact._id}><strong>{fact.field}</strong><p>{fact.value}</p><small>{fact.sourceType.replaceAll('_', ' ')} · {fact.captureMethod} · Revision {fact.revision} · Caller confirmed: {fact.callerConfirmed ? 'yes' : 'no'} · Applicant confirmed: {fact.applicantConfirmed ? 'yes' : 'no'}{fact.aiInferred ? ' · AI-extracted from voice' : ''}</small></li>)}</ol>}</section>
          <section className="card" aria-labelledby="timeline-title"><h2 id="timeline-title">Audit timeline</h2><p className="muted">Integrity check: {data.audit?.valid ? 'valid under demo assumptions' : 'FAILED — review required'}</p><ol className="timeline">{data.audit?.events.map((event) => <li key={event._id}><strong>{event.action.replaceAll('_', ' ')}</strong><p>{event.reason || 'No reason recorded for this event.'}</p><small>{event.actorRole.replaceAll('_', ' ')} · <time dateTime={event.createdAt}>{showDate(event.createdAt)}</time></small></li>)}</ol></section>
        </div>}
      </>}
    </section>
  )
}
