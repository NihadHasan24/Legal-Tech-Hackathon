import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../services/api.js'
import { Badge, Bi, Panel, Term, bi, num, tr } from '../components/Bi.jsx'

const shown = (value) => value || <Term code="NOT_RECORDED" />
// A matching detail is the warning sign here, so it gets the red badge.
const compare = { MATCH: ' warn-badge', SIMILAR: ' wait-badge', DIFFERENT: '' }

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
      setNotice(bi('Review saved. Both records stay separate.', 'পর্যালোচনা সংরক্ষিত। দুটি রেকর্ড আলাদাই থাকবে।'))
      setRefresh((value) => value + 1)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  const open = candidates?.filter(({ reviewStatus }) => reviewStatus === 'OPEN').length ?? 0
  const hint = candidates && (candidates.length === 0 ? bi('None', 'নেই') : open ? bi(`${open} to review`, `${num(open)}টি পর্যালোচনা বাকি`) : bi(`${candidates.length} reviewed`, `${num(candidates.length)}টি পর্যালোচিত`))

  return <Panel id="duplicate-title" en="Possible duplicates" bn="সম্ভাব্য দ্বৈত আবেদন" hint={hint}>
    <p className="muted"><Bi en="Shows similarity only, not proof. Records are never merged." bn="শুধু মিল দেখায়, প্রমাণ নয়। রেকর্ড কখনো একীভূত হয় না।" /></p>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    {candidates === null && !error && <p role="status">{bi('Checking…', 'যাচাই হচ্ছে…')}</p>}
    {candidates?.length === 0 && <p><Bi en="No similar records in this office." bn="এই অফিসে মিলে যায় এমন রেকর্ড নেই।" /></p>}
    <div className="stack">{candidates?.map((candidate) => <article className="mini-card duplicate-card" key={candidate.applicationId}>
      <h3><Link to={`/applications/${candidate.applicationId}`}>{tr(candidate.applicantName)} · {candidate.applicationId}</Link></h3>
      <p className="score"><label htmlFor={`score-${candidate.applicationId}`}><Bi en="Similarity" bn="মিল" /></label> <meter id={`score-${candidate.applicationId}`} min="0" max="100" low="40" high="75" optimum="0" value={candidate.score} /> <strong>{num(`${candidate.score}/100`)}</strong> {candidate.reviewStatus !== 'OPEN' && <Badge code={candidate.reviewStatus} />}</p>
      <div className="table-wrap"><table>
        <caption className="visually-hidden">{bi(`${applicationId} compared with ${candidate.applicationId}`, 'পাশাপাশি তুলনা')}</caption>
        <thead><tr><th scope="col"><Bi en="Detail" bn="তথ্য" /></th><th scope="col"><Bi en="This record" bn="এই রেকর্ড" /></th><th scope="col"><Bi en="Other" bn="অন্যটি" /></th><th scope="col"><Bi en="Result" bn="ফল" /></th></tr></thead>
        <tbody>{candidate.attributes.map((attribute) => <tr key={attribute.label}>
          <th scope="row"><Term code={attribute.label} /></th><td>{tr(shown(attribute.currentValue))}</td><td>{tr(shown(attribute.candidateValue))}</td>
          <td><span className={attribute.comparison in compare ? `badge${compare[attribute.comparison]}` : 'muted'}><Term code={attribute.comparison} /></span></td>
        </tr>)}</tbody>
      </table></div>
      {candidate.reviewStatus === 'OPEN' ? <>
        <label htmlFor={`duplicate-reason-${candidate.applicationId}`}><Bi en="Review reason" bn="পর্যালোচনার কারণ" /></label>
        <textarea id={`duplicate-reason-${candidate.applicationId}`} value={reasons[candidate.applicationId] || ''} onChange={(event) => setReasons((current) => ({ ...current, [candidate.applicationId]: event.target.value }))} minLength="10" maxLength="1000" required />
        <div className="choice-row">
          <button type="button" disabled={busy || (reasons[candidate.applicationId] || '').trim().length < 10} onClick={() => review(candidate, 'CONFIRMED_DUPLICATE')}><Bi en="Same person (keep separate)" bn="একই ব্যক্তি (আলাদা থাকবে)" /></button>
          <button type="button" className="secondary-button" disabled={busy || (reasons[candidate.applicationId] || '').trim().length < 10} onClick={() => review(candidate, 'NOT_DUPLICATE')}><Bi en="Different people" bn="ভিন্ন ব্যক্তি" /></button>
        </div>
      </> : <p role="status"><Term code={candidate.reviewStatus} />{candidate.reviewReason ? ` · ${candidate.reviewReason}` : ''}</p>}
    </article>)}</div>
  </Panel>
}
