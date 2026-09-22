import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { api } from '../services/api.js'

const roles = {
  DLAO_OFFICER: ['DLAO officer', 'Review the shared application queue and make recorded human decisions.'],
  CASE_SUPPORT: ['Case support', 'Find structured records and manage routine follow-up tasks.'],
  HELPLINE_AGENT: ['Helpline agent', 'Create an application in the shared record. This is not the live 16699 connection.'],
  UDC_OPERATOR: ['UDC operator', 'Submit a bounded assisted intake. Full assisted/offline tools come later.'],
  PANEL_LAWYER: ['Panel lawyer', 'Only actively assigned case summaries appear here. Lawyer updates come later.'],
  MEDIATOR: ['Mediator', 'Mediation assignments and remote/hybrid workflow are not enabled yet.'],
  RECEIVING_DLAO: ['Receiving DLAO', 'Referral acknowledgement and routing are not enabled yet.'],
  CLAO: ['CLAO', 'Certification is not enabled; no settlement can be certified here yet.'],
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [role, setRole] = useState(session.user.assignments[0]?.role || '')
  const [workspace, setWorkspace] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [applicantName, setApplicantName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [submittedId, setSubmittedId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!role) return
    const controller = new AbortController()
    api(`/api/workspace?role=${encodeURIComponent(role)}`, { token: session.token, signal: controller.signal })
      .then((result) => { setWorkspace(result); setLoading(false) })
      .catch((failure) => { if (failure.name !== 'AbortError') { setError(failure.message); setLoading(false) } })
    return () => controller.abort()
  }, [role, refresh, session.token])

  async function submitApplication(event) {
    event.preventDefault()
    setError('')
    setSubmittedId('')
    try {
      const result = await api('/api/applications', { token: session.token, method: 'POST', body: { applicantName } })
      setApplicantName('')
      setSubmittedId(result.applicationId)
      setRefresh((value) => value + 1)
      if (role === 'DLAO_OFFICER' || role === 'CASE_SUPPORT') navigate(`/applications/${result.applicationId}`)
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

  if (!role) return <p role="alert">No active provider role is assigned to this account.</p>
  const canSubmit = ['DLAO_OFFICER', 'CASE_SUPPORT', 'HELPLINE_AGENT', 'UDC_OPERATOR'].includes(role)
  const canSearch = ['DLAO_OFFICER', 'CASE_SUPPORT'].includes(role)

  return (
    <section aria-labelledby="dashboard-title">
      <p className="eyebrow">{workspace?.officeCode || 'Demo office'} · Shared record</p>
      <h1 id="dashboard-title">{roles[role]?.[0] || 'Provider'} workspace</h1>
      <p className="lede">{roles[role]?.[1]}</p>
      {session.user.assignments.length > 1 && <div className="role-switch"><label htmlFor="active-role">Active role</label><select id="active-role" value={role} onChange={(event) => { setWorkspace(null); setLoading(true); setRole(event.target.value) }}>{session.user.assignments.map((assignment) => <option key={`${assignment.role}-${assignment.officeCode}`} value={assignment.role}>{roles[assignment.role]?.[0] || assignment.role}</option>)}</select></div>}
      {error && <p role="alert" className="error">{error}</p>}
      {submittedId && <p role="status" className="success">Application {submittedId} submitted to the DLAO queue. No Case ID exists yet.</p>}

      {(canSubmit || canSearch) && <div className="dashboard-actions">
        {canSubmit && <section className="card" aria-labelledby="intake-title">
          <h2 id="intake-title">New application</h2>
          <p className="muted">Fictional demo records only. Identity remains incomplete until reviewed.</p>
          <form onSubmit={submitApplication} className="form-stack">
            <label htmlFor="applicant-name">Fictional applicant name</label>
            <input id="applicant-name" value={applicantName} onChange={(event) => setApplicantName(event.target.value)} minLength="2" maxLength="120" required />
            <button type="submit">Submit application</button>
          </form>
        </section>}
        {canSearch && <section className="card" aria-labelledby="search-title">
          <h2 id="search-title">Find a record</h2>
          <p className="muted">Use an exact Application ID or Case ID. Access is checked by the server.</p>
          <form onSubmit={search} className="form-stack">
            <label htmlFor="record-id">Application or Case ID</label>
            <input id="record-id" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="APP-2026-000001" required />
            <button type="submit" className="secondary-button">Find record</button>
          </form>
        </section>}
      </div>}

      <section className="worklist" aria-labelledby="worklist-title">
        <div className="section-heading"><h2 id="worklist-title">{role === 'DLAO_OFFICER' || role === 'CASE_SUPPORT' ? 'Recent applications' : role === 'PANEL_LAWYER' ? 'Assigned cases' : 'Role worklist'}</h2><span className="muted">{workspace?.records.length || 0} shown</span></div>
        {loading && <p role="status">Loading workspace…</p>}
        {!loading && workspace?.records.length === 0 && <p className="empty-state">No records are available to this role in Step 3. Later workflows will add role-specific assignments here.</p>}
        {!loading && workspace?.records.length > 0 && <ul className="record-list">{workspace.records.map((record) => <li key={record.applicationId}>
          {role === 'PANEL_LAWYER'
            ? <Link to={`/cases/${record.caseId}`}><strong>{record.caseId}</strong><span>Assigned case · {record.applicationId}</span></Link>
            : <Link to={`/applications/${record.applicationId}`}><strong>{record.applicationId}</strong><span>{record.applicantName} · {record.status} · {record.reviewState?.replaceAll('_', ' ')}</span>{record.caseId && <small>{record.caseId}</small>}</Link>}
        </li>)}</ul>}
      </section>
    </section>
  )
}
