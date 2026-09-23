import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { AddForm, Badge, Bi, Panel, Term, bi, num, say, tr, when } from '../components/Bi.jsx'

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
  const overdue = referrals.referrals.some(({ overdue: late }) => late)
  const eligible = receivers.filter((item) => item.officeCode !== officeCode && (decided?.route !== 'REFER' || item.officeCode === decided.officeCode))
  const offices = [...new Set(receivers.map((item) => item.officeCode).filter((code) => code !== officeCode))]
  const standard = documents.filter((item) => item.sensitivity === 'STANDARD')
  const restricted = documents.filter((item) => item.sensitivity === 'RESTRICTED' && !item.redacted)
  const blocked = !accepted ? bi('Accept the application first.', 'আগে আবেদন গ্রহণ করুন।')
    : referrals.escalation ? bi('Further transfers are blocked until the route is decided above.', 'উপরে পথ ঠিক না হওয়া পর্যন্ত আর পাঠানো যাবে না।')
      : waiting ? bi('A referral is still waiting for the other office.', 'একটি রেফারেল এখনো অন্য অফিসের অপেক্ষায়।')
        : decided?.route === 'RETAIN' ? bi('Route decision: keep in this office.', 'পথের সিদ্ধান্ত: এই অফিসেই থাকবে।') : ''
  const latest = referrals.referrals.at(-1)
  const hint = referrals.escalation ? bi('Route decision needed', 'পথের সিদ্ধান্ত দরকার') : latest ? `${latest.receivingOfficeCode} · ${say(latest.status)}` : bi('None', 'নেই')

  async function send(event) {
    event.preventDefault()
    const result = await change(`/api/applications/${applicationId}/referrals`, {
      responsibleUserId, reason, history, expectedAction, dueAt: new Date(dueAt).toISOString(), documentIds, sensitiveDocumentIds: sensitiveIds,
      ...(sensitiveIds.length ? { sensitiveAccessReason: sensitiveReason } : {}),
    }, bi('Referral sent. The other office must acknowledge by the deadline.', 'রেফারেল পাঠানো হয়েছে। সময়ের মধ্যে প্রাপ্তি স্বীকার করতে হবে।'))
    if (result) { setReason(''); setHistory(''); setExpectedAction(''); setDocumentIds([]); setSensitiveIds([]); setSensitiveReason('') }
  }

  async function decide(event) {
    event.preventDefault()
    const result = await change(`/api/applications/${applicationId}/routing-decision`, { route, ...(route === 'REFER' ? { officeCode: routeOffice } : {}), reason: routeReason }, bi('Route decision saved.', 'পথের সিদ্ধান্ত সংরক্ষিত।'))
    if (result) setRouteReason('')
  }

  return <Panel id="referral-title" en="Referral" bn="রেফারেল" hint={hint} open={Boolean(referrals.escalation) || overdue}>
    <p className="muted"><Bi en={`Returns: ${referrals.returns} of ${referrals.threshold}. At ${referrals.threshold}, an officer decides the route.`} bn={`ফেরত: ${num(referrals.threshold)}-এর মধ্যে ${num(referrals.returns)}। ${num(referrals.threshold)} হলে একজন কর্মকর্তা পথ ঠিক করবেন।`} /></p>
    {error && <p role="alert" className="error">{error}</p>}

    {referrals.escalation && <section className="escalation-box" aria-labelledby="escalation-title">
      <h3 id="escalation-title"><Term code={referrals.escalation.title} /></h3>
      <p>{tr(referrals.escalation.nextAction)}</p>
      <form onSubmit={decide} className="form-stack">
        <label htmlFor="route-choice"><Bi en="Route" bn="পথ" /></label>
        <select id="route-choice" value={route} onChange={(event) => setRoute(event.target.value)}><option value="REFER">{say('REFER')}</option><option value="RETAIN">{say('RETAIN')}</option></select>
        {route === 'REFER' && <><label htmlFor="route-office"><Bi en="Office that must act" bn="যে অফিস কাজ করবে" /></label><select id="route-office" value={routeOffice} onChange={(event) => setRouteOffice(event.target.value)} required><option value="">{bi('Choose', 'বাছাই করুন')}</option>{offices.map((code) => <option key={code} value={code}>{code}</option>)}</select></>}
        <label htmlFor="route-reason"><Bi en="Reason" bn="কারণ" /></label>
        <textarea id="route-reason" value={routeReason} onChange={(event) => setRouteReason(event.target.value)} minLength="10" maxLength="1000" required />
        <button type="submit"><Bi en="Save route decision" bn="পথের সিদ্ধান্ত সংরক্ষণ" /></button>
      </form>
    </section>}
    {decided && <p><Bi en="Route decision:" bn="পথের সিদ্ধান্ত:" /> <strong>{decided.route === 'REFER' ? `${say('REFER')}: ${decided.officeCode}` : say('RETAIN')}</strong> · {decided.reason} · {when(decided.decidedAt)}</p>}

    {referrals.referrals.length === 0 ? <p><Bi en="No referrals sent." bn="কোনো রেফারেল পাঠানো হয়নি।" /></p> : <ol className="timeline compact">{referrals.referrals.map((item) => <li key={item.id}>
      <strong>{item.receivingOfficeCode}</strong> <Badge code={item.status} />{item.overdue && <> <span className="badge warn-badge"><Bi en="Acknowledgement overdue" bn="প্রাপ্তি স্বীকার বাকি" /></span></>}
      <p>{item.expectedAction}</p>
      {item.responseReason && <p><Bi en="Reply:" bn="উত্তর:" /> {item.responseReason}</p>}
      <small>{when(item.createdAt)} · {item.responsibleName} · <Bi en="acknowledge by" bn="প্রাপ্তি স্বীকারের শেষ সময়" /> {when(item.dueAt)} · <Bi en={`${item.documentCount} documents, ${item.restrictedEvidenceCount} restricted`} bn={`${num(item.documentCount)}টি নথি, ${num(item.restrictedEvidenceCount)}টি সীমিত`} />{item.acknowledgedAt ? ` · ${bi('acknowledged', 'স্বীকৃত')} ${when(item.acknowledgedAt)}` : ''}</small>
    </li>)}</ol>}

    {blocked ? <p className="muted">{blocked}</p> : <AddForm en="Send referral" bn="রেফারেল পাঠান">
      <form onSubmit={send} className="form-stack inline-form">
        <label htmlFor="referral-receiver"><Bi en="Receiving officer" bn="গ্রহণকারী কর্মকর্তা" /></label>
        <select id="referral-receiver" value={responsibleUserId} onChange={(event) => setResponsibleUserId(event.target.value)} required><option value="">{bi('Choose', 'বাছাই করুন')}</option>{eligible.map((item) => <option key={item.userId} value={item.userId}>{item.displayName} · {item.officeCode}</option>)}</select>
        <label htmlFor="referral-reason"><Bi en="Referral reason" bn="রেফারেলের কারণ" /></label>
        <textarea id="referral-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength="10" maxLength="1000" required />
        <label htmlFor="referral-history"><Bi en="Relevant history" bn="প্রাসঙ্গিক ইতিহাস" /></label>
        <textarea id="referral-history" value={history} onChange={(event) => setHistory(event.target.value)} minLength="10" maxLength="2000" required />
        <label htmlFor="referral-action"><Bi en="Expected action" bn="প্রত্যাশিত পদক্ষেপ" /></label>
        <input id="referral-action" value={expectedAction} onChange={(event) => setExpectedAction(event.target.value)} minLength="5" maxLength="300" required />
        <label htmlFor="referral-due"><Bi en="Acknowledge by" bn="প্রাপ্তি স্বীকারের শেষ সময়" /></label>
        <input id="referral-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required />
        {standard.length > 0 && <fieldset><legend><Bi en="Documents to include" bn="যে নথি যাবে" /></legend>{standard.map((item) => <label key={item.id} className="checkbox-label"><input type="checkbox" checked={documentIds.includes(item.id)} onChange={() => setDocumentIds(toggle(documentIds, item.id))} />{item.label}</label>)}</fieldset>}
        {restricted.length > 0 && <fieldset><legend><Bi en="Restricted evidence (only if needed)" bn="সীমিত প্রমাণ (প্রয়োজন হলেই)" /></legend>{restricted.map((item) => <label key={item.id} className="checkbox-label"><input type="checkbox" checked={sensitiveIds.includes(item.id)} onChange={() => setSensitiveIds(toggle(sensitiveIds, item.id))} />{item.label}</label>)}
          {sensitiveIds.length > 0 && <><label htmlFor="referral-sensitive-reason"><Bi en="Why this restricted evidence must be shared" bn="কেন এই সীমিত প্রমাণ পাঠাতেই হবে" /></label><textarea id="referral-sensitive-reason" value={sensitiveReason} onChange={(event) => setSensitiveReason(event.target.value)} minLength="10" maxLength="500" required /></>}
        </fieldset>}
        <p className="muted"><Bi en="Only the named officer can open restricted items; each opening is logged. Contact rules go with it, the number does not." bn="সীমিত নথি শুধু নির্দিষ্ট কর্মকর্তা খুলতে পারবেন, প্রতিবার লগ হয়। যোগাযোগের নিয়ম যায়, নম্বর যায় না।" /></p>
        <button type="submit"><Bi en="Send referral" bn="রেফারেল পাঠান" /></button>
      </form>
    </AddForm>}
  </Panel>
}
