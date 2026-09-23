import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../services/api.js'
import { Badge, Bi, Term, bi, num, when } from '../components/Bi.jsx'

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
      decision === 'ACCEPT' ? bi('Assignment accepted.', 'নিয়োগ গ্রহণ করা হয়েছে।') : bi('Assignment declined. The DLAO has been told.', 'নিয়োগ প্রত্যাখ্যাত। ডিএলএও জানতে পারবেন।'))
  }

  function submitUpdate(event, update) {
    event.preventDefault()
    const draft = drafts[update._id] || {}
    send(`/api/lawyers/assignments/${record.assignmentId}/updates/${update._id}`, draft,
      bi(`Progress update ${num(update.sequence)} recorded.`, 'অগ্রগতির আপডেট লেখা হয়েছে।'))
  }

  const back = <Link to="/">← <Bi en="Lawyer worklist" bn="আইনজীবীর কাজের তালিকা" /></Link>
  if (!record) return <section aria-labelledby="case-title">{back}<h1 id="case-title">{caseId}</h1>{error ? <p role="alert" className="error">{error}</p> : <p role="status">{bi('Loading…', 'লোড হচ্ছে…')}</p>}</section>

  const pending = record.assignmentStatus === 'PENDING'
  const openUpdates = (record.updates || []).filter(({ status }) => status === 'PENDING' || status === 'MISSED')

  return <section aria-labelledby="case-title">
    {back}
    <div className="record-head">
      <div><p className="eyebrow"><Bi en="Assigned case" bn="নিযুক্ত মামলা" /></p><h1 id="case-title">{record.caseId}</h1><p className="record-sub"><Bi en="Application" bn="আবেদন" /> {record.applicationId}</p></div>
      <Badge code={record.assignmentStatus} />
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    <section className="card" aria-labelledby="summary-title">
      <h2 id="summary-title"><Bi en="At a glance" bn="এক নজরে" /></h2>
      <dl className="facts">
        <div><dt><Bi en="Case status" bn="মামলার অবস্থা" /></dt><dd><Term code={record.status} /></dd></div>
        <div><dt><Bi en="Your assignment" bn="আপনার নিয়োগ" /></dt><dd><Term code={record.assignmentStatus} /></dd></div>
        {!pending && <><div><dt><Bi en="Next hearing" bn="পরবর্তী শুনানি" /></dt><dd>{record.nextHearingAt ? <time dateTime={record.nextHearingAt}>{when(record.nextHearingAt)}</time> : bi('Not set', 'নির্ধারিত নয়')}</dd></div><div className="wide"><dt><Bi en="Next step" bn="পরবর্তী ধাপ" /></dt><dd>{record.nextAction || bi('Not set', 'নির্ধারিত নয়')}</dd></div></>}
      </dl>
    </section>

    {pending && <section className="card" aria-labelledby="decision-title"><h2 id="decision-title"><Bi en="Respond to assignment offer" bn="নিয়োগ প্রস্তাবে উত্তর দিন" /></h2><p className="muted"><Bi en="It is not your case until you accept." bn="গ্রহণ না করা পর্যন্ত মামলাটি আপনার নয়।" /></p>
      <label htmlFor="assignment-response-reason"><Bi en="Reason for accepting or declining" bn="গ্রহণ বা প্রত্যাখ্যানের কারণ" /></label><textarea id="assignment-response-reason" value={responseReason} onChange={(event) => setResponseReason(event.target.value)} minLength="10" maxLength="500" required />
      <div className="choice-row"><button type="button" disabled={busy || responseReason.trim().length < 10} onClick={() => respond('ACCEPT')}><Bi en="Accept assignment" bn="নিয়োগ গ্রহণ" /></button><button type="button" className="secondary-button" disabled={busy || responseReason.trim().length < 10} onClick={() => respond('DECLINE')}><Bi en="Decline" bn="প্রত্যাখ্যান" /></button></div>
    </section>}

    {!pending && <div className="card panels">
      <section className="panel" aria-labelledby="updates-title"><div className="panel-body"><h2 id="updates-title" className="panel-heading"><Bi en="Required progress updates" bn="প্রয়োজনীয় অগ্রগতির আপডেট" /></h2>
        {openUpdates.length === 0 ? <p className="muted"><Bi en="Nothing due." bn="কোনো আপডেট বাকি নেই।" /></p> : <ul className="plain-list">{openUpdates.map((update) => {
          const draft = drafts[update._id] || {}
          return <li key={update._id}><div><strong><Bi en="Update" bn="আপডেট" /> {num(update.sequence)}</strong> <Badge code={update.status} /><p>{update.instruction}</p><small><Bi en="Due" bn="শেষ সময়" /> {when(update.dueAt)}</small>
            <form onSubmit={(event) => submitUpdate(event, update)} className="form-stack inline-form">
              <label htmlFor={`lawyer-report-${update._id}`}><Bi en="Progress report" bn="অগ্রগতির প্রতিবেদন" /></label><textarea id={`lawyer-report-${update._id}`} value={draft.report || ''} onChange={(event) => setDrafts((current) => ({ ...current, [update._id]: { ...current[update._id], report: event.target.value } }))} minLength="5" maxLength="2000" required />
              <label htmlFor={`lawyer-next-${update._id}`}><Bi en="Next step" bn="পরবর্তী ধাপ" /></label><input id={`lawyer-next-${update._id}`} value={draft.nextAction || ''} onChange={(event) => setDrafts((current) => ({ ...current, [update._id]: { ...current[update._id], nextAction: event.target.value } }))} minLength="5" maxLength="300" required />
              <button type="submit" disabled={busy}><Bi en="Submit progress update" bn="আপডেট জমা দিন" /></button>
            </form>
          </div></li>
        })}</ul>}
        {(record.updates || []).filter(({ report }) => report).map((update) => <div className="version-history" key={update._id}><h3><Bi en="Update" bn="আপডেট" /> {num(update.sequence)} <Badge code={update.status} /></h3><p>{update.report}</p><p><Bi en="Next step:" bn="পরবর্তী ধাপ:" /> {update.nextAction}</p><small>{when(update.submittedAt)}</small></div>)}
      </div></section>

      <section className="panel" aria-labelledby="documents-title"><div className="panel-body"><h2 id="documents-title" className="panel-heading"><Bi en="Documents" bn="নথি" /></h2><p className="muted"><Bi en="Restricted evidence is not shown here." bn="সীমিত প্রমাণ এখানে দেখানো হয় না।" /></p>
        {!record.documents?.length ? <p><Bi en="No documents linked." bn="কোনো নথি যুক্ত নেই।" /></p> : <ul className="plain-list">{record.documents.map((document) => <li key={document.id}><div><strong>{document.label}</strong> {document.version?.qualityState && <Badge code={document.version.qualityState} />}<p className="muted"><Bi en="Version" bn="সংস্করণ" /> {num(document.currentVersion)}</p>{document.version?.qualityState === 'READABLE' && <details><summary><Bi en="Read linked document text" bn="নথির লেখা পড়ুন" /></summary><pre>{document.version.textContent || bi('No readable text stored.', 'পড়ার মতো লেখা নেই।')}</pre></details>}{document.version?.qualityState === 'UNREADABLE' && <p><Bi en="Unreadable: a person must check it." bn="অপাঠযোগ্য: একজনকে যাচাই করতে হবে।" /></p>}</div></li>)}</ul>}
      </div></section>

      <section className="panel" aria-labelledby="payment-read-title"><div className="panel-body"><h2 id="payment-read-title" className="panel-heading"><Bi en="Payment status" bn="পেমেন্টের অবস্থা" /></h2><p className="muted"><Bi en="Status only. No money moves here." bn="শুধু অবস্থা। এখানে টাকা লেনদেন হয় না।" /></p>{record.payment ? <p><Term code={record.payment.stage} /> · <Badge code={record.payment.status} /> · {record.payment.reason}</p> : <p><Bi en="Nothing recorded." bn="কিছু লেখা নেই।" /></p>}</div></section>
    </div>}
  </section>
}
