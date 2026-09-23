import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../services/api.js'

export default function RelatedIncidentPanel({ applicationId, token }) {
  const [groups, setGroups] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [title, setTitle] = useState('')
  const [otherIds, setOtherIds] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/applications/${applicationId}/incidents`, { token, signal: controller.signal })
      .then(setGroups).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [applicationId, token, refresh])

  async function create(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const applicationIds = [...new Set([applicationId, ...otherIds.split(/[\s,;]+/).map((id) => id.trim().toUpperCase()).filter(Boolean)])]
    try {
      await api(`/api/applications/${applicationId}/incidents`, { token, method: 'POST', body: { applicationIds, title, reason } })
      setNotice('Cases linked into a related-incident group. No records were merged.')
      setTitle('')
      setOtherIds('')
      setReason('')
      setRefresh((value) => value + 1)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  return <section className="card" aria-labelledby="incident-link-title">
    <h2 id="incident-link-title">Related incidents</h2>
    <p className="muted">Link related accepted Cases without combining their applicants, facts, instructions, or outcomes. Only explicitly linked standard evidence is shared.</p>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    {groups?.length > 0 && <ul className="plain-list">{groups.map((group) => <li key={group.id}><div><Link to={`/incidents/${group.id}`}><strong>{group.title}</strong></Link><p>{group.memberCount} Cases · {group.sharedEvidenceCount} shared evidence references</p></div></li>)}</ul>}
    {groups?.length === 0 && <p>This Case is not linked to a related-incident group.</p>}
    <form onSubmit={create} className="form-stack">
      <h3>Link a factory or shared-incident group</h3>
      <label htmlFor="incident-title">Group label</label><input id="incident-title" value={title} onChange={(event) => setTitle(event.target.value)} minLength="3" maxLength="120" required />
      <label htmlFor="incident-member-ids">Two or more other accepted Application IDs</label><textarea id="incident-member-ids" value={otherIds} onChange={(event) => setOtherIds(event.target.value)} placeholder="APP-2026-000002, APP-2026-000003" required />
      <label htmlFor="incident-link-reason">Why these Cases are related</label><textarea id="incident-link-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength="10" maxLength="1000" required />
      <button type="submit" disabled={busy}>Link Cases, do not merge</button>
    </form>
  </section>
}
