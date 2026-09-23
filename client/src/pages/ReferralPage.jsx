import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../services/api.js'
import { Badge, Bi, Term, bi, num, say, tr, when } from '../components/Bi.jsx'

export default function ReferralPage({ session }) {
  const { referralId } = useParams()
  const [data, setData] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [decision, setDecision] = useState('ACCEPT')
  const [reason, setReason] = useState('')
  const [opened, setOpened] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/referrals/${referralId}`, { token: session.token, signal: controller.signal })
      .then(setData).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [referralId, refresh, session.token])

  async function respond(body, success) {
    setError('')
    setNotice('')
    try {
      await api(`/api/referrals/${referralId}/respond`, { token: session.token, method: 'POST', body })
      setNotice(success)
      setReason('')
      setRefresh((value) => value + 1)
    } catch (failure) { setError(failure.message) }
  }

  async function open(document) {
    setError('')
    try { setOpened(await api(`/api/documents/${document.id}`, { token: session.token })) } catch (failure) { setError(failure.message) }
  }

  function submitResponse(event) {
    event.preventDefault()
    respond({ action: decision, reason }, decision === 'ACCEPT' ? bi('Referral accepted. The sending office can see this.', 'রেফারেল গৃহীত। প্রেরক অফিস দেখতে পাবে।') : bi('Referral returned with your reason.', 'কারণসহ রেফারেল ফেরত পাঠানো হয়েছে।'))
  }

  const live = data && data.status !== 'RETURNED'
  return <section aria-labelledby="referral-title">
    <Link to="/">← <Bi en="Workspace" bn="কর্মক্ষেত্র" /></Link>
    <div className="record-head">
      <div><p className="eyebrow"><Bi en="Referral" bn="রেফারেল" />{data ? ` · ${data.sendingOfficeCode} → ${data.receivingOfficeCode}` : ''}</p><h1 id="referral-title">{data?.caseId ?? bi('Referral', 'রেফারেল')}</h1></div>
      {data && <span><Badge code={data.status} />{data.overdue && <> <span className="badge warn-badge"><Bi en="Acknowledgement overdue" bn="প্রাপ্তি স্বীকার বাকি" /></span></>}</span>}
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    {!error && !data && <p role="status">{bi('Loading…', 'লোড হচ্ছে…')}</p>}
    {data && <>
      <div className="summary-grid">
        <section className="card" aria-labelledby="package-title"><h2 id="package-title"><Bi en="Package" bn="প্যাকেজ" /></h2><dl className="details compact">
          <div><dt><Bi en="Applicant" bn="আবেদনকারী" /></dt><dd>{tr(data.applicantName)} · {data.applicationId}</dd></div>
          <div><dt><Bi en="Responsible" bn="দায়িত্বে" /></dt><dd>{data.responsibleName}{data.responsible ? ` (${bi('you', 'আপনি')})` : ''}</dd></div>
          <div><dt><Bi en="Sent by" bn="পাঠিয়েছেন" /></dt><dd>{data.sentByName} · {data.sendingOfficeCode} · {when(data.createdAt)}</dd></div>
          <div><dt><Bi en="Acknowledge by" bn="প্রাপ্তি স্বীকারের শেষ সময়" /></dt><dd>{when(data.dueAt)}{data.acknowledgedAt ? ` · ${bi('acknowledged', 'স্বীকৃত')} ${when(data.acknowledgedAt)}` : ''}</dd></div>
          <div><dt><Bi en="Reason" bn="কারণ" /></dt><dd>{data.reason}</dd></div>
          <div><dt><Bi en="History" bn="ইতিহাস" /></dt><dd>{data.history}</dd></div>
          <div><dt><Bi en="Expected action" bn="প্রত্যাশিত পদক্ষেপ" /></dt><dd>{data.expectedAction}</dd></div>
          {data.responseReason && <div><dt><Bi en="Your reply" bn="আপনার উত্তর" /></dt><dd>{data.responseReason}</dd></div>}
        </dl></section>
        <section className="card safety-card" aria-labelledby="referral-safe-title"><h2 id="referral-safe-title"><Bi en="Safe contact" bn="নিরাপদ যোগাযোগ" /></h2>
          {!data.safeContact ? <p><Bi en="No safe route recorded. Do not contact until the sending office confirms one." bn="কীভাবে নিরাপদে যোগাযোগ করা যাবে, তা নথিতে নেই। প্রেরক অফিস নিশ্চিত না করা পর্যন্ত আবেদনকারীর সঙ্গে যোগাযোগ করবেন না।" /></p> : <dl className="details compact">
            <div><dt><Bi en="Use" bn="ব্যবহার করুন" /></dt><dd>{data.safeContact.allowedChannels.map(say).join(', ') || bi('None', 'নেই')}</dd></div>
            <div><dt><Bi en="Never use" bn="কখনো নয়" /></dt><dd>{data.safeContact.prohibitedChannels.map(say).join(', ') || bi('None', 'নেই')}</dd></div>
            <div><dt><Bi en="Safe time" bn="নিরাপদ সময়" /></dt><dd>{data.safeContact.safeTimeWindow || bi('Not recorded', 'লেখা নেই')}</dd></div>
            <div><dt><Bi en="Neutral words" bn="নিরপেক্ষ কথা" /></dt><dd>{data.safeContact.neutralWordingRequired ? bi('Required', 'বাধ্যতামূলক') : bi('Not required', 'বাধ্যতামূলক নয়')}</dd></div>
            <div><dt><Bi en="If someone else answers" bn="অন্য কেউ ধরলে" /></dt><dd><Term code={data.safeContact.unknownAnswerAction} /></dd></div>
          </dl>}
        </section>
      </div>

      <section className="card" aria-labelledby="referral-docs-title"><h2 id="referral-docs-title"><Bi en="Documents and evidence" bn="নথি ও প্রমাণ" /></h2>
        {data.documents.length === 0 ? <p><Bi en="No documents shared with you." bn="আপনাকে দেখার জন্য কোনো নথি দেওয়া হয়নি।" /></p> : <ul className="plain-list">{data.documents.map((item) => <li key={item.id}><div><strong>{item.label}</strong> <Badge code={item.sensitivity} /><p className="muted"><Bi en="Version" bn="সংস্করণ" /> {num(item.currentVersion)}{item.sensitivity === 'RESTRICTED' ? ` · ${bi('opening is logged', 'প্রতিবার দেখার তথ্য সংরক্ষিত হয়')}` : ''}</p></div>{data.responsible && live && <button type="button" className="secondary-button" onClick={() => open(item)} aria-label={bi(`Open ${item.label}`, `${item.label} খুলুন`)}><Bi en="Open" bn="খুলুন" /></button>}</li>)}</ul>}
        {data.restrictedEvidenceCount > 0 && !data.documents.some((item) => item.sensitivity === 'RESTRICTED') && <p className="muted"><Bi en={`${data.restrictedEvidenceCount} restricted item(s): named officer only.`} bn={`${num(data.restrictedEvidenceCount)}টি সীমিত প্রমাণ: শুধু নির্দিষ্ট কর্মকর্তার জন্য।`} /></p>}
        {opened && <div className="version-history" role="status"><h3>{opened.label}</h3><p><Bi en="Version" bn="সংস্করণ" /> {num(opened.currentVersion)} · <Term code={opened.version?.qualityState} />{opened.version?.note ? ` · ${opened.version.note}` : ''}</p></div>}
      </section>

      {data.previousReturns.length > 0 && <section className="card" aria-labelledby="returns-title"><h2 id="returns-title"><Bi en="Earlier returns of this case" bn="আগে যতবার ফেরত এসেছে" /></h2><ol className="timeline compact">{data.previousReturns.map((item, index) => <li key={index}><strong>{item.receivingOfficeCode}</strong> <small>{when(item.respondedAt)}</small><p>{item.reason}</p></li>)}</ol></section>}

      <section className="card" aria-labelledby="respond-title"><h2 id="respond-title"><Bi en="Your office's response" bn="আপনার অফিসের উত্তর" /></h2>
        <p className="muted"><Bi en="Acknowledge = received. Accept = your office will act. Repeated returns go to an officer who decides the route." bn="প্রাপ্তি স্বীকার মানে আপনার অফিস রেফারেলটি পেয়েছে। গ্রহণ করলে আপনার অফিস ব্যবস্থা নেবে। বারবার ফেরত এলে কোন অফিসে যাবে, তা একজন কর্মকর্তা ঠিক করবেন।" /></p>
        {data.status === 'SENT' && <button type="button" onClick={() => respond({ action: 'ACKNOWLEDGE' }, bi('Receipt acknowledged. The sending office can see this.', 'প্রাপ্তি স্বীকার করা হয়েছে। প্রেরক অফিস দেখতে পাবে।'))}><Bi en="Acknowledge receipt" bn="প্রাপ্তি স্বীকার" /></button>}
        {(data.status === 'SENT' || data.status === 'ACKNOWLEDGED') ? <form onSubmit={submitResponse} className="form-stack inline-form">
          <label htmlFor="referral-decision"><Bi en="Decision" bn="সিদ্ধান্ত" /></label>
          <select id="referral-decision" value={decision} onChange={(event) => setDecision(event.target.value)}><option value="ACCEPT">{bi('Accept the referral', 'রেফারেল গ্রহণ')}</option><option value="RETURN">{bi('Return to the sending office', 'প্রেরক অফিসে ফেরত')}</option></select>
          <label htmlFor="referral-response-reason"><Bi en="Response reason" bn="উত্তরের কারণ" /></label>
          <textarea id="referral-response-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength="10" maxLength="1000" required />
          <button type="submit"><Bi en="Record response" bn="উত্তর সংরক্ষণ" /></button>
        </form> : <p><Bi en="Response recorded:" bn="আপনার অফিসের সিদ্ধান্ত নথিভুক্ত হয়েছে:" /> <Term code={data.status} /> · {when(data.respondedAt)}</p>}
      </section>
    </>}
  </section>
}
