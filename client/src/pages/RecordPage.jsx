import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../services/api.js'

const showDate = (value) => value ? new Date(value).toLocaleString() : 'Not set'
const channels = { VOICE_SIM: '16699 voice simulation', HELPLINE_SIM: 'Helpline agent (simulated 16699)', UDC: 'UDC assisted', DLAO: 'DLAO office', WEB: 'Web' }

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
  const [acceptReason, setAcceptReason] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskAction, setTaskAction] = useState('')
  const [taskRole, setTaskRole] = useState('DLAO_OFFICER')
  const [docLabel, setDocLabel] = useState('')
  const [docQuality, setDocQuality] = useState('PENDING_REVIEW')
  const [docNote, setDocNote] = useState('')
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
    ]).then(([record, tasks, documents, contacts, facts, audit, safeContact, transcript]) => {
      setData({ record, tasks, documents, contacts, facts, audit, safeContact, transcript })
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

  async function submitTask(event) {
    event.preventDefault()
    const result = await change(`/api/applications/${applicationId}/tasks`, { title: taskTitle, ownerRole: taskRole, nextAction: taskAction }, 'Task added to this record.')
    if (result) { setTaskTitle(''); setTaskAction('') }
  }

  async function submitDocument(event) {
    event.preventDefault()
    const path = selectedDocument ? `/api/documents/${selectedDocument.id}/versions` : `/api/applications/${applicationId}/documents`
    const result = await change(path, { label: docLabel, qualityState: docQuality, ...(docNote ? { note: docNote } : {}) }, selectedDocument ? 'Document version added.' : 'Document metadata added.')
    if (result) {
      setDocLabel('')
      setDocNote('')
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

        <div className="summary-grid">
          <section className="card" aria-labelledby="docs-title">
            <h2 id="docs-title">Document metadata</h2>
            <p className="muted">No document files are uploaded at this step. Unreadable content is never guessed.</p>
            {data.documents.length === 0 && <p>No metadata recorded.</p>}
            <ul className="plain-list">{data.documents.map((document) => <li key={document.id}><div><strong>{document.label}</strong><p>Version {document.currentVersion}</p></div><button type="button" className="secondary-button" onClick={() => selectDocument(document)}>Versions</button></li>)}</ul>
            {selectedDocument && <div className="version-history"><h3>Versions of {selectedDocument.label}</h3><ol>{versions.map((version) => <li key={version.version}>Version {version.version}: {version.label} — {version.qualityState.replaceAll('_', ' ')}{version.note ? ` · ${version.note}` : ''}</li>)}</ol></div>}
            {officer && <form onSubmit={submitDocument} className="form-stack">
              <h3>{selectedDocument ? 'Add a metadata version' : 'Add document metadata'}</h3>
              {selectedDocument && <button type="button" className="text-button" onClick={() => { setSelectedDocument(null); setVersions([]); setDocLabel('') }}>New document instead</button>}
              <label htmlFor="doc-label">Label</label><input id="doc-label" value={docLabel} onChange={(event) => setDocLabel(event.target.value)} minLength="3" maxLength="160" required />
              <label htmlFor="doc-quality">Quality state</label><select id="doc-quality" value={docQuality} onChange={(event) => setDocQuality(event.target.value)}><option value="PENDING_REVIEW">Pending review</option><option value="READABLE">Readable metadata</option><option value="UNREADABLE">Unreadable / human verification required</option></select>
              <label htmlFor="doc-note">Note (optional)</label><textarea id="doc-note" value={docNote} onChange={(event) => setDocNote(event.target.value)} maxLength="500" />
              <button type="submit" className="secondary-button">{selectedDocument ? 'Add version' : 'Add metadata'}</button>
            </form>}
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

        {officer && data.transcript && <section className="card" aria-labelledby="transcript-title">
          <h2 id="transcript-title">Voice transcript</h2>
          <p className="muted">Kept because the caller consented. Machine transcription by {data.transcript.transcribedBy}, not a verbatim legal record; confirmed facts are listed separately.</p>
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
