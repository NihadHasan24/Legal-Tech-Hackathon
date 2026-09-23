import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { AddForm, Badge, Bi, Panel, Term, bi, num, say, when } from '../components/Bi.jsx'

const localDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function LawyerManagement({ applicationId, token, onChanged }) {
  const [data, setData] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [planReason, setPlanReason] = useState('')
  const [lawyerUserId, setLawyerUserId] = useState('')
  const [assignmentReason, setAssignmentReason] = useState('')
  const [changeRequestId, setChangeRequestId] = useState('')
  const [reviewReasons, setReviewReasons] = useState({})
  const [holdReasons, setHoldReasons] = useState({})
  const [paymentStage, setPaymentStage] = useState('CASE_PREPARATION')
  const [paymentStatus, setPaymentStatus] = useState('SUBMITTED')
  const [paymentReason, setPaymentReason] = useState('')
  const [paymentAssignmentId, setPaymentAssignmentId] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/lawyers/applications/${applicationId}`, { token, signal: controller.signal })
      .then(setData).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [applicationId, token, refresh])

  async function mutate(path, body, success) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api(path, { token, method: 'POST', body })
      setNotice(success)
      setRefresh((value) => value + 1)
      onChanged()
      return true
    } catch (failure) { setError(failure.message); return false } finally { setBusy(false) }
  }

  async function savePlan(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const hearingAt = form.get('nextHearingAt')
    if (await mutate(`/api/lawyers/applications/${applicationId}/case-plan`, {
      nextHearingAt: hearingAt ? new Date(hearingAt).toISOString() : null, nextAction: form.get('nextAction'), reason: form.get('reason'),
    }, bi('Hearing and next step saved.', 'শুনানি ও পরবর্তী ধাপ সংরক্ষিত।'))) setPlanReason('')
  }

  async function offerAssignment(event) {
    event.preventDefault()
    if (await mutate(`/api/lawyers/applications/${applicationId}/assignments`, {
      lawyerUserId, reason: assignmentReason, ...(changeRequestId ? { changeRequestId } : {}),
    }, bi('Offer sent. It starts when the lawyer accepts.', 'প্রস্তাব পাঠানো হয়েছে। আইনজীবী গ্রহণ করলে শুরু হবে।'))) setAssignmentReason('')
  }

  async function schedule(event) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(event.currentTarget)
    if (await mutate(`/api/lawyers/applications/${applicationId}/update-schedules`, {
      assignmentId: form.get('assignmentId'), dueAt: new Date(form.get('dueAt')).toISOString(), instruction: form.get('instruction'),
    }, bi('Update scheduled.', 'আপডেট নির্ধারিত।'))) target.reset()
  }

  function reviewRequest(requestId, decision) {
    mutate(`/api/lawyers/applications/${applicationId}/change-requests/${requestId}/review`, {
      decision, reason: reviewReasons[requestId] || '',
    }, decision === 'APPROVE'
      ? bi('Request approved. Offer a new lawyer separately.', 'অনুরোধ অনুমোদিত। নতুন আইনজীবী আলাদাভাবে প্রস্তাব করুন।')
      : bi('Request declined with reason.', 'কারণসহ অনুরোধ প্রত্যাখ্যাত।'))
  }

  function reviewHold(lawyerId, decision) {
    mutate(`/api/lawyers/holds/${lawyerId}/review`, { decision, reason: holdReasons[lawyerId] || '' },
      decision === 'LIFT' ? bi('Hold lifted. Current cases unchanged.', 'স্থগিতাদেশ তোলা হয়েছে। চলমান মামলা অপরিবর্তিত।') : bi('Hold continued. Current cases unchanged.', 'স্থগিতাদেশ বহাল। চলমান মামলা অপরিবর্তিত।'))
  }

  async function recordPayment(event) {
    event.preventDefault()
    const assignment = data.assignments.find(({ id }) => id === (paymentAssignmentId || paymentAssignments[0]?.id))
    if (!assignment) return
    if (await mutate(`/api/lawyers/assignments/${assignment.id}/payment-status`, { stage: paymentStage, status: paymentStatus, reason: paymentReason },
      bi('Payment status saved. No money moved.', 'পেমেন্টের অবস্থা সংরক্ষিত। কোনো টাকা লেনদেন হয়নি।'))) setPaymentReason('')
  }

  const activeAssignments = data?.assignments.filter(({ active, status }) => active && status === 'ACCEPTED') ?? []
  const paymentAssignments = data?.assignments.filter(({ status }) => status === 'ACCEPTED' || status === 'REASSIGNED') ?? []
  const pendingAssignments = data?.assignments.filter(({ active, status }) => active && status === 'PENDING') ?? []
  const approvedRequests = data?.changeRequests.filter(({ status }) => status === 'APPROVED') ?? []
  const openRequests = data?.changeRequests.filter(({ status }) => status === 'OPEN') ?? []
  const holds = data?.panelLawyers.filter(({ hold }) => hold?.newAssignmentHold) ?? []
  const hint = activeAssignments[0]?.lawyerName ?? (pendingAssignments.length ? bi('Offer pending', 'প্রস্তাব অপেক্ষমাণ') : data && bi('No lawyer yet', 'এখনো আইনজীবী নেই'))

  return <Panel id="lawyer-title" en="Lawyer" bn="আইনজীবী" hint={hint} open={holds.length > 0 || openRequests.length > 0}>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    {!data && !error && <p role="status">{bi('Loading…', 'লোড হচ্ছে…')}</p>}
    {data && <>
      {holds.map(({ id, displayName, hold }) => <section className="escalation-box" key={id} aria-label={bi('Lawyer assignment hold', 'আইনজীবী নিয়োগ স্থগিত')}>
        <h3><Bi en="New assignments on hold: review needed" bn="নতুন নিয়োগ স্থগিত: পর্যালোচনা দরকার" /></h3>
        <p>{displayName}: <Bi en="missed 2 updates in a row. Current cases continue. No misconduct finding." bn="পরপর ২টি আপডেট দেননি। চলমান মামলা চলবে। এটি অসদাচরণের সিদ্ধান্ত নয়।" /></p>
        <p className="muted"><Term code={hold.reviewerRole} /> · <Term code={hold.reviewState} /> · <Bi en="Demo reviewer; legal authority not yet confirmed." bn="ডেমো পর্যালোচক; আইনি কর্তৃপক্ষ এখনো নিশ্চিত নয়।" /></p>
        {hold.reviewReason && <p><Bi en="Last reason:" bn="শেষ কারণ:" /> {hold.reviewReason}</p>}
        <label htmlFor={`hold-reason-${id}`}><Bi en="Hold review reason" bn="পর্যালোচনার কারণ" /></label>
        <textarea id={`hold-reason-${id}`} value={holdReasons[id] || ''} onChange={(event) => setHoldReasons((current) => ({ ...current, [id]: event.target.value }))} minLength="10" maxLength="500" />
        <div className="choice-row"><button type="button" disabled={busy || (holdReasons[id] || '').trim().length < 10} onClick={() => reviewHold(id, 'LIFT')}><Bi en="Lift hold" bn="স্থগিতাদেশ তুলুন" /></button><button type="button" className="secondary-button" disabled={busy || (holdReasons[id] || '').trim().length < 10} onClick={() => reviewHold(id, 'CONTINUE')}><Bi en="Continue hold" bn="বহাল রাখুন" /></button></div>
      </section>)}

      <div className="block"><h3 id="assignment-title"><Bi en="Assigned lawyer" bn="নিযুক্ত আইনজীবী" /></h3>
        {data.assignments.length === 0 ? <p className="muted"><Bi en="No lawyer yet." bn="এখনো আইনজীবী নেই।" /></p> : <ul className="plain-list">{data.assignments.map((item) => <li key={item.id}><div><strong>{item.lawyerName}</strong> <Badge code={item.status} />{!item.active && <small className="muted"> · <Bi en="past" bn="আগের" /></small>}{item.hold && <p><small><Bi en="Hold" bn="স্থগিত" />: <Term code={item.hold.reviewState} /></small></p>}</div></li>)}</ul>}
        {pendingAssignments.length > 0 && <p role="status"><Bi en="Waiting for the lawyer to accept or decline." bn="আইনজীবীর উত্তরের অপেক্ষা।" /></p>}
        <AddForm en="Offer to a lawyer" bn="আইনজীবীকে প্রস্তাব দিন">
          <form onSubmit={offerAssignment} className="form-stack inline-form">
            <label htmlFor="panel-lawyer"><Bi en="Panel lawyer" bn="প্যানেল আইনজীবী" /></label><select id="panel-lawyer" value={lawyerUserId} onChange={(event) => setLawyerUserId(event.target.value)} required><option value="">{bi('Choose', 'বাছাই করুন')}</option>{data.panelLawyers.map((person) => <option key={person.id} value={person.id} disabled={person.hold?.newAssignmentHold}>{person.displayName}{person.hold?.newAssignmentHold ? ` · ${bi('on hold', 'স্থগিত')}` : ''}</option>)}</select>
            <label htmlFor="assignment-change-request"><Bi en="Linked change request" bn="সংশ্লিষ্ট বদলের অনুরোধ" /></label><select id="assignment-change-request" value={changeRequestId} onChange={(event) => setChangeRequestId(event.target.value)}><option value="">{bi('None: officer decision', 'নেই: কর্মকর্তার সিদ্ধান্ত')}</option>{approvedRequests.map((item) => <option key={item.id} value={item.id}>{bi('Approved request', 'অনুমোদিত অনুরোধ')} · {when(item.createdAt)}</option>)}</select>
            <label htmlFor="assignment-reason"><Bi en="Reason" bn="কারণ" /></label><textarea id="assignment-reason" value={assignmentReason} onChange={(event) => setAssignmentReason(event.target.value)} minLength="10" maxLength="500" required />
            <button type="submit" disabled={busy || !lawyerUserId || pendingAssignments.length > 0}><Bi en="Send offer" bn="প্রস্তাব পাঠান" /></button>
          </form>
        </AddForm>
      </div>

      <div className="block"><h3 id="plan-title"><Bi en="Hearing and next step" bn="শুনানি ও পরবর্তী ধাপ" /></h3>
        <dl className="details compact">
          <div><dt><Bi en="Next hearing" bn="পরবর্তী শুনানি" /></dt><dd>{when(data.casePlan.nextHearingAt)}</dd></div>
          <div><dt><Bi en="Next step" bn="পরবর্তী ধাপ" /></dt><dd>{data.casePlan.nextAction || bi('Not set', 'নির্ধারিত নয়')}</dd></div>
        </dl>
        <AddForm en="Update hearing or next step" bn="শুনানি বা ধাপ হালনাগাদ">
          <form onSubmit={savePlan} className="form-stack inline-form">
            <label htmlFor="lawyer-hearing"><Bi en="Next hearing" bn="পরবর্তী শুনানি" /></label><input id="lawyer-hearing" name="nextHearingAt" type="datetime-local" defaultValue={localDate(data.casePlan.nextHearingAt)} />
            <label htmlFor="lawyer-next-action"><Bi en="Next step for the applicant" bn="আবেদনকারীর পরবর্তী ধাপ" /></label><textarea id="lawyer-next-action" name="nextAction" defaultValue={data.casePlan.nextAction} minLength="5" maxLength="300" required /><small><Bi en="May be read aloud. No private facts or contact details." bn="পড়ে শোনানো হতে পারে। গোপন তথ্য বা নম্বর লিখবেন না।" /></small>
            <label htmlFor="plan-reason"><Bi en="Reason" bn="কারণ" /></label><textarea id="plan-reason" name="reason" value={planReason} onChange={(event) => setPlanReason(event.target.value)} minLength="10" maxLength="500" required />
            <button type="submit" disabled={busy}><Bi en="Save" bn="সংরক্ষণ" /></button>
          </form>
        </AddForm>
      </div>

      {activeAssignments.length > 0 && <div className="block"><h3 id="schedule-title"><Bi en="Progress updates" bn="অগ্রগতির আপডেট" /></h3>
        {data.updates.length === 0 ? <p className="muted"><Bi en="None scheduled." bn="কোনো আপডেট নির্ধারিত নেই।" /></p> : <ol className="timeline compact">{data.updates.map((item) => <li key={item.id}><strong><Bi en="Update" bn="আপডেট" /> {num(item.sequence)}</strong> <Badge code={item.status} /><p>{item.instruction}</p><small><Bi en="Due" bn="শেষ সময়" /> {when(item.dueAt)}{item.missedAt ? ` · ${bi('missed', 'বাদ')} ${when(item.missedAt)}` : ''}{item.nextAction ? ` · ${bi('next', 'পরবর্তী')}: ${item.nextAction}` : ''}</small>{item.report && <p><Bi en="Report:" bn="প্রতিবেদন:" /> {item.report}</p>}</li>)}</ol>}
        <AddForm en="Schedule an update" bn="আপডেট নির্ধারণ">
          <form onSubmit={schedule} className="form-stack inline-form">
            <label htmlFor="update-assignment"><Bi en="Lawyer" bn="আইনজীবী" /></label><select id="update-assignment" name="assignmentId" defaultValue={activeAssignments[0]?.id}>{activeAssignments.map((item) => <option key={item.id} value={item.id}>{item.lawyerName}</option>)}</select>
            <label htmlFor="update-deadline"><Bi en="Deadline" bn="শেষ সময়" /></label><input id="update-deadline" name="dueAt" type="datetime-local" required />
            <label htmlFor="update-instruction"><Bi en="What to report" bn="কী জানাতে হবে" /></label><textarea id="update-instruction" name="instruction" minLength="5" maxLength="300" required />
            <button type="submit" disabled={busy}><Bi en="Schedule" bn="নির্ধারণ করুন" /></button>
          </form>
        </AddForm>
      </div>}

      {paymentAssignments.length > 0 && <div className="block"><h3 id="payment-title"><Bi en="Payment status" bn="পেমেন্টের অবস্থা" /></h3>
        <p className="muted"><Bi en="Status record only. No money moves here." bn="শুধু অবস্থার রেকর্ড। এখানে টাকা লেনদেন হয় না।" /></p>
        <ul className="plain-list">{paymentAssignments.map((item) => <li key={item.id}><div><strong>{item.lawyerName}</strong> {item.payment ? <><Term code={item.payment.stage} /> · <Badge code={item.payment.status} /></> : <span className="muted">{bi('Nothing recorded', 'কিছু লেখা নেই')}</span>}{item.payment && <p><small>{item.payment.reason}</small></p>}</div></li>)}</ul>
        <AddForm en="Record payment status" bn="পেমেন্টের অবস্থা লিখুন">
          <form onSubmit={recordPayment} className="form-stack inline-form">
            <label htmlFor="payment-assignment"><Bi en="Lawyer" bn="আইনজীবী" /></label><select id="payment-assignment" value={paymentAssignmentId || paymentAssignments[0].id} onChange={(event) => setPaymentAssignmentId(event.target.value)}>{paymentAssignments.map((item) => <option key={item.id} value={item.id}>{item.lawyerName} · {say(item.status)}</option>)}</select>
            <label htmlFor="payment-stage"><Bi en="Work stage" bn="কাজের ধাপ" /></label><select id="payment-stage" value={paymentStage} onChange={(event) => setPaymentStage(event.target.value)}>{['CASE_PREPARATION', 'HEARING_ATTENDANCE', 'CLAIM_REVIEW', 'RECONCILIATION'].map((code) => <option key={code} value={code}>{say(code)}</option>)}</select>
            <label htmlFor="payment-status"><Bi en="Status" bn="অবস্থা" /></label><select id="payment-status" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>{['SUBMITTED', 'UNDER_REVIEW', 'RECONCILED', 'PAYMENT_RECORDED', 'DISPUTED', 'NOT_RECORDED'].map((code) => <option key={code} value={code}>{say(code)}</option>)}</select>
            <label htmlFor="payment-reason"><Bi en="Note" bn="নোট" /></label><textarea id="payment-reason" value={paymentReason} onChange={(event) => setPaymentReason(event.target.value)} minLength="10" maxLength="500" required />
            <button type="submit" disabled={busy}><Bi en="Save payment status" bn="অবস্থা সংরক্ষণ" /></button>
          </form>
        </AddForm>
      </div>}

      <div className="block"><h3 id="change-title"><Bi en="Lawyer change requests" bn="আইনজীবী বদলের অনুরোধ" /></h3>
        {data.changeRequests.length === 0 ? <p className="muted">{bi('None', 'নেই')}</p> : <ul className="plain-list">{data.changeRequests.map((item) => <li key={item.id}><div><Badge code={item.status} /> <Term code={item.channel} /><p>{item.reason}</p><small>{when(item.createdAt)}{item.reviewReason ? ` · ${item.reviewReason}` : ''}</small>
          {item.status === 'OPEN' && <><label htmlFor={`request-reason-${item.id}`}><Bi en="Review reason" bn="পর্যালোচনার কারণ" /></label><textarea id={`request-reason-${item.id}`} value={reviewReasons[item.id] || ''} onChange={(event) => setReviewReasons((current) => ({ ...current, [item.id]: event.target.value }))} minLength="10" maxLength="500" /><div className="choice-row"><button type="button" disabled={busy || (reviewReasons[item.id] || '').trim().length < 10} onClick={() => reviewRequest(item.id, 'APPROVE')}><Bi en="Approve" bn="অনুমোদন" /></button><button type="button" className="secondary-button" disabled={busy || (reviewReasons[item.id] || '').trim().length < 10} onClick={() => reviewRequest(item.id, 'DECLINE')}><Bi en="Decline" bn="প্রত্যাখ্যান" /></button></div></>}
        </div></li>)}</ul>}
        <p className="muted"><Bi en="Approving does not change the lawyer. The current lawyer stays until a new one accepts." bn="অনুমোদনে আইনজীবী বদলায় না। নতুন কেউ গ্রহণ না করা পর্যন্ত বর্তমান আইনজীবী থাকবেন।" /></p>
      </div>
    </>}
  </Panel>
}
