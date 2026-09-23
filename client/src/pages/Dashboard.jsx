import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { api } from '../services/api.js'

const roles = {
  DLAO_OFFICER: ['DLAO officer', 'Review the shared queue and make recorded human decisions.'],
  CASE_SUPPORT: ['Case support', 'Find shared records and reconstruct routine follow-up.'],
  HELPLINE_AGENT: ['Helpline agent', 'Submit intake or give a bounded status update. This is not the live 16699 service.'],
  UDC_OPERATOR: ['UDC operator', 'Submit a bounded assisted intake. Offline tools come later.'],
  PANEL_LAWYER: ['Panel lawyer', 'Review assignment offers, required updates, hearing dates, and next steps.'],
  MEDIATOR: ['Mediator', 'Manage assigned mediation steps and review settlement drafts.'],
  RECEIVING_DLAO: ['Receiving DLAO', 'Acknowledge, accept, or return referral packages sent to your office.'],
  CLAO: ['CLAO', 'Review legal applicability and record certification when authorised.'],
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [role, setRole] = useState(session.user.assignments[0]?.role || '')
  const [workspace, setWorkspace] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [applicantName, setApplicantName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [lookupCode, setLookupCode] = useState('')
  const [callerVerified, setCallerVerified] = useState(false)
  const [contactChannel, setContactChannel] = useState('PHONE')
  const [lookup, setLookup] = useState(null)
  const [verifiedLookup, setVerifiedLookup] = useState(null)
  const [lawyerChangeReason, setLawyerChangeReason] = useState('')
  const [lawyerChangeNotice, setLawyerChangeNotice] = useState('')
  const [submitted, setSubmitted] = useState(null)
  const [filter, setFilter] = useState('')
  const [queue, setQueue] = useState('ALL')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!role) return
    const controller = new AbortController()
    const path = role === 'PANEL_LAWYER' ? '/api/lawyers/worklist' : `/api/workspace?role=${encodeURIComponent(role)}`
    api(path, { token: session.token, signal: controller.signal })
      .then((result) => { setWorkspace(result); setLoading(false) })
      .catch((failure) => { if (failure.name !== 'AbortError') { setError(failure.message); setLoading(false) } })
    return () => controller.abort()
  }, [role, refresh, session.token])

  async function submitApplication(event) {
    event.preventDefault()
    setError('')
    setSubmitted(null)
    try {
      const result = await api('/api/applications', { token: session.token, method: 'POST', body: { applicantName } })
      setApplicantName('')
      setSubmitted(result)
      setRefresh((value) => value + 1)
    } catch (failure) { setError(failure.message) }
  }

  async function search(event) {
    event.preventDefault()
    setError('')
    try {
      const record = await api(`/api/applications/search?identifier=${encodeURIComponent(identifier.trim().toUpperCase())}`, { token: session.token })
      navigate(`/applications/${record.applicationId}`)
    } catch (failure) { setError(failure.message) }
  }

  async function statusLookup(event) {
    event.preventDefault()
    setError('')
    setLookup(null)
    setVerifiedLookup(null)
    try {
      const code = lookupCode.trim().toLowerCase()
      const result = await api('/api/applications/status-lookup', { token: session.token, method: 'POST', body: { identifier: identifier.trim().toUpperCase(), lookupCode: code, callerVerified, contactChannel } })
      setLookup(result)
      setVerifiedLookup({ applicationId: result.applicationId, lookupCode: code, contactChannel })
      setLookupCode('')
      setCallerVerified(false)
    } catch (failure) { setError(failure.message) }
  }

  async function requestLawyerChange(event) {
    event.preventDefault()
    if (!verifiedLookup) return
    setError('')
    setLawyerChangeNotice('')
    try {
      const result = await api(`/api/lawyers/applications/${verifiedLookup.applicationId}/change-requests`, { token: session.token, method: 'POST', body: {
        lookupCode: verifiedLookup.lookupCode, contactChannel: verifiedLookup.contactChannel, callerVerified: true, reason: lawyerChangeReason,
      } })
      setLawyerChangeNotice(result.nextStep)
      setLawyerChangeReason('')
      setVerifiedLookup(null)
    } catch (failure) { setError(failure.message) }
  }

  if (!role) return <p role="alert">No active provider role is assigned to this account.</p>
  const staff = role === 'DLAO_OFFICER' || role === 'CASE_SUPPORT'
  const canSubmit = staff || role === 'HELPLINE_AGENT' || role === 'UDC_OPERATOR'
  const visible = workspace?.records.filter((record) => (queue === 'ALL' || record.flags?.some((flag) => flag.code === queue)) && (!filter || [record.applicationId, record.caseId, record.applicantName].some((value) => value?.toLowerCase().includes(filter.toLowerCase())))) || []

  return <section aria-labelledby="dashboard-title">
    <p className="eyebrow">{workspace?.officeCode || 'Demo office'} · Shared record</p>
    <h1 id="dashboard-title">{roles[role]?.[0] || 'Provider'} workspace</h1>
    <p className="lede">{roles[role]?.[1]}</p>
    {session.user.assignments.length > 1 && <div className="role-switch"><label htmlFor="active-role">Active role</label><select id="active-role" value={role} onChange={(event) => { setWorkspace(null); setLoading(true); setLookup(null); setVerifiedLookup(null); setRole(event.target.value) }}>{session.user.assignments.map((assignment) => <option key={`${assignment.role}-${assignment.officeCode}`} value={assignment.role}>{roles[assignment.role]?.[0] || assignment.role}</option>)}</select></div>}
    {error && <p role="alert" className="error">{error}</p>}
    {role === 'UDC_OPERATOR' && <p><Link to="/assisted">Open assisted intake and offline drafts</Link></p>}
    {submitted && <p role="status" className="success">Application {submitted.applicationId} submitted to the DLAO queue. No Case ID exists yet. Give this lookup code to the caller once, through the agreed safe route: <code>{submitted.lookupCode}</code>. It will not be shown again.</p>}

    {canSubmit && <div className="dashboard-actions">
      <section className="card" aria-labelledby="intake-title"><h2 id="intake-title">New application</h2><p className="muted">Fictional demo records only. Identity remains incomplete until reviewed.</p><form onSubmit={submitApplication} className="form-stack"><label htmlFor="applicant-name">Fictional applicant name</label><input id="applicant-name" value={applicantName} onChange={(event) => setApplicantName(event.target.value)} minLength="2" maxLength="120" required /><button type="submit">Submit application</button></form></section>
      {staff && <section className="card" aria-labelledby="search-title"><h2 id="search-title">Find a record</h2><p className="muted">Use an exact Application ID or Case ID. Access is checked by the server.</p><form onSubmit={search} className="form-stack"><label htmlFor="record-id">Application or Case ID</label><input id="record-id" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="APP-2026-000001" required /><button type="submit" className="secondary-button">Find record</button></form></section>}
    </div>}

    {role === 'HELPLINE_AGENT' && <section className="card" aria-labelledby="lookup-title"><h2 id="lookup-title">Status lookup</h2><p className="muted">Ask for the ID and one-time code. Complete the approved caller-verification procedure; code possession alone is not identity proof. This caller-initiated lookup does not contact the number on file. Use only the route allowed by the active safe-contact profile.</p><form onSubmit={statusLookup} className="form-stack inline-form"><label htmlFor="lookup-id">Application or Case ID</label><input id="lookup-id" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /><label htmlFor="lookup-code">One-time lookup code</label><input id="lookup-code" value={lookupCode} onChange={(event) => setLookupCode(event.target.value)} minLength="24" maxLength="24" autoComplete="off" required /><label htmlFor="status-channel">Permitted lookup route</label><select id="status-channel" value={contactChannel} onChange={(event) => setContactChannel(event.target.value)}><option value="PHONE">Phone</option><option value="IN_PERSON">In person</option></select><label className="checkbox-label" htmlFor="caller-verified"><input id="caller-verified" type="checkbox" checked={callerVerified} onChange={(event) => setCallerVerified(event.target.checked)} required />I performed the approved human caller-verification procedure.</label><button type="submit">Check permitted status</button></form>{lookup && <div role="status" className="success"><p>{lookup.applicationId} · {lookup.status}{lookup.caseId ? ` · ${lookup.caseId}` : ''}</p><p>Next hearing: {lookup.nextHearingAt ? <time dateTime={lookup.nextHearingAt}>{new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lookup.nextHearingAt))}</time> : 'Not recorded'}</p><p>Next step: {lookup.nextAction || lookup.nextStep}</p><p className="muted">Read this permitted status to the caller; no outbound contact was sent.</p></div>}{verifiedLookup && lookup?.status === 'ACCEPTED' && <form onSubmit={requestLawyerChange} className="form-stack inline-form"><h3>Record applicant lawyer-change request</h3><p className="muted">This records the applicant’s request for human review only. It does not change the assigned lawyer.</p><label htmlFor="lawyer-change-reason">Applicant’s stated reason</label><textarea id="lawyer-change-reason" value={lawyerChangeReason} onChange={(event) => setLawyerChangeReason(event.target.value)} minLength="5" maxLength="1000" required /><button type="submit">Send request to DLAO review</button></form>}{lawyerChangeNotice && <p role="status" className="success">{lawyerChangeNotice}</p>}</section>}

    {staff && workspace?.report && <section aria-labelledby="report-title"><h2 id="report-title">Routine report</h2><p>{workspace.report.total} applications · {workspace.report.accepted} accepted · {workspace.report.counts.OVERDUE} overdue tasks · {workspace.report.counts.LAWYER_UPDATE_OVERDUE} lawyer-update cases</p><p className="muted">Channels: {Object.entries(workspace.report.byChannel).map(([channel, count]) => `${channel} ${count}`).join(' · ') || 'none'}.</p></section>}

    <section className="worklist" aria-labelledby="worklist-title"><div className="section-heading"><h2 id="worklist-title">{staff ? 'Daily queue and history' : role === 'PANEL_LAWYER' ? 'Assigned cases' : role === 'RECEIVING_DLAO' ? 'Referrals to your office' : 'Role worklist'}</h2><span className="muted">{workspace?.records.length || 0} records</span></div>
      {staff && <div className="dashboard-actions"><div><label htmlFor="history-filter">Search shown history</label><input id="history-filter" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Name, Application ID, or Case ID" /></div><div><label htmlFor="queue-filter">Queue flag</label><select id="queue-filter" value={queue} onChange={(event) => setQueue(event.target.value)}><option value="ALL">All records</option>{Object.entries(workspace?.report?.counts || {}).map(([code, count]) => <option key={code} value={code}>{code.replaceAll('_', ' ')} ({count})</option>)}</select></div></div>}
      {loading && <p role="status">Loading workspace…</p>}
      {!loading && workspace?.records.length === 0 && <p className="empty-state">{role === 'PANEL_LAWYER' ? 'No current or pending panel-lawyer assignments.' : 'No records are available to this role yet.'}</p>}
      {!loading && workspace?.records.length > 0 && visible.length === 0 && <p className="empty-state">No records match these filters.</p>}
      {!loading && visible.length > 0 && <ul className="record-list">{visible.map((record) => <li key={record.referralId ?? record.assignmentId ?? record.applicationId}>{role === 'PANEL_LAWYER' ? <Link to={`/cases/${record.caseId}`}><strong>{record.caseId} · {record.assignmentStatus}</strong><span>Application {record.applicationId}{record.nextAction ? ` · Next: ${record.nextAction}` : ''}</span>{record.nextHearingAt && <small>Hearing: {new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.nextHearingAt))}</small>}{record.updates?.map((update) => <small key={update.id}>Update {update.sequence}: {update.status.replaceAll('_', ' ')} · due {new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(update.dueAt))}</small>)}</Link> : role === 'RECEIVING_DLAO' ? <Link to={`/referrals/${record.referralId}`}><strong>{record.caseId}</strong><span>Referral from {record.sendingOfficeCode} · {record.status}</span><small>Acknowledge by {new Date(record.dueAt).toLocaleString()}{record.overdue ? ' · acknowledgement overdue' : ''}</small></Link> : <Link to={`/applications/${record.applicationId}`}><strong>{record.applicationId}</strong><span>{record.applicantName} · {record.status} · {record.reviewState?.replaceAll('_', ' ')}</span>{record.caseId && <small>{record.caseId}</small>}{record.flags?.map((flag) => <small key={flag.code}>{flag.code.replaceAll('_', ' ')}: {flag.reason}</small>)}</Link>}</li>)}</ul>}
    </section>
  </section>
}
