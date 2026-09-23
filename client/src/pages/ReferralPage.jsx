import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../services/api.js'

const showDate = (value) => value ? new Date(value).toLocaleString() : 'Not set'

export default function ReferralPage({ session }) {
  const { referralId } = useParams()
  const [data, setData] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [decision, setDecision] = useState('ACCEPT')
  const [reason, setReason] = useState('')
  const [opened, setOpened] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/referrals/${referralId}`, { token: session.token, signal: controller.signal })
      .then(setData).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [referralId, refresh, session.token])

  async function respond(body, success) {
    setError('')
    setNotice('')
    try {
      await api(`/api/referrals/${referralId}/respond`, { token: session.token, method: 'POST', body })
      setNotice(success)
      setReason('')
      setRefresh((value) => value + 1)
    } catch (failure) { setError(failure.message) }
  }

  async function open(document) {
    setError('')
    try { setOpened(await api(`/api/documents/${document.id}`, { token: session.token })) } catch (failure) { setError(failure.message) }
  }

  function submitResponse(event) {
    event.preventDefault()
    respond({ action: decision, reason }, decision === 'ACCEPT' ? 'Referral accepted. The sending office can see this.' : 'Referral returned with your reason. The sending office can see this.')
  }

  const live = data && data.status !== 'RETURNED'
  return <section aria-labelledby="referral-title">
    <Link to="/">← Workspace</Link>
    <p className="eyebrow">Referral package{data ? ` · ${data.sendingOfficeCode} to ${data.receivingOfficeCode}` : ''}</p>
    <h1 id="referral-title">{data?.caseId ?? 'Referral'}</h1>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    {!error && !data && <p role="status">Loading referral…</p>}
    {data && <>
      <div className="summary-grid">
        <section className="card" aria-labelledby="package-title"><h2 id="package-title">Package</h2><dl className="details">
          <div><dt>Status</dt><dd><span className="badge">{data.status}</span>{data.overdue && <> <span className="badge warn-badge">Acknowledgement overdue</span></>}</dd></div>
          <div><dt>Applicant</dt><dd>{data.applicantName}</dd></div>
          <div><dt>Application ID</dt><dd>{data.applicationId}</dd></div>
          <div><dt>Responsible actor</dt><dd>{data.responsibleName}{data.responsible ? ' (you)' : ''}</dd></div>
          <div><dt>Sent by</dt><dd>{data.sentByName} · {data.sendingOfficeCode} · {showDate(data.createdAt)}</dd></div>
          <div><dt>Acknowledge by</dt><dd>{showDate(data.dueAt)}{data.acknowledgedAt ? ` · acknowledged ${showDate(data.acknowledgedAt)}` : ''}</dd></div>
          <div><dt>Reason</dt><dd>{data.reason}</dd></div>
          <div><dt>Relevant history</dt><dd>{data.history}</dd></div>
          <div><dt>Expected action</dt><dd>{data.expectedAction}</dd></div>
          {data.responseReason && <div><dt>Response reason</dt><dd>{data.responseReason}</dd></div>}
        </dl></section>
        <section className="card safety-card" aria-labelledby="referral-safe-title"><h2 id="referral-safe-title">Safe contact rules</h2>
          {!data.safeContact ? <p>No safe-contact profile is recorded. Do not contact the applicant until the sending office confirms a safe route.</p> : <dl className="details">
            <div><dt>Allowed</dt><dd>{data.safeContact.allowedChannels.join(', ') || 'None'}</dd></div>
            <div><dt>Prohibited</dt><dd>{data.safeContact.prohibitedChannels.join(', ') || 'None'}</dd></div>
            <div><dt>Safe time</dt><dd>{data.safeContact.safeTimeWindow || 'Not recorded'}</dd></div>
            <div><dt>Neutral wording</dt><dd>{data.safeContact.neutralWordingRequired ? 'Required' : 'Not required'}</dd></div>
            <div><dt>Unknown answer</dt><dd>{data.safeContact.unknownAnswerAction.replaceAll('_', ' ')}</dd></div>
          </dl>}
        </section>
      </div>

      <section className="card" aria-labelledby="referral-docs-title"><h2 id="referral-docs-title">Documents and evidence</h2>
        {data.documents.length === 0 ? <p>No documents are shared with you in this package.</p> : <ul className="plain-list">{data.documents.map((item) => <li key={item.id}><div><strong>{item.label}</strong><p>{item.sensitivity === 'RESTRICTED' ? 'Restricted evidence · opening is logged' : 'Standard document'} · version {item.currentVersion}</p></div>{data.responsible && live && <button type="button" className="secondary-button" onClick={() => open(item)} aria-label={`Open ${item.label}`}>Open</button>}</li>)}</ul>}
        {data.restrictedEvidenceCount > 0 && !data.documents.some((item) => item.sensitivity === 'RESTRICTED') && <p className="muted">{data.restrictedEvidenceCount} restricted evidence item(s) are authorised for the named responsible actor only.</p>}
        {opened && <div className="version-history" role="status"><h3>{opened.label}</h3><p>Version {opened.currentVersion} · {opened.version?.qualityState.replaceAll('_', ' ')}{opened.version?.note ? ` · ${opened.version.note}` : ''}</p></div>}
      </section>

      {data.previousReturns.length > 0 && <section className="card" aria-labelledby="returns-title"><h2 id="returns-title">Earlier returns of this case</h2><ol className="timeline">{data.previousReturns.map((item, index) => <li key={index}><strong>{item.receivingOfficeCode}</strong><p>{item.reason}</p><small>{showDate(item.respondedAt)}</small></li>)}</ol></section>}

      <section className="card" aria-labelledby="respond-title"><h2 id="respond-title">Your office’s response</h2>
        <p className="muted">Acknowledging confirms receipt. Accepting means your office takes the expected action. Final legal jurisdiction stays a human decision; repeated returns go to an authorised routing decision.</p>
        {data.status === 'SENT' && <button type="button" onClick={() => respond({ action: 'ACKNOWLEDGE' }, 'Receipt acknowledged. The sending office can see this.')}>Acknowledge receipt</button>}
        {(data.status === 'SENT' || data.status === 'ACKNOWLEDGED') ? <form onSubmit={submitResponse} className="form-stack inline-form">
          <label htmlFor="referral-decision">Decision</label>
          <select id="referral-decision" value={decision} onChange={(event) => setDecision(event.target.value)}><option value="ACCEPT">Accept the referral</option><option value="RETURN">Return to the sending office</option></select>
          <label htmlFor="referral-response-reason">Response reason</label>
          <textarea id="referral-response-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength="10" maxLength="1000" required />
          <button type="submit">Record response</button>
        </form> : <p>Response recorded: {data.status.toLowerCase()} on {showDate(data.respondedAt)}.</p>}
      </section>
    </>}
  </section>
}
