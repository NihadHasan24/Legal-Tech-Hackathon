import { useEffect, useState } from 'react'
import { api } from '../services/api.js'

const dateText = (value) => value ? new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set'
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
    }, 'Case hearing and next step recorded on the shared Case.')) setPlanReason('')
  }

  async function offerAssignment(event) {
    event.preventDefault()
    if (await mutate(`/api/lawyers/applications/${applicationId}/assignments`, {
      lawyerUserId, reason: assignmentReason, ...(changeRequestId ? { changeRequestId } : {}),
    }, 'A human-reviewed assignment offer was sent. The Case remains active until the lawyer accepts.')) setAssignmentReason('')
  }

  async function schedule(event) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(event.currentTarget)
    if (await mutate(`/api/lawyers/applications/${applicationId}/update-schedules`, {
      assignmentId: form.get('assignmentId'), dueAt: new Date(form.get('dueAt')).toISOString(), instruction: form.get('instruction'),
    }, 'Mandatory lawyer update scheduled.')) target.reset()
  }

  function reviewRequest(requestId, decision) {
    mutate(`/api/lawyers/applications/${applicationId}/change-requests/${requestId}/review`, {
      decision, reason: reviewReasons[requestId] || '',
    }, decision === 'APPROVE'
      ? 'Request approved by a human. Reassignment is a separate DLAO action.'
      : 'Request declined by a human with a recorded reason.')
  }

  function reviewHold(lawyerId, decision) {
    mutate(`/api/lawyers/holds/${lawyerId}/review`, { decision, reason: holdReasons[lawyerId] || '' },
      decision === 'LIFT' ? 'Human reviewer lifted the temporary hold. Existing case assignments were not changed.' : 'Human reviewer continued the temporary hold. Existing case assignments were not changed.')
  }

  async function recordPayment(event) {
    event.preventDefault()
    const assignment = data.assignments.find(({ id }) => id === (paymentAssignmentId || paymentAssignments[0]?.id))
    if (!assignment) return
    if (await mutate(`/api/lawyers/assignments/${assignment.id}/payment-status`, { stage: paymentStage, status: paymentStatus, reason: paymentReason },
      'Payment status recorded for reconciliation only. No money moved.')) setPaymentReason('')
  }

  if (!data) return <section className="card" aria-labelledby="lawyer-title"><h2 id="lawyer-title">Panel lawyer workflow</h2>{error ? <p role="alert" className="error">{error}</p> : <p role="status">Loading lawyer workflow…</p>}</section>

  const activeAssignments = data.assignments.filter(({ active, status }) => active && status === 'ACCEPTED')
  const paymentAssignments = data.assignments.filter(({ status }) => status === 'ACCEPTED' || status === 'REASSIGNED')
  const pendingAssignments = data.assignments.filter(({ active, status }) => active && status === 'PENDING')
  const approvedRequests = data.changeRequests.filter(({ status }) => status === 'APPROVED')
  const holds = data.panelLawyers.filter(({ hold }) => hold?.newAssignmentHold)

  return <section className="card" aria-labelledby="lawyer-title">
    <h2 id="lawyer-title">Panel lawyer work and accountability</h2>
    <p className="muted">All actions use this accepted Case. Payment entries are status records only; the prototype does not move money. Hold-review authority is a demo route pending legal/administrative policy verification.</p>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}

    {holds.map(({ id, displayName, hold }) => <section className="escalation-box" key={id} aria-label="Temporary lawyer assignment hold">
      <h3>Temporary new-assignment hold · human review required</h3>
      <p>{displayName}: two consecutive mandatory updates were missed. Existing cases remain active. No misconduct finding or payment recovery has been made.</p>
      <p className="muted">{data.authorityNotice} Reviewer route: {hold.reviewerRole.replaceAll('_', ' ')} · state {hold.reviewState.replaceAll('_', ' ')}.</p>
      {hold.reviewReason && <p>Last review reason: {hold.reviewReason}</p>}
      <label htmlFor={`hold-reason-${id}`}>Human hold-review reason</label>
      <textarea id={`hold-reason-${id}`} value={holdReasons[id] || ''} onChange={(event) => setHoldReasons((current) => ({ ...current, [id]: event.target.value }))} minLength="10" maxLength="500" />
      <div className="choice-row"><button type="button" disabled={busy || (holdReasons[id] || '').trim().length < 10} onClick={() => reviewHold(id, 'LIFT')}>Lift hold</button><button type="button" className="secondary-button" disabled={busy || (holdReasons[id] || '').trim().length < 10} onClick={() => reviewHold(id, 'CONTINUE')}>Continue hold</button></div>
    </section>)}

    <div className="summary-grid">
      <section aria-labelledby="plan-title"><h3 id="plan-title">Hearing and next step</h3>
        <form onSubmit={savePlan} className="form-stack">
          <label htmlFor="lawyer-hearing">Next hearing date and time</label><input id="lawyer-hearing" name="nextHearingAt" type="datetime-local" defaultValue={localDate(data.casePlan.nextHearingAt)} />
          <label htmlFor="lawyer-next-action">Applicant-safe next step</label><textarea id="lawyer-next-action" name="nextAction" defaultValue={data.casePlan.nextAction} minLength="5" maxLength="300" required /><small>Helpline staff may read this aloud. Do not include confidential facts or unsafe contact details.</small>
          <label htmlFor="plan-reason">Reason for this case-plan update</label><textarea id="plan-reason" name="reason" value={planReason} onChange={(event) => setPlanReason(event.target.value)} minLength="10" maxLength="500" required />
          <button type="submit" disabled={busy}>Save case plan</button>
        </form>
      </section>

      <section aria-labelledby="assignment-title"><h3 id="assignment-title">Offer a panel-lawyer assignment</h3>
        {pendingAssignments.length > 0 && <p role="status">An offer is awaiting the lawyer’s accept/decline response.</p>}
        <form onSubmit={offerAssignment} className="form-stack">
          <label htmlFor="panel-lawyer">Active panel lawyer in this office</label><select id="panel-lawyer" value={lawyerUserId} onChange={(event) => setLawyerUserId(event.target.value)} required><option value="">Choose a lawyer</option>{data.panelLawyers.map((person) => <option key={person.id} value={person.id} disabled={person.hold?.newAssignmentHold}>{person.displayName}{person.hold?.newAssignmentHold ? ' · temporary hold' : ''}</option>)}</select>
          <label htmlFor="assignment-change-request">Approved applicant request (if applicable)</label><select id="assignment-change-request" value={changeRequestId} onChange={(event) => setChangeRequestId(event.target.value)}><option value="">Separate human case-protection action</option>{approvedRequests.map((item) => <option key={item.id} value={item.id}>Approved request · {dateText(item.createdAt)}</option>)}</select>
          <label htmlFor="assignment-reason">Human assignment reason</label><textarea id="assignment-reason" value={assignmentReason} onChange={(event) => setAssignmentReason(event.target.value)} minLength="10" maxLength="500" required />
          <button type="submit" disabled={busy || !lawyerUserId || pendingAssignments.length > 0}>Send assignment offer</button>
        </form>
        {activeAssignments.length === 0 && <p>No accepted panel-lawyer assignment is active.</p>}
        <ul className="plain-list">{data.assignments.map((item) => <li key={item.id}><div><strong>{item.lawyerName}</strong><p>Assignment {item.status.toLowerCase()} · {item.active ? 'active' : 'historical'}</p>{item.hold && <small>Temporary new-assignment hold: {item.hold.reviewState.replaceAll('_', ' ')}</small>}</div></li>)}</ul>
      </section>
    </div>

    {activeAssignments.length > 0 && <div className="summary-grid">
      <section aria-labelledby="schedule-title"><h3 id="schedule-title">Required progress updates</h3>
        <form onSubmit={schedule} className="form-stack">
          <label htmlFor="update-assignment">Accepted assignment</label><select id="update-assignment" name="assignmentId" defaultValue={activeAssignments[0]?.id}>{activeAssignments.map((item) => <option key={item.id} value={item.id}>{item.lawyerName} · {item.id}</option>)}</select>
          <label htmlFor="update-deadline">Update deadline</label><input id="update-deadline" name="dueAt" type="datetime-local" required />
          <label htmlFor="update-instruction">Required update / next action</label><textarea id="update-instruction" name="instruction" minLength="5" maxLength="300" required />
          <button type="submit" disabled={busy}>Schedule required update</button>
        </form>
        {data.updates.length === 0 ? <p>No mandatory updates are scheduled.</p> : <ol className="timeline">{data.updates.map((item) => <li key={item.id}><strong>Update {item.sequence} · {item.status.replaceAll('_', ' ')}</strong><p>{item.instruction}</p><small>Due {dateText(item.dueAt)}{item.missedAt ? ` · missed ${dateText(item.missedAt)}` : ''}{item.nextAction ? ` · next: ${item.nextAction}` : ''}</small>{item.report && <p>Lawyer report: {item.report}</p>}</li>)}</ol>}
      </section>

      <section aria-labelledby="payment-title"><h3 id="payment-title">Stage-based payment reconciliation</h3>
        <p className="muted">Record the stage and review state. This is not a payment instruction and does not decide a recoverable amount.</p>
        <ul className="plain-list">{paymentAssignments.map((item) => <li key={item.id}><div><strong>{item.lawyerName}</strong><p>Assignment {item.status.toLowerCase()}{item.payment ? ` · ${item.payment.stage.replaceAll('_', ' ')} · ${item.payment.status.replaceAll('_', ' ')}` : ' · no stage status recorded'}</p>{item.payment && <small>{item.payment.reason}</small>}</div></li>)}</ul>
        {paymentAssignments.length > 0 && <form onSubmit={recordPayment} className="form-stack">
          <label htmlFor="payment-assignment">Panel work to reconcile</label><select id="payment-assignment" value={paymentAssignmentId || paymentAssignments[0].id} onChange={(event) => setPaymentAssignmentId(event.target.value)}>{paymentAssignments.map((item) => <option key={item.id} value={item.id}>{item.lawyerName} · {item.status.toLowerCase()}</option>)}</select>
          <label htmlFor="payment-stage">Work stage</label><select id="payment-stage" value={paymentStage} onChange={(event) => setPaymentStage(event.target.value)}><option value="CASE_PREPARATION">Case preparation</option><option value="HEARING_ATTENDANCE">Hearing attendance</option><option value="CLAIM_REVIEW">Claim review</option><option value="RECONCILIATION">Reconciliation</option></select>
          <label htmlFor="payment-status">Recorded status</label><select id="payment-status" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="SUBMITTED">Submitted</option><option value="UNDER_REVIEW">Under review</option><option value="RECONCILED">Reconciled</option><option value="PAYMENT_RECORDED">Payment recorded (external status only)</option><option value="DISPUTED">Disputed</option><option value="NOT_RECORDED">Not recorded</option></select>
          <label htmlFor="payment-reason">Reconciliation note</label><textarea id="payment-reason" value={paymentReason} onChange={(event) => setPaymentReason(event.target.value)} minLength="10" maxLength="500" required />
          <button type="submit" disabled={busy}>Record payment status</button>
        </form>}
      </section>
    </div>}

    <section aria-labelledby="change-title"><h3 id="change-title">Applicant lawyer-change requests</h3>
      {data.changeRequests.length === 0 ? <p>No applicant change request is waiting.</p> : <ul className="plain-list">{data.changeRequests.map((item) => <li key={item.id}><div><strong>{item.status.replaceAll('_', ' ')} · {item.channel}</strong><p>{item.reason}</p><small>Recorded {dateText(item.createdAt)}{item.reviewedAt ? ` · reviewed ${dateText(item.reviewedAt)}` : ''}{item.reviewReason ? ` · review reason: ${item.reviewReason}` : ''}</small>
        {item.status === 'OPEN' && <><label htmlFor={`request-reason-${item.id}`}>DLAO review reason</label><textarea id={`request-reason-${item.id}`} value={reviewReasons[item.id] || ''} onChange={(event) => setReviewReasons((current) => ({ ...current, [item.id]: event.target.value }))} minLength="10" maxLength="500" /><div className="choice-row"><button type="button" disabled={busy || (reviewReasons[item.id] || '').trim().length < 10} onClick={() => reviewRequest(item.id, 'APPROVE')}>Approve request</button><button type="button" className="secondary-button" disabled={busy || (reviewReasons[item.id] || '').trim().length < 10} onClick={() => reviewRequest(item.id, 'DECLINE')}>Decline with reason</button></div></>}
      </div></li>)}</ul>}
      <p className="muted">Approving a request does not reassign the lawyer. The DLAO must separately choose and offer a replacement; the existing lawyer remains active until the replacement accepts.</p>
    </section>
  </section>
}
