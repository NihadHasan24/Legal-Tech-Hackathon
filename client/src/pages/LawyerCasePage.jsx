import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../services/api.js'

const dateText = (value) => value ? new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set'

export default function LawyerCasePage({ session }) {
  const { caseId } = useParams()
  const [record, setRecord] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [responseReason, setResponseReason] = useState('')
  const [drafts, setDrafts] = useState({})

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/cases/${encodeURIComponent(caseId)}`, { token: session.token, signal: controller.signal })
      .then(setRecord).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [caseId, refresh, session.token])

  async function send(path, body, success) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api(path, { token: session.token, method: 'POST', body })
      setNotice(success)
      setResponseReason('')
      setRefresh((value) => value + 1)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  function respond(decision) {
    send(`/api/lawyers/assignments/${record.assignmentId}/respond`, { decision, reason: responseReason },
      decision === 'ACCEPT' ? 'Assignment accepted. The Case remains under human control.' : 'Assignment declined. The DLAO worklist has been updated.')
  }

  function submitUpdate(event, update) {
    event.preventDefault()
    const draft = drafts[update._id] || {}
    send(`/api/lawyers/assignments/${record.assignmentId}/updates/${update._id}`, draft,
      `Progress update ${update.sequence} recorded.`)
  }

  if (!record) return <section aria-labelledby="case-title"><Link to="/">← Workspace</Link><h1 id="case-title">{caseId}</h1>{error ? <p role="alert" className="error">{error}</p> : <p role="status">Loading assigned Case…</p>}</section>

  const pending = record.assignmentStatus === 'PENDING'
  const openUpdates = (record.updates || []).filter(({ status }) => status === 'PENDING' || status === 'MISSED')

  return <section aria-labelledby="case-title">
    <Link to="/">← Lawyer worklist</Link>
    <p className="eyebrow">Assigned Case · fictional data only</p>
    <h1 id="case-title">{record.caseId}</h1>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    <section className="card" aria-labelledby="summary-title">
      <h2 id="summary-title">Case summary</h2>
      <dl className="details"><div><dt>Application ID</dt><dd>{record.applicationId}</dd></div><div><dt>Case status</dt><dd>{record.status}</dd></div><div><dt>Assignment status</dt><dd>{record.assignmentStatus}</dd></div>
        {!pending && <><div><dt>Next hearing</dt><dd>{record.nextHearingAt ? <time dateTime={record.nextHearingAt}>{dateText(record.nextHearingAt)}</time> : 'Not recorded'}</dd></div><div><dt>Next step</dt><dd>{record.nextAction || 'Not recorded'}</dd></div></>}
      </dl>
    </section>

    {pending && <section className="card" aria-labelledby="decision-title"><h2 id="decision-title">Respond to assignment offer</h2><p>The offer does not become an accepted assignment until you respond.</p>
      <label htmlFor="assignment-response-reason">Reason for accepting or declining</label><textarea id="assignment-response-reason" value={responseReason} onChange={(event) => setResponseReason(event.target.value)} minLength="10" maxLength="500" required />
      <div className="choice-row"><button type="button" disabled={busy || responseReason.trim().length < 10} onClick={() => respond('ACCEPT')}>Accept assignment</button><button type="button" className="secondary-button" disabled={busy || responseReason.trim().length < 10} onClick={() => respond('DECLINE')}>Decline with reason</button></div>
    </section>}

    {!pending && <>
      <section className="card" aria-labelledby="updates-title"><h2 id="updates-title">Required progress updates</h2>
        {openUpdates.length === 0 ? <p>No open mandatory progress updates.</p> : <ul className="plain-list">{openUpdates.map((update) => {
          const draft = drafts[update._id] || {}
          return <li key={update._id}><div className="record-detail"><strong>Update {update.sequence} · {update.status.replaceAll('_', ' ')}</strong><p>Due {dateText(update.dueAt)}</p><p>{update.instruction}</p>
            <form onSubmit={(event) => submitUpdate(event, update)} className="form-stack">
              <label htmlFor={`lawyer-report-${update._id}`}>Progress report</label><textarea id={`lawyer-report-${update._id}`} value={draft.report || ''} onChange={(event) => setDrafts((current) => ({ ...current, [update._id]: { ...current[update._id], report: event.target.value } }))} minLength="5" maxLength="2000" required />
              <label htmlFor={`lawyer-next-${update._id}`}>Next step</label><input id={`lawyer-next-${update._id}`} value={draft.nextAction || ''} onChange={(event) => setDrafts((current) => ({ ...current, [update._id]: { ...current[update._id], nextAction: event.target.value } }))} minLength="5" maxLength="300" required />
              <button type="submit" disabled={busy}>Submit progress update</button>
            </form>
          </div></li>
        })}</ul>}
        {(record.updates || []).filter(({ report }) => report).map((update) => <div className="version-history" key={update._id}><h3>Update {update.sequence} · {update.status.replaceAll('_', ' ')}</h3><p>{update.report}</p><p>Next step: {update.nextAction}</p><small>Submitted {dateText(update.submittedAt)}</small></div>)}
      </section>

      <section className="card" aria-labelledby="documents-title"><h2 id="documents-title">Relevant standard documents</h2><p className="muted">Restricted evidence is not available in this worklist.</p>
        {!record.documents?.length ? <p>No standard documents are linked to this Case.</p> : <ul className="plain-list">{record.documents.map((document) => <li key={document.id}><div className="record-detail"><strong>{document.label}</strong><p>Version {document.currentVersion} · {document.version?.qualityState?.replaceAll('_', ' ') || 'metadata only'}</p>{document.version?.qualityState === 'READABLE' && <details><summary>Read linked document text</summary><pre>{document.version.textContent || 'No readable text was stored.'}</pre></details>}{document.version?.qualityState === 'UNREADABLE' && <p>Unreadable / uncertain · human verification required.</p>}</div></li>)}</ul>}
      </section>

      <section className="card" aria-labelledby="payment-read-title"><h2 id="payment-read-title">Payment stage status</h2><p className="muted">Status only. No payment is sent or changed here.</p>{record.payment ? <p>{record.payment.stage.replaceAll('_', ' ')} · {record.payment.status.replaceAll('_', ' ')} · {record.payment.reason}</p> : <p>No payment-stage status is recorded.</p>}</section>
    </>}
  </section>
}
