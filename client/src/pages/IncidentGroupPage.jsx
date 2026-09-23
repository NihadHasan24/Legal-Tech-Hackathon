import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../services/api.js'

export default function IncidentGroupPage({ session }) {
  const { groupId } = useParams()
  const [data, setData] = useState(null)
  const [documentId, setDocumentId] = useState('')
  const [reason, setReason] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/incidents/${groupId}`, { token: session.token, signal: controller.signal })
      .then((group) => { setData(group); setDocumentId(group.availableDocuments[0]?.id ?? '') })
      .catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [groupId, session.token, refresh])

  async function share(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api(`/api/incidents/${groupId}/evidence`, { token: session.token, method: 'POST', body: { documentId, reason } })
      setNotice('Existing standard document reference added. No document copy was created.')
      setReason('')
      setRefresh((value) => value + 1)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  if (!data) return <section aria-labelledby="group-title"><Link to="/">← Workspace</Link><h1 id="group-title">Related incident group</h1>{error ? <p role="alert" className="error">{error}</p> : <p role="status">Loading related incident group…</p>}</section>

  return <section aria-labelledby="group-title">
    <Link to="/">← Workspace</Link>
    <p className="eyebrow">Related incidents · linked, not merged</p>
    <h1 id="group-title">{data.title}</h1>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    <p className="safety-note">{data.separationNotice}</p>
    <section className="card" aria-labelledby="members-title"><h2 id="members-title">Separate Case records</h2>
      <ul className="plain-list">{data.members.map((member) => <li key={member.applicationId}><div><strong>{member.applicantName}</strong><p>{member.caseId || 'Accepted Case ID unavailable'} · Application {member.applicationId}</p><Link to={`/applications/${member.applicationId}`}>Open this individual Case record</Link></div></li>)}</ul>
    </section>
    <section className="card" aria-labelledby="shared-evidence-title"><h2 id="shared-evidence-title">Common evidence (reference-linked)</h2>
      {data.sharedEvidence.length === 0 && <p>No standard evidence has been shared with this group.</p>}
      <ul className="plain-list">{data.sharedEvidence.map((document) => <li key={document.id}><div><strong>{document.label}</strong><p>One stored document · source Case {document.sourceCaseId || 'unavailable'} · version {document.currentVersion} · {document.qualityState.replaceAll('_', ' ').toLowerCase()}</p>{document.textContent && <details><summary>Read common evidence text</summary><pre>{document.textContent}</pre></details>}</div></li>)}</ul>
      {data.availableDocuments.length > 0 && <form onSubmit={share} className="form-stack">
        <label htmlFor="shared-document">Readable standard document from a member Case</label><select id="shared-document" value={documentId || data.availableDocuments[0].id} onChange={(event) => setDocumentId(event.target.value)}>{data.availableDocuments.map((document) => <option key={document.id} value={document.id}>{document.label} · source {document.sourceCaseId}</option>)}</select>
        <label htmlFor="shared-evidence-reason">Reason this common evidence is relevant</label><textarea id="shared-evidence-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength="10" maxLength="1000" required />
        <button type="submit" disabled={busy}>Share existing evidence reference</button>
      </form>}
    </section>
  </section>
}
