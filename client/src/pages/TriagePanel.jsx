import { useEffect, useState } from 'react'
import { api } from '../services/api.js'

const componentNames = {
  CASE_CATEGORIZER: 'Case categorizer',
  PROCESS_SAFETY: 'Process, compliance, and safety checker',
  URGENCY_ROUTING: 'Urgency and routing recommender',
}
const categories = ['LABOUR', 'FAMILY', 'LAND', 'CRIMINAL', 'OTHER', 'UNCERTAIN']
const dispositions = [
  ['PRIORITIZE_FOR_HUMAN_REVIEW', 'Prioritize for human review'],
  ['CONTINUE_ROUTINE_REVIEW', 'Continue routine review'],
  ['SEEK_MORE_INFORMATION', 'Seek more information'],
  ['REQUEST_JURISDICTION_REVIEW', 'Request jurisdiction review'],
  ['NO_CHANGE', 'No change'],
]

export default function TriagePanel({ applicationId, token }) {
  const [assessments, setAssessments] = useState(null)
  const [category, setCategory] = useState('UNCERTAIN')
  const [disposition, setDisposition] = useState('PRIORITIZE_FOR_HUMAN_REVIEW')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const latest = assessments?.[0]

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/applications/${applicationId}/triage`, { token, signal: controller.signal })
      .then((items) => {
        setAssessments(items)
        const recommendation = items[0]?.components.find(({ name }) => name === 'CASE_CATEGORIZER')?.recommendation
        if (categories.includes(recommendation)) setCategory(recommendation)
      }).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [applicationId, token])

  async function run() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const assessment = await api(`/api/applications/${applicationId}/triage`, { token, method: 'POST', body: {} })
      setAssessments((current) => [assessment, ...(current ?? []).filter(({ id }) => id !== assessment.id)])
      const recommendation = assessment.components.find(({ name }) => name === 'CASE_CATEGORIZER')?.recommendation
      if (categories.includes(recommendation)) setCategory(recommendation)
      setNotice('Triage suggestions recorded for human review. No priority, route, or case outcome was changed.')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  async function decide(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const decided = await api(`/api/applications/${applicationId}/triage/${latest.id}/decision`, {
        token, method: 'POST', body: { category, disposition, reason },
      })
      setAssessments((current) => current.map((item) => item.id === decided.id ? decided : item))
      setReason('')
      setNotice('Officer triage decision recorded. Separate priority and routing controls remain unchanged.')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  return <section className="card" aria-labelledby="triage-title">
    <h2 id="triage-title">Multi-agent triage suggestions</h2>
    <p className="muted">Decision support only. Components use structured category, safety, and workflow flags; names, contact details, free-text complaint, and document content are not sent to the configured AI provider. Final priority, routing, eligibility, and outcomes stay with authorised humans.</p>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    <button type="button" onClick={run} disabled={busy}>{latest?.status === 'PENDING_HUMAN_REVIEW' ? 'Refresh triage assessment' : 'Run triage components'}</button>
    {assessments === null && !error && <p role="status">Loading triage history...</p>}
    {latest && <div className="record-list">
      <p>Assessment: {latest.aiAssisted ? `AI-assisted (${latest.model})` : 'deterministic rules fallback'} - {latest.status.replaceAll('_', ' ').toLowerCase()}</p>
      {latest.disagreements.map((conflict, index) => <p role="alert" className="error" key={`${conflict.dimension}-${index}`}>Component disagreement: {conflict.summary}</p>)}
      {latest.components.map((component) => <article className="record-detail" key={component.name}>
        <h3>{componentNames[component.name]}: {component.recommendation.replaceAll('_', ' ').toLowerCase()}</h3>
        <p>Urgency signal: {component.urgencySignal.toLowerCase()} - human review required</p>
        <ul>{component.reasons.map((item, index) => <li key={`${component.name}-reason-${index}`}>{item}</li>)}</ul>
        <p>Evidence references: {component.evidenceRefs.length ? component.evidenceRefs.map((ref) => <code key={ref}>{ref} </code>) : 'None recorded'}</p>
        <p className="muted">Uncertainty: {component.uncertainty}</p>
      </article>)}
      {latest.status === 'PENDING_HUMAN_REVIEW' ? <form className="form-stack" onSubmit={decide}>
        <h3>Officer decision - human authority</h3>
        <label htmlFor="triage-final-category">Officer-reviewed category</label>
        <select id="triage-final-category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select>
        <label htmlFor="triage-disposition">Human triage disposition</label>
        <select id="triage-disposition" value={disposition} onChange={(event) => setDisposition(event.target.value)}>{dispositions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <label htmlFor="triage-decision-reason">Reason for the officer's triage decision</label>
        <textarea id="triage-decision-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength="10" maxLength="1000" required />
        <button type="submit" disabled={busy || reason.trim().length < 10}>Record human triage decision</button>
      </form> : latest.humanDecision && <p role="status">Officer decision: {latest.humanDecision.category} - {latest.humanDecision.disposition.replaceAll('_', ' ').toLowerCase()}. {latest.humanDecision.reason}</p>}
      {assessments.length > 1 && <p className="muted">{assessments.length - 1} older assessment(s) remain in the record history.</p>}
    </div>}
  </section>
}
