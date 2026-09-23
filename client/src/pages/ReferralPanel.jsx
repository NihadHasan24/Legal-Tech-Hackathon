import { useEffect, useState } from 'react'
import { api } from '../services/api.js'

const showDate = (value) => value ? new Date(value).toLocaleString() : 'Not set'
// datetime-local inputs take local wall-clock time without a zone.
const localInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const toggle = (list, id) => list.includes(id) ? list.filter((item) => item !== id) : [...list, id]

export default function ReferralPanel({ applicationId, officeCode, accepted, referrals, documents, token, change }) {
  const [receivers, setReceivers] = useState([])
  const [error, setError] = useState('')
  const [responsibleUserId, setResponsibleUserId] = useState('')
  const [reason, setReason] = useState('')
  const [history, setHistory] = useState('')
  const [expectedAction, setExpectedAction] = useState('')
  const [dueAt, setDueAt] = useState(() => localInput(new Date(Date.now() + 2 * 86400000)))
  const [documentIds, setDocumentIds] = useState([])
  const [sensitiveIds, setSensitiveIds] = useState([])
  const [sensitiveReason, setSensitiveReason] = useState('')
  const [route, setRoute] = useState('REFER')
  const [routeOffice, setRouteOffice] = useState('')
  const [routeReason, setRouteReason] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api('/api/referrals/receivers', { token, signal: controller.signal })
      .then(setReceivers).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [token])

  const decided = referrals.routingDecision
  const waiting = referrals.referrals.some(({ status }) => status === 'SENT' || status === 'ACKNOWLEDGED')
  const eligible = receivers.filter((item) => item.officeCode !== officeCode && (decided?.route !== 'REFER' || item.officeCode === decided.officeCode))
  const offices = [...new Set(receivers.map((item) => item.officeCode).filter((code) => code !== officeCode))]
  const standard = documents.filter((item) => item.sensitivity === 'STANDARD')
  const restricted = documents.filter((item) => item.sensitivity === 'RESTRICTED' && !item.redacted)
  const blocked = !accepted ? 'A referral can be sent once the application is accepted and has a Case ID.'
    : referrals.escalation ? 'Further transfers are blocked until the authorised routing decision above is recorded.'
      : waiting ? 'A referral is still waiting for the receiving office.'
        : decided?.route === 'RETAIN' ? 'The routing decision keeps this matter in this office. Record a new routing decision to refer it.' : ''

  async function send(event) {
    event.preventDefault()
    const result = await change(`/api/applications/${applicationId}/referrals`, {
      responsibleUserId, reason, history, expectedAction, dueAt: new Date(dueAt).toISOString(), documentIds, sensitiveDocumentIds: sensitiveIds,
      ...(sensitiveIds.length ? { sensitiveAccessReason: sensitiveReason } : {}),
    }, 'Referral sent. The receiving office must acknowledge it by the deadline.')
    if (result) { setReason(''); setHistory(''); setExpectedAction(''); setDocumentIds([]); setSensitiveIds([]); setSensitiveReason('') }
  }

  async function decide(event) {
    event.preventDefault()
    const result = await change(`/api/applications/${applicationId}/routing-decision`, { route, ...(route === 'REFER' ? { officeCode: routeOffice } : {}), reason: routeReason }, 'Authorised routing decision recorded.')
    if (result) setRouteReason('')
  }

  return <section className="card" aria-labelledby="referral-title">
    <h2 id="referral-title">Referral and jurisdiction</h2>
    <p className="muted">Returned transfers: {referrals.returns} (escalation at {referrals.threshold}). The system escalates repeated returns; an authorised human decides the route. Who holds that authority is pending legal verification.</p>
    {error && <p role="alert" className="error">{error}</p>}

    {referrals.escalation && <section className="escalation-box" aria-labelledby="escalation-title">
      <h3 id="escalation-title">{referrals.escalation.title}</h3>
      <p>{referrals.escalation.nextAction}</p>
      <form onSubmit={decide} className="form-stack">
        <label htmlFor="route-choice">Route</label>
        <select id="route-choice" value={route} onChange={(event) => setRoute(event.target.value)}><option value="REFER">Refer to a named office</option><option value="RETAIN">Keep in this office</option></select>
        {route === 'REFER' && <><label htmlFor="route-office">Office that must act</label><select id="route-office" value={routeOffice} onChange={(event) => setRouteOffice(event.target.value)} required><option value="">Choose an office</option>{offices.map((code) => <option key={code} value={code}>{code}</option>)}</select></>}
        <label htmlFor="route-reason">Routing decision reason</label>
        <textarea id="route-reason" value={routeReason} onChange={(event) => setRouteReason(event.target.value)} minLength="10" maxLength="1000" required />
        <button type="submit">Record routing decision</button>
      </form>
    </section>}
    {decided && <p>Authorised routing decision: <strong>{decided.route === 'REFER' ? `refer to ${decided.officeCode}` : 'keep in this office'}</strong> · {decided.reason} · {showDate(decided.decidedAt)}</p>}

    {referrals.referrals.length === 0 ? <p>No referrals sent.</p> : <ol className="timeline">{referrals.referrals.map((item) => <li key={item.id}>
      <strong>{item.receivingOfficeCode} · {item.status}</strong>{item.overdue && <> <span className="badge warn-badge">Acknowledgement overdue</span></>}
      <p>Responsible: {item.responsibleName} · Acknowledge by {showDate(item.dueAt)}</p>
      <p>Expected action: {item.expectedAction}</p>
      {item.responseReason && <p>{item.status === 'RETURNED' ? 'Return reason' : 'Response reason'}: {item.responseReason}</p>}
      <small>Sent {showDate(item.createdAt)} · {item.documentCount} document{item.documentCount === 1 ? '' : 's'} · {item.restrictedEvidenceCount} restricted evidence{item.acknowledgedAt ? ` · acknowledged ${showDate(item.acknowledgedAt)}` : ''}{item.overdueAt ? ` · follow-up created ${showDate(item.overdueAt)}` : ''}</small>
    </li>)}</ol>}

    {blocked ? <p className="muted">{blocked}</p> : <form onSubmit={send} className="form-stack inline-form">
      <h3>Send a referral package</h3>
      <label htmlFor="referral-receiver">Responsible receiving actor</label>
      <select id="referral-receiver" value={responsibleUserId} onChange={(event) => setResponsibleUserId(event.target.value)} required><option value="">Choose a receiving DLAO</option>{eligible.map((item) => <option key={item.userId} value={item.userId}>{item.displayName} · {item.officeCode}</option>)}</select>
      <label htmlFor="referral-reason">Referral reason</label>
      <textarea id="referral-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength="10" maxLength="1000" required />
      <label htmlFor="referral-history">Relevant history</label>
      <textarea id="referral-history" value={history} onChange={(event) => setHistory(event.target.value)} minLength="10" maxLength="2000" required />
      <label htmlFor="referral-action">Expected action</label>
      <input id="referral-action" value={expectedAction} onChange={(event) => setExpectedAction(event.target.value)} minLength="5" maxLength="300" required />
      <label htmlFor="referral-due">Acknowledgement deadline</label>
      <input id="referral-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required />
      {standard.length > 0 && <fieldset><legend>Documents to include</legend>{standard.map((item) => <label key={item.id} className="checkbox-label"><input type="checkbox" checked={documentIds.includes(item.id)} onChange={() => setDocumentIds(toggle(documentIds, item.id))} />{item.label}</label>)}</fieldset>}
      {restricted.length > 0 && <fieldset><legend>Restricted evidence (include only if necessary)</legend>{restricted.map((item) => <label key={item.id} className="checkbox-label"><input type="checkbox" checked={sensitiveIds.includes(item.id)} onChange={() => setSensitiveIds(toggle(sensitiveIds, item.id))} />{item.label}</label>)}
        {sensitiveIds.length > 0 && <><label htmlFor="referral-sensitive-reason">Why this restricted evidence must be shared</label><textarea id="referral-sensitive-reason" value={sensitiveReason} onChange={(event) => setSensitiveReason(event.target.value)} minLength="10" maxLength="500" required /></>}
      </fieldset>}
      <p className="muted">Restricted evidence is visible only to the named responsible actor while the referral is open, and every opening is logged. Safe-contact rules travel with the package; the contact number does not.</p>
      <button type="submit">Send referral</button>
    </form>}
  </section>
}
