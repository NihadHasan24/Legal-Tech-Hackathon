import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../services/api.js'
import { createSignaturePacket } from '../utils/settlementCrypto.js'
import { listSignaturePackets, loadSignaturePacket, removeSignaturePacket, saveSignaturePacket } from '../utils/offlineDrafts.js'

const pathFor = (applicationId, suffix = '') => `/api/applications/${applicationId}/mediation${suffix}`
const dateLabel = (value) => value ? new Date(value).toLocaleString() : 'Not recorded'
const stages = ['REGISTRATION', 'SCHEDULING_NOTICES', 'DOCUMENT_REVIEW', 'ATTENDANCE', 'MEDIATION', 'DRAFT_OUTCOME', 'SIGNATURES', 'PENDING_CLAO_CERTIFICATION', 'CERTIFIED_FINAL']
const templateNames = { MAINTENANCE: 'Maintenance', PROPERTY: 'Property', LABOUR: 'Labour' }
const initialLocalDateTime = () => {
  const value = new Date(Date.now() + 60 * 60 * 1000)
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
  return value.toISOString().slice(0, 16)
}

export default function MediationPanel({ applicationId, session, role }) {
  const ownerId = String(session.user.id)
  const [mediation, setMediation] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [queue, setQueue] = useState([])
  const [signingPassphrase, setSigningPassphrase] = useState('')
  const syncInFlight = useRef(false)
  const [mode, setMode] = useState('IN_PERSON')
  const [scheduledAt, setScheduledAt] = useState(initialLocalDateTime)
  const [venue, setVenue] = useState('')
  const [inPersonFallback, setInPersonFallback] = useState('')
  const [notices, setNotices] = useState({
    PARTY_A: { deliveryState: 'NOT_DELIVERED', reason: '' },
    PARTY_B: { deliveryState: 'NOT_DELIVERED', reason: '' },
  })
  const [documentReason, setDocumentReason] = useState('')
  const [attendance, setAttendance] = useState({ partyA: '', partyB: '', reason: '' })
  const [outcome, setOutcome] = useState('AGREEMENT_REACHED')
  const [outcomeReason, setOutcomeReason] = useState('')
  const [template, setTemplate] = useState('MAINTENANCE')
  const [notes, setNotes] = useState('')
  const [identifiersRemoved, setIdentifiersRemoved] = useState(false)
  const [acknowledgements, setAcknowledgements] = useState({ partyAUnderstands: false, partyAConsents: false, partyBUnderstands: false, partyBConsents: false })
  const [reviewReason, setReviewReason] = useState('')
  const [draftEdits, setDraftEdits] = useState({})
  const [amendReason, setAmendReason] = useState('')
  const [signerRole, setSignerRole] = useState('PARTY_A')
  const [applicabilityBasis, setApplicabilityBasis] = useState('')
  const [certificateReason, setCertificateReason] = useState('')

  const refreshQueue = useCallback(async () => setQueue(await listSignaturePackets(ownerId)), [ownerId])
  useEffect(() => {
    const controller = new AbortController()
    api(pathFor(applicationId), { token: session.token, signal: controller.signal }).then(({ mediation: result }) => {
      setMediation(result)
      if (result?.draft) {
        setDraftEdits(Object.fromEntries(result.draft.sections.map(({ key, text }) => [key, text])))
        setAcknowledgements(result.draft.partyAcknowledgements ?? { partyAUnderstands: false, partyAConsents: false, partyBUnderstands: false, partyBConsents: false })
      }
      setLoaded(true)
    }).catch((failure) => { if (failure.name !== 'AbortError') { setError(failure.message); setLoaded(true) } })
    listSignaturePackets(ownerId).then(setQueue).catch(() => setError('Offline signature queue is unavailable on this device.'))
    return () => controller.abort()
  }, [applicationId, ownerId, session.token])

  const syncPending = useCallback(async () => {
    if (!navigator.onLine || signingPassphrase.length < 8 || syncInFlight.current) return
    syncInFlight.current = true
    setError('')
    try {
      const pending = await listSignaturePackets(ownerId)
      setQueue(pending)
      for (const row of pending) {
        const packet = await loadSignaturePacket(row.id, ownerId, signingPassphrase)
        const { applicationId: targetApplicationId, ...signature } = packet
      const result = await api(pathFor(targetApplicationId, '/signatures'), { token: session.token, method: 'POST', body: signature })
        await removeSignaturePacket(row.id, ownerId)
        setMediation(result.mediation ?? result)
        setNotice(`The offline ${signature.signerRole.replaceAll('_', ' ')} signature synced and verified by the server.`)
      }
      await refreshQueue()
    } catch (failure) { setError(failure.message || 'Signature sync is waiting for a connection.') }
    finally { syncInFlight.current = false }
  }, [ownerId, refreshQueue, session.token, signingPassphrase])

  useEffect(() => {
    const disconnected = () => setOnline(false)
    const connected = () => { setOnline(true); syncPending() }
    window.addEventListener('offline', disconnected)
    window.addEventListener('online', connected)
    return () => { window.removeEventListener('offline', disconnected); window.removeEventListener('online', connected) }
  }, [syncPending])

  async function send(suffix, body, success) {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const result = await api(pathFor(applicationId, suffix), { token: session.token, method: 'POST', body })
      const updated = result.mediation ?? result
      setMediation(updated)
      if (updated.draft && updated.draft.version !== mediation?.draft?.version) {
        setDraftEdits(Object.fromEntries(updated.draft.sections.map(({ key, text }) => [key, text])))
        setAcknowledgements(updated.draft.partyAcknowledgements ?? { partyAUnderstands: false, partyAConsents: false, partyBUnderstands: false, partyBConsents: false })
      }
      setNotice(success)
      return result.mediation ?? result
    } catch (failure) { setError(failure.message); return null }
    finally { setBusy(false) }
  }

  async function sign() {
    if (!mediation?.draft || signingPassphrase.length < 8) { setError('Set a local queue passphrase of at least 8 characters first.'); return }
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const packet = { applicationId, ...await createSignaturePacket(mediation.draft, signerRole) }
      if (!navigator.onLine) {
        await saveSignaturePacket({ id: packet.clientMutationId, ownerId, value: packet, passphrase: signingPassphrase })
        await refreshQueue()
        setNotice(`The ${signerRole.replaceAll('_', ' ')} signature was created offline and encrypted for later sync. The private signing key was discarded.`)
      } else {
        try {
          const { applicationId: targetApplicationId, ...signature } = packet
          const result = await api(pathFor(targetApplicationId, '/signatures'), { token: session.token, method: 'POST', body: signature })
          setMediation(result.mediation ?? result)
          setNotice(`The ${signerRole.replaceAll('_', ' ')} signature was synced and verified by the server.`)
        } catch (failure) {
          if (!failure.status || failure.status >= 500) {
            await saveSignaturePacket({ id: packet.clientMutationId, ownerId, value: packet, passphrase: signingPassphrase })
            await refreshQueue()
            setNotice('Connection failed after signing. An encrypted signature packet is queued for retry; the private signing key was discarded.')
          } else throw failure
        }
      }
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }

  if (!loaded) return <section className="card" aria-labelledby="mediation-title"><h2 id="mediation-title">Mediation workflow</h2><p role="status">Loading mediation record…</p></section>
  if (error && !mediation && role !== 'DLAO_OFFICER') return <section className="card" aria-labelledby="mediation-title"><h2 id="mediation-title">Mediation workflow</h2><p role="alert" className="error">{error}</p></section>

  const assignedToMe = mediation?.mediatorUserId === ownerId
  const mediatorCanAct = role === 'MEDIATOR' && assignedToMe
  const signatures = mediation?.signatures ?? []
  const signedRoles = new Set(signatures.map(({ signerRole }) => signerRole))
  const missingPartySignatures = !signedRoles.has('PARTY_A') || !signedRoles.has('PARTY_B')

  return <section className="card mediation-workflow" aria-labelledby="mediation-title">
    <h2 id="mediation-title">Mediation workflow</h2>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    <p className="muted">This workflow stays on the existing Application and Case. It records human actions; it does not send notices or decide a legal outcome.</p>
    {role === 'DLAO_OFFICER' && !mediation && <button type="button" disabled={busy} onClick={() => send('', {}, 'Mediation registered on the existing Case. A same-office mediator can now claim it.')}>Register mediation workflow</button>}
    {mediation && <>
      <dl className="details">
        <div><dt>Case</dt><dd>{mediation.caseId}</dd></div>
        <div><dt>Stage</dt><dd><span className="badge">{mediation.stage.replaceAll('_', ' ')}</span></dd></div>
        {mediation.mode && <div><dt>Meeting</dt><dd>{mediation.mode.replaceAll('_', ' ')} · {dateLabel(mediation.scheduledAt)}</dd></div>}
        {mediation.mode === 'IN_PERSON' && <div><dt>Venue</dt><dd>{mediation.venue}</dd></div>}
        {mediation.inPersonFallback && <div><dt>In-person fallback</dt><dd>{mediation.inPersonFallback}</dd></div>}
        <div><dt>Legal effect</dt><dd>{mediation.legalEffectState.replaceAll('_', ' ')}</dd></div>
      </dl>

      {role === 'MEDIATOR' && !mediation.mediatorUserId && <button type="button" disabled={busy} onClick={() => send('/claim', {}, 'Mediation claimed for this account.')}>Claim this mediation</button>}
      {role === 'MEDIATOR' && mediation.mediatorUserId && !assignedToMe && <p role="alert" className="error">This mediation is assigned to another mediator.</p>}

      {mediatorCanAct && ['REGISTRATION', 'SCHEDULING_NOTICES'].includes(mediation.stage) && <form className="form-stack inline-form" onSubmit={(event) => {
        event.preventDefault()
        send('/schedule', { mode, scheduledAt: new Date(scheduledAt).toISOString(), venue, inPersonFallback, notices: ['PARTY_A', 'PARTY_B'].map((party) => ({ party, ...notices[party] })) }, 'Schedule and manual notice outcomes recorded. No notice was sent by the system.')
      }}>
        <h3>Scheduling and notices</h3>
        <p className="muted">Record that a human used an approved contact route. This prototype never sends notices.</p>
        <label htmlFor="mediation-mode">Meeting mode</label><select id="mediation-mode" value={mode} onChange={(event) => setMode(event.target.value)}><option value="IN_PERSON">In person</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option></select>
        <label htmlFor="mediation-time">Scheduled time</label><input id="mediation-time" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required />
        {mode === 'IN_PERSON' && <><label htmlFor="mediation-venue">In-person location</label><input id="mediation-venue" value={venue} onChange={(event) => setVenue(event.target.value)} minLength="3" maxLength="200" required /></>}
        {mode !== 'IN_PERSON' && <><label htmlFor="mediation-fallback">In-person fallback plan</label><textarea id="mediation-fallback" value={inPersonFallback} onChange={(event) => setInPersonFallback(event.target.value)} minLength="10" maxLength="300" required /></>}
        {['PARTY_A', 'PARTY_B'].map((party) => <fieldset key={party}><legend>{party.replace('_', ' ')} notice</legend><label htmlFor={`${party}-notice-state`}>Human-recorded delivery outcome</label><select id={`${party}-notice-state`} value={notices[party].deliveryState} onChange={(event) => setNotices((current) => ({ ...current, [party]: { ...current[party], deliveryState: event.target.value } }))}><option value="NOT_DELIVERED">Not delivered</option><option value="DELIVERED">Delivered by a human</option></select><label htmlFor={`${party}-notice-reason`}>Delivery record reason</label><textarea id={`${party}-notice-reason`} value={notices[party].reason} onChange={(event) => setNotices((current) => ({ ...current, [party]: { ...current[party], reason: event.target.value } }))} minLength="10" maxLength="300" required /></fieldset>)}
        <button type="submit" disabled={busy}>Save schedule and notice record</button>
      </form>}

      {mediatorCanAct && mediation.stage === 'SCHEDULING_NOTICES' && <button type="button" disabled={busy} className="secondary-button" onClick={() => send('/advance', {}, 'Both notice outcomes are recorded. Document review is next.')}>Continue to document review</button>}

      {mediatorCanAct && mediation.stage === 'DOCUMENT_REVIEW' && <section className="form-stack inline-form" aria-labelledby="med-documents-title">
        <h3 id="med-documents-title">Document review</h3>
        {mediation.documents.length ? <ul className="plain-list">{mediation.documents.map((document) => <li key={document.id}>{document.label} · {document.qualityState.replaceAll('_', ' ')} · version {document.currentVersion}</li>)}</ul> : <p>No standard document metadata is on this Case.</p>}
        {mediation.documentsReviewedAt ? <p role="status">Human review recorded: {dateLabel(mediation.documentsReviewedAt)} · {mediation.documentReviewReason}</p> : <form className="form-stack" onSubmit={(event) => { event.preventDefault(); send('/documents/review', { reason: documentReason }, 'Human document review recorded.') }}><label htmlFor="med-document-reason">Review note</label><textarea id="med-document-reason" value={documentReason} onChange={(event) => setDocumentReason(event.target.value)} minLength="10" maxLength="500" required /><button type="submit" disabled={busy}>Record document review</button></form>}
        {mediation.documentsReviewedAt && <button type="button" disabled={busy} className="secondary-button" onClick={() => send('/advance', {}, 'Document review recorded. Attendance is next.')}>Continue to attendance</button>}
      </section>}

      {mediatorCanAct && mediation.stage === 'ATTENDANCE' && <form className="form-stack inline-form" onSubmit={(event) => { event.preventDefault(); send('/attendance', attendance, 'Attendance recorded by the mediator.') }}>
        <h3>Attendance</h3>
        {['partyA', 'partyB'].map((party) => <div key={party}><label htmlFor={`attendance-${party}`}>{party === 'partyA' ? 'Party A' : 'Party B'} attendance</label><select id={`attendance-${party}`} value={attendance[party]} onChange={(event) => setAttendance((current) => ({ ...current, [party]: event.target.value }))} required><option value="">Choose status</option><option value="ATTENDED">Attended</option><option value="REPRESENTED">Represented</option><option value="ABSENT">Absent</option></select></div>)}
        <label htmlFor="attendance-reason">Attendance record reason</label><textarea id="attendance-reason" value={attendance.reason} onChange={(event) => setAttendance((current) => ({ ...current, reason: event.target.value }))} minLength="10" maxLength="500" required /><button type="submit" disabled={busy}>Save attendance</button>
        {mediation.attendance && mediation.attendance.partyA !== 'ABSENT' && mediation.attendance.partyB !== 'ABSENT' && <button type="button" disabled={busy} className="secondary-button" onClick={() => send('/advance', {}, 'Attendance recorded. Mediation is next.')}>Continue to mediation</button>}
      </form>}

      {mediatorCanAct && mediation.stage === 'MEDIATION' && <>
        <form className="form-stack inline-form" onSubmit={(event) => { event.preventDefault(); send('/outcome', { outcome, reason: outcomeReason }, 'Human mediation outcome recorded.') }}>
          <h3>Mediation outcome</h3><label htmlFor="mediation-outcome">Mediator-recorded outcome</label><select id="mediation-outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="AGREEMENT_REACHED">Agreement reached</option><option value="NO_AGREEMENT">No agreement</option><option value="CONTINUED">Continue mediation later</option></select><label htmlFor="mediation-outcome-reason">Reason or next action</label><textarea id="mediation-outcome-reason" value={outcomeReason} onChange={(event) => setOutcomeReason(event.target.value)} minLength="10" maxLength="1000" required /><button type="submit" disabled={busy}>Record mediation outcome</button>
        </form>
        {mediation.outcome === 'AGREEMENT_REACHED' && <form className="form-stack inline-form" onSubmit={(event) => { event.preventDefault(); send('/draft', { template, notes, identifiersRemoved }, 'Draft prepared. It is not final and requires mediator review.') }}>
          <h3>Settlement drafting assistant</h3><p className="muted">Use anonymised notes only. Notes may be sent to the configured AI service; this prototype stores only a digest and the resulting draft, not the source notes.</p><label htmlFor="settlement-template">Fictional template</label><select id="settlement-template" value={template} onChange={(event) => setTemplate(event.target.value)}><option value="MAINTENANCE">Maintenance</option><option value="PROPERTY">Property</option><option value="LABOUR">Labour</option></select><label htmlFor="mediator-notes">Anonymised mediator notes</label><textarea id="mediator-notes" value={notes} onChange={(event) => setNotes(event.target.value)} minLength="10" maxLength="3000" required /><label className="checkbox-label" htmlFor="identifiers-removed"><input id="identifiers-removed" type="checkbox" checked={identifiersRemoved} onChange={(event) => setIdentifiersRemoved(event.target.checked)} required />I removed names, phone numbers, full addresses, and identification numbers before AI drafting.</label><button type="submit" disabled={busy || !identifiersRemoved}>Prepare draft for human review</button>
        </form>}
      </>}

      {mediatorCanAct && mediation.stage === 'DRAFT_OUTCOME' && mediation.draft && <section className="form-stack inline-form" aria-labelledby="settlement-title">
        <h3 id="settlement-title">{templateNames[mediation.draft.template]} settlement draft · version {mediation.draft.version}</h3><p className="muted">{mediation.draft.aiAssisted ? 'AI-assisted' : 'Rules-only placeholder'} · status {mediation.draft.status.replaceAll('_', ' ')} · human mediator review required.</p>
        {mediation.draft.sections.map((section) => <div key={section.key}><h4>{section.label} {section.aiFilled && <span className="badge">AI-FILLED</span>}</h4>{mediation.draft.status === 'HUMAN_REVIEW' ? <><label htmlFor={`draft-section-${section.key}`}>Reviewed text</label><textarea id={`draft-section-${section.key}`} value={draftEdits[section.key] ?? section.text} onChange={(event) => setDraftEdits((current) => ({ ...current, [section.key]: event.target.value }))} maxLength="500" /></> : <p>{section.text}</p>}</div>)}
        <p className="safety-note">Inconsistency warning: review every amount, date, and party obligation. The AI may miss contradictions.</p>
        {mediation.draft.inconsistencies.map((warning, index) => <p className="error" key={`${warning}-${index}`}>{warning}</p>)}
        {mediation.draft.status === 'HUMAN_REVIEW' && <>
          <form className="form-stack" onSubmit={async (event) => {
            event.preventDefault()
            const result = await send('/draft/amend', { template: mediation.draft.template, sections: mediation.draft.sections.map(({ key }) => ({ key, text: draftEdits[key] ?? '' })), reason: amendReason }, 'Human amendments saved as a new draft version. Review and party responses must be recorded again.')
            if (result) { setAcknowledgements({ partyAUnderstands: false, partyAConsents: false, partyBUnderstands: false, partyBConsents: false }); setReviewReason(''); setAmendReason('') }
          }}>
            <label htmlFor="settlement-amend-reason">Reason for human edits</label><textarea id="settlement-amend-reason" value={amendReason} onChange={(event) => setAmendReason(event.target.value)} minLength="10" maxLength="1000" required /><button type="submit" disabled={busy}>Save human amendments as a new version</button>
          </form>
          <form className="form-stack" onSubmit={(event) => { event.preventDefault(); send('/draft/review', { ...acknowledgements, reason: reviewReason }, 'Human review recorded. Signature steps unlock only if both parties understood and consented.') }}>
          <h4>Party understanding and consent (recorded by mediator)</h4><p className="muted">Each answer is a human attestation, not proof of identity or legal capacity.</p>
          {Object.entries({ partyAUnderstands: 'Party A understood the draft', partyAConsents: 'Party A consents to signing', partyBUnderstands: 'Party B understood the draft', partyBConsents: 'Party B consents to signing' }).map(([key, label]) => <label className="checkbox-label" htmlFor={key} key={key}><input id={key} type="checkbox" checked={acknowledgements[key]} onChange={(event) => setAcknowledgements((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}
          <label htmlFor="settlement-review-reason">Mediator review reason</label><textarea id="settlement-review-reason" value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} minLength="10" maxLength="1000" required /><button type="submit" disabled={busy}>Record review and party responses</button>
          </form>
        </>}
      </section>}

      {mediatorCanAct && mediation.draft?.status === 'APPROVED' && <section className="form-stack inline-form" aria-labelledby="signature-title">
        <h3 id="signature-title">Asynchronous signatures</h3><p className="muted">Party A, Party B, and the mediator sign the same approved draft version. The mediator selects a party role only after separate human verification.</p><p><strong>Cryptographic validity does not by itself prove legal identity, capacity, informed consent, or enforceability.</strong></p>
        <ol className="plain-list">{signatures.map((record) => <li key={record.signerRole}><strong>{record.signerRole.replaceAll('_', ' ')}</strong> · synced {dateLabel(record.receivedAt)} · device-reported {dateLabel(record.clientSignedAt)} · {record.documentHash.slice(0, 12)}…</li>)}</ol>
        <label htmlFor="signature-passphrase">Local passphrase for encrypted offline signature packets</label><input id="signature-passphrase" type="password" autoComplete="off" minLength="8" value={signingPassphrase} onChange={(event) => setSigningPassphrase(event.target.value)} />
        <p className="muted">The private key is generated in this browser, made non-extractable for signing, then discarded. Only the public key and signature can sync. Offline packets contain no document text and remain encrypted until synced.</p>
        <label htmlFor="signer-role">Signer role witnessed by mediator</label><select id="signer-role" value={signerRole} onChange={(event) => setSignerRole(event.target.value)}>{['PARTY_A', 'PARTY_B', 'MEDIATOR'].filter((item) => !signedRoles.has(item)).map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select>
        <button type="button" disabled={busy || !signerRole || signingPassphrase.length < 8 || (signerRole === 'MEDIATOR' && missingPartySignatures)} onClick={sign}>Create {signerRole.replaceAll('_', ' ')} signature{online ? ' and sync' : ' offline'}</button>
        <p role="status">Connection: {online ? 'online' : 'offline'} · encrypted signatures awaiting sync: {queue.length}</p>
        {queue.length > 0 && <><button type="button" className="secondary-button" disabled={!online || signingPassphrase.length < 8 || busy} onClick={syncPending}>Sync pending signatures</button><ul className="plain-list">{queue.map((item) => <li key={item.id}>Encrypted signature packet · updated {dateLabel(item.updatedAt)}</li>)}</ul></>}
        <Link to={`/applications/${applicationId}/mediation/verify`}>Open independent signature verifier</Link>
        {mediation.stage !== 'SIGNATURES' && <p className="safety-note">{mediation.legalEffectState.replaceAll('_', ' ')}. Electronic signing alone does not create decree status.</p>}
      </section>}

      {role === 'CLAO' && mediation.stage === 'PENDING_CLAO_CERTIFICATION' && <section className="form-stack inline-form" aria-labelledby="clao-title">
        <h3 id="clao-title">Authorised legal review and CLAO certification</h3><p className="safety-note"><strong>{mediation.legalEffectState.replaceAll('_', ' ')}</strong>. Applicability is date- and area-dependent; this prototype does not infer it.</p>
        <p>Cryptographic signature checks must pass before certification. Record an authorised legal basis and any applicable Gazette/date/area reference; do not use database registration as the legal act.</p>
        {mediation.legalApplicability !== 'APPLICABLE_VERIFIED' ? <form className="form-stack" onSubmit={(event) => { event.preventDefault(); send('/legal-applicability', { applicability: 'APPLICABLE_VERIFIED', basis: applicabilityBasis }, 'Authorised legal applicability review recorded. Certification remains a separate human action.') }}><label htmlFor="legal-basis">Verified legal applicability basis</label><textarea id="legal-basis" value={applicabilityBasis} onChange={(event) => setApplicabilityBasis(event.target.value)} minLength="10" maxLength="500" required /><button type="submit" disabled={busy}>Record verified applicability</button><button type="button" className="secondary-button" disabled={busy} onClick={() => send('/legal-applicability', { applicability: 'UNVERIFIED' }, 'Applicability remains unverified; final status is blocked.')}>Leave unverified</button></form> : <><p>Applicability basis: {mediation.legalReviewBasis}</p><form className="form-stack" onSubmit={(event) => { event.preventDefault(); send('/certify', { reason: certificateReason }, 'CLAO certification recorded. This prototype does not make a court-decree finding.') }}><label htmlFor="certificate-reason">CLAO certification reason</label><textarea id="certificate-reason" value={certificateReason} onChange={(event) => setCertificateReason(event.target.value)} minLength="10" maxLength="500" required /><button type="submit" disabled={busy}>Record CLAO certification</button></form></>}
      </section>}

      {mediation.stage === 'CERTIFIED_FINAL' && <p role="status" className="safety-note">CLAO certification is recorded. The prototype does not independently determine court-decree status.</p>}
      {['SIGNATURES', 'PENDING_CLAO_CERTIFICATION', 'CERTIFIED_FINAL'].includes(mediation.stage) && role !== 'CLAO' && <p><Link to={`/applications/${applicationId}/mediation/verify`}>Open independent signature verifier</Link></p>}
      <ol className="plain-list" aria-label="Mediation stage order">{stages.map((stage) => <li key={stage}>{stage === mediation.stage ? <strong aria-current="step">{stage.replaceAll('_', ' ')}</strong> : stage.replaceAll('_', ' ')}</li>)}</ol>
    </>}
  </section>
}
