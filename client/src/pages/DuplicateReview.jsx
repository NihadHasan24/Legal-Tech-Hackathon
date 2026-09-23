import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../services/api.js'

const shown = (value) => value || 'Not recorded'

export default function DuplicateReview({ applicationId, token }) {
  const [candidates, setCandidates] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [reasons, setReasons] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/applications/${applicationId}/duplicates`, { token, signal: controller.signal })
      .then(setCandidates).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [applicationId, token, refresh])

  async function review(candidate, decision) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api(`/api/applications/${applicationId}/duplicates/${candidate.applicationId}/review`, {
        token, method: 'POST', body: { decision, reason: reasons[candidate.applicationId] || '' },
      })
      setNotice('Human review saved. Both Application records and any Case records remain separate.')
      setRefresh((value) => value + 1)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  return <section className="card" aria-labelledby="duplicate-title">
    <h2 id="duplicate-title">Possible duplicate review</h2>
    <p className="muted">Deterministic similarity ranking only; it is not proof of identity. A human decision never merges, rejects, or changes eligibility for either record.</p>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    {candidates === null && !error && <p role="status">Checking same-office records...</p>}
    {candidates?.length === 0 && <p>No similar same-office Application records were suggested.</p>}
    <div className="record-list">{candidates?.map((candidate) => <article className="record-detail" key={candidate.applicationId}>
      <h3><Link to={`/applications/${candidate.applicationId}`}>{candidate.applicantName} - {candidate.applicationId}</Link></h3>
      <p>Similarity score (not a probability): {candidate.score}/100 - review: {candidate.reviewStatus.replaceAll('_', ' ').toLowerCase()}</p>
      <table>
        <caption>Side-by-side comparison of Application {applicationId} and the suggested candidate</caption>
        <thead><tr><th scope="col">Attribute</th><th scope="col">Current record</th><th scope="col">Candidate</th><th scope="col">Comparison</th></tr></thead>
        <tbody>{candidate.attributes.map((attribute) => <tr key={attribute.label}>
          <th scope="row">{attribute.label}</th><td>{shown(attribute.currentValue)}</td><td>{shown(attribute.candidateValue)}</td><td>{attribute.comparison.replaceAll('_', ' ').toLowerCase()}</td>
        </tr>)}</tbody>
      </table>
      <p>Matching evidence: {candidate.matchingAttributes.join('; ') || 'No exact attributes'}.</p>
      <p>Differences: {candidate.differingAttributes.join(', ') || 'None recorded'}.</p>
      {candidate.reviewStatus === 'OPEN' ? <>
        <label htmlFor={`duplicate-reason-${candidate.applicationId}`}>Human review reason</label>
        <textarea id={`duplicate-reason-${candidate.applicationId}`} value={reasons[candidate.applicationId] || ''} onChange={(event) => setReasons((current) => ({ ...current, [candidate.applicationId]: event.target.value }))} minLength="10" maxLength="1000" required />
        <div className="choice-row">
          <button type="button" disabled={busy || (reasons[candidate.applicationId] || '').trim().length < 10} onClick={() => review(candidate, 'CONFIRMED_DUPLICATE')}>Confirm duplicate relationship (keep separate)</button>
          <button type="button" className="secondary-button" disabled={busy || (reasons[candidate.applicationId] || '').trim().length < 10} onClick={() => review(candidate, 'NOT_DUPLICATE')}>Mark as different people</button>
        </div>
      </> : <p role="status">Human review recorded: {candidate.reviewStatus === 'CONFIRMED_DUPLICATE' ? 'possible duplicate relationship; records remain separate' : 'different people'}{candidate.reviewReason ? ` - ${candidate.reviewReason}` : ''}</p>}
    </article>)}</div>
  </section>
}
