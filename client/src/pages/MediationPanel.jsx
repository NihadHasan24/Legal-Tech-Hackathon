import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../services/api.js'
import { createSignaturePacket } from '../utils/settlementCrypto.js'
import { listSignaturePackets, loadSignaturePacket, removeSignaturePacket, saveSignaturePacket } from '../utils/offlineDrafts.js'
import { Badge, Bi, Panel, Term, bi, num, say, when } from '../components/Bi.jsx'

const pathFor = (applicationId, suffix = '') => `/api/applications/${applicationId}/mediation${suffix}`
const signerBn = { PARTY_A: 'পক্ষ ক', PARTY_B: 'পক্ষ খ', MEDIATOR: 'মধ্যস্থতাকারী' }
const stages = ['REGISTRATION', 'SCHEDULING_NOTICES', 'DOCUMENT_REVIEW', 'ATTENDANCE', 'MEDIATION', 'DRAFT_OUTCOME', 'SIGNATURES', 'PENDING_CLAO_CERTIFICATION', 'CERTIFIED_FINAL']
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
    listSignaturePackets(ownerId).then(setQueue).catch(() => setError(bi('Offline signature queue is unavailable on this device.', 'এই ডিভাইসে পরে পাঠানোর জন্য রাখা স্বাক্ষরগুলো এখন দেখা যাচ্ছে না।')))
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
        setNotice(bi(`Offline ${signature.signerRole.replaceAll('_', ' ')} signature synced and verified.`, `অফলাইন স্বাক্ষর (${signerBn[signature.signerRole]}) সিঙ্ক ও যাচাই হয়েছে।`))
      }
      await refreshQueue()
    } catch (failure) { setError(failure.message || bi('Signature sync is waiting for a connection.', 'স্বাক্ষরটি পাঠাতে ইন্টারনেট সংযোগ দরকার।')) }
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
    if (!mediation?.draft || signingPassphrase.length < 8) { setError(bi('Set a passphrase of at least 8 characters first.', 'আগে কমপক্ষে ৮ অক্ষরের পাসফ্রেজ দিন।')); return }
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const packet = { applicationId, ...await createSignaturePacket(mediation.draft, signerRole) }
      if (!navigator.onLine) {
        await saveSignaturePacket({ id: packet.clientMutationId, ownerId, value: packet, passphrase: signingPassphrase })
        await refreshQueue()
        setNotice(bi(`${signerRole.replaceAll('_', ' ')} signature saved offline, encrypted, and will sync later.`, `${signerBn[signerRole]}-এর স্বাক্ষর অফলাইনে এনক্রিপ্ট করে রাখা হয়েছে, পরে সিঙ্ক হবে।`))
      } else {
        try {
          const { applicationId: targetApplicationId, ...signature } = packet
          const result = await api(pathFor(targetApplicationId, '/signatures'), { token: session.token, method: 'POST', body: signature })
          setMediation(result.mediation ?? result)
          setNotice(bi(`${signerRole.replaceAll('_', ' ')} signature was synced and verified.`, `${signerBn[signerRole]}-এর স্বাক্ষর সিঙ্ক ও যাচাই হয়েছে।`))
        } catch (failure) {
          if (!failure.status || failure.status >= 500) {
            await saveSignaturePacket({ id: packet.clientMutationId, ownerId, value: packet, passphrase: signingPassphrase })
            await refreshQueue()
            setNotice(bi('Connection failed after signing. The encrypted signature is queued for retry.', 'স্বাক্ষর করার পর সংযোগ বিচ্ছিন্ন হয়েছে। সুরক্ষিত স্বাক্ষরটি এই ডিভাইসে আছে; সংযোগ পেলে আবার পাঠানো যাবে।'))
          } else throw failure
        }
      }
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }


  const assignedToMe = mediation?.mediatorUserId === ownerId
  const mediatorCanAct = role === 'MEDIATOR' && assignedToMe
  const signatures = mediation?.signatures ?? []
  const signedRoles = new Set(signatures.map(({ signerRole }) => signerRole))
  const missingPartySignatures = !signedRoles.has('PARTY_A') || !signedRoles.has('PARTY_B')
  const stageIndex = stages.indexOf(mediation?.stage)
  const signing = mediatorCanAct && mediation?.draft?.status === 'APPROVED'
  const verifier = <Link to={`/applications/${applicationId}/mediation/verify`}><Bi en="Open independent signature verifier" bn="আলাদাভাবে স্বাক্ষর যাচাই করুন" /></Link>

  return <Panel id="mediation-title" en="Mediation" bn="মধ্যস্থতা" hint={loaded ? mediation ? say(mediation.stage) : bi('Not started', 'শুরু হয়নি') : undefined} open={role !== 'DLAO_OFFICER'}>
    {!loaded && <p role="status">{bi('Loading…', 'লোড হচ্ছে…')}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    {loaded && <p className="muted"><Bi en="Records what people do. Sends no notices and decides no legal outcome." bn="এখানে কর্মীদের কাজ নথিভুক্ত হয়। এখান থেকে নোটিশ পাঠানো বা মামলার আইনি ফল নির্ধারণ করা হয় না।" /></p>}
    {loaded && role === 'DLAO_OFFICER' && !mediation && <button type="button" disabled={busy} onClick={() => send('', {}, bi('Mediation registered. A mediator in this office can now claim it.', 'মধ্যস্থতা নিবন্ধিত। এই অফিসের একজন মধ্যস্থতাকারী দায়িত্ব নিতে পারবেন।'))}><Bi en="Start mediation" bn="মধ্যস্থতা শুরু করুন" /></button>}
    {mediation && <>
      <ol className="journey stages" aria-label={bi('Mediation stages', 'মধ্যস্থতার ধাপ')}>{stages.map((stage, index) => <li key={stage} className={index < stageIndex ? 'done' : undefined} aria-current={index === stageIndex ? 'step' : undefined}><Term code={stage} /></li>)}</ol>
      <dl className="details compact">
        <div><dt><Bi en="Case" bn="মামলা" /></dt><dd>{mediation.caseId}</dd></div>
        <div><dt><Bi en="Stage" bn="ধাপ" /></dt><dd><Badge code={mediation.stage} /></dd></div>
        {mediation.mode && <div><dt><Bi en="Meeting" bn="সভা" /></dt><dd><Term code={mediation.mode} /> · {when(mediation.scheduledAt)}</dd></div>}
        {mediation.mode === 'IN_PERSON' && <div><dt><Bi en="Venue" bn="স্থান" /></dt><dd>{mediation.venue}</dd></div>}
        {mediation.inPersonFallback && <div><dt><Bi en="Backup plan" bn="বিকল্প পরিকল্পনা" /></dt><dd>{mediation.inPersonFallback}</dd></div>}
        <div><dt><Bi en="Legal effect" bn="আইনি কার্যকারিতা" /></dt><dd><Term code={mediation.legalEffectState} /></dd></div>
      </dl>

      {role === 'MEDIATOR' && !mediation.mediatorUserId && <button type="button" disabled={busy} onClick={() => send('/claim', {}, bi('Mediation claimed.', 'মধ্যস্থতার দায়িত্ব নেওয়া হয়েছে।'))}><Bi en="Claim this mediation" bn="দায়িত্ব নিন" /></button>}
      {role === 'MEDIATOR' && mediation.mediatorUserId && !assignedToMe && <p role="alert" className="error"><Bi en="Assigned to another mediator." bn="অন্য মধ্যস্থতাকারীর দায়িত্বে।" /></p>}

      {mediatorCanAct && ['REGISTRATION', 'SCHEDULING_NOTICES'].includes(mediation.stage) && <form className="form-stack inline-form" onSubmit={(event) => {
        event.preventDefault()
        send('/schedule', { mode, scheduledAt: new Date(scheduledAt).toISOString(), venue, inPersonFallback, notices: ['PARTY_A', 'PARTY_B'].map((party) => ({ party, ...notices[party] })) }, bi('Schedule and notices saved. Nothing was sent.', 'সভার সময় ও নোটিশের তথ্য সংরক্ষিত হয়েছে। এখান থেকে কোনো নোটিশ পাঠানো হয়নি।'))
      }}>
        <h3><Bi en="Schedule and notices" bn="সময় ও নোটিশ" /></h3>
        <p className="muted"><Bi en="Record how a person delivered each notice." bn="প্রতিটি নোটিশ কীভাবে পৌঁছানো হয়েছে তা লিখুন।" /></p>
        <label htmlFor="mediation-mode"><Bi en="Meeting type" bn="সভার ধরন" /></label><select id="mediation-mode" value={mode} onChange={(event) => setMode(event.target.value)}>{['IN_PERSON', 'REMOTE', 'HYBRID'].map((code) => <option key={code} value={code}>{say(code)}</option>)}</select>
        <label htmlFor="mediation-time"><Bi en="Date and time" bn="তারিখ ও সময়" /></label><input id="mediation-time" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required />
        {mode === 'IN_PERSON' && <><label htmlFor="mediation-venue"><Bi en="Venue" bn="স্থান" /></label><input id="mediation-venue" value={venue} onChange={(event) => setVenue(event.target.value)} minLength="3" maxLength="200" required /></>}
        {mode !== 'IN_PERSON' && <><label htmlFor="mediation-fallback"><Bi en="In-person backup plan" bn="অনলাইনে সভা না হলে সরাসরি বসার পরিকল্পনা" /></label><textarea id="mediation-fallback" value={inPersonFallback} onChange={(event) => setInPersonFallback(event.target.value)} minLength="10" maxLength="300" required /></>}
        {['PARTY_A', 'PARTY_B'].map((party) => <fieldset key={party}><legend><Term code={party} /> · <Bi en="notice" bn="নোটিশ" /></legend><label htmlFor={`${party}-notice-state`}><Bi en="Delivered?" bn="পৌঁছেছে?" /></label><select id={`${party}-notice-state`} value={notices[party].deliveryState} onChange={(event) => setNotices((current) => ({ ...current, [party]: { ...current[party], deliveryState: event.target.value } }))}>{['NOT_DELIVERED', 'DELIVERED'].map((code) => <option key={code} value={code}>{say(code)}</option>)}</select><label htmlFor={`${party}-notice-reason`}><Bi en="How / why" bn="কীভাবে / কেন" /></label><textarea id={`${party}-notice-reason`} value={notices[party].reason} onChange={(event) => setNotices((current) => ({ ...current, [party]: { ...current[party], reason: event.target.value } }))} minLength="10" maxLength="300" required /></fieldset>)}
        <button type="submit" disabled={busy}><Bi en="Save schedule" bn="সময়সূচি সংরক্ষণ" /></button>
      </form>}

      {mediatorCanAct && mediation.stage === 'SCHEDULING_NOTICES' && <button type="button" disabled={busy} className="secondary-button" onClick={() => send('/advance', {}, bi('Next: document review.', 'পরের ধাপ: নথি যাচাই।'))}><Bi en="Continue to documents" bn="নথি যাচাইয়ে যান" /></button>}

      {mediatorCanAct && mediation.stage === 'DOCUMENT_REVIEW' && <section className="form-stack inline-form" aria-labelledby="med-documents-title">
        <h3 id="med-documents-title"><Bi en="Document review" bn="নথি যাচাই" /></h3>
        {mediation.documents.length ? <ul className="plain-list">{mediation.documents.map((document) => <li key={document.id}>{document.label} · <Term code={document.qualityState} /> · v{num(document.currentVersion)}</li>)}</ul> : <p><Bi en="No documents on this case." bn="এই মামলায় কোনো নথি নেই।" /></p>}
        {mediation.documentsReviewedAt ? <p role="status"><Bi en="Reviewed" bn="যাচাই হয়েছে" /> {when(mediation.documentsReviewedAt)} · {mediation.documentReviewReason}</p> : <form className="form-stack" onSubmit={(event) => { event.preventDefault(); send('/documents/review', { reason: documentReason }, bi('Document review saved.', 'নথি যাচাই সংরক্ষিত।')) }}><label htmlFor="med-document-reason"><Bi en="Review note" bn="যাচাইয়ের নোট" /></label><textarea id="med-document-reason" value={documentReason} onChange={(event) => setDocumentReason(event.target.value)} minLength="10" maxLength="500" required /><button type="submit" disabled={busy}><Bi en="Save review" bn="যাচাই সংরক্ষণ" /></button></form>}
        {mediation.documentsReviewedAt && <button type="button" disabled={busy} className="secondary-button" onClick={() => send('/advance', {}, bi('Next: attendance.', 'পরের ধাপ: উপস্থিতি।'))}><Bi en="Continue to attendance" bn="উপস্থিতিতে যান" /></button>}
      </section>}

      {mediatorCanAct && mediation.stage === 'ATTENDANCE' && <form className="form-stack inline-form" onSubmit={(event) => { event.preventDefault(); send('/attendance', attendance, bi('Attendance saved.', 'উপস্থিতি সংরক্ষিত।')) }}>
        <h3><Bi en="Attendance" bn="উপস্থিতি" /></h3>
        {['partyA', 'partyB'].map((party) => <div key={party}><label htmlFor={`attendance-${party}`}><Term code={party === 'partyA' ? 'PARTY_A' : 'PARTY_B'} /></label><select id={`attendance-${party}`} value={attendance[party]} onChange={(event) => setAttendance((current) => ({ ...current, [party]: event.target.value }))} required><option value="">{bi('Choose', 'বাছাই করুন')}</option>{['ATTENDED', 'REPRESENTED', 'ABSENT'].map((code) => <option key={code} value={code}>{say(code)}</option>)}</select></div>)}
        <label htmlFor="attendance-reason"><Bi en="Note" bn="নোট" /></label><textarea id="attendance-reason" value={attendance.reason} onChange={(event) => setAttendance((current) => ({ ...current, reason: event.target.value }))} minLength="10" maxLength="500" required /><button type="submit" disabled={busy}><Bi en="Save attendance" bn="উপস্থিতি সংরক্ষণ" /></button>
        {mediation.attendance && mediation.attendance.partyA !== 'ABSENT' && mediation.attendance.partyB !== 'ABSENT' && <button type="button" disabled={busy} className="secondary-button" onClick={() => send('/advance', {}, bi('Next: mediation.', 'পরের ধাপ: মধ্যস্থতা।'))}><Bi en="Continue to mediation" bn="মধ্যস্থতায় যান" /></button>}
      </form>}

      {mediatorCanAct && mediation.stage === 'MEDIATION' && <>
        <form className="form-stack inline-form" onSubmit={(event) => { event.preventDefault(); send('/outcome', { outcome, reason: outcomeReason }, bi('Outcome saved.', 'ফলাফল সংরক্ষিত।')) }}>
          <h3><Bi en="Outcome" bn="ফলাফল" /></h3><label htmlFor="mediation-outcome"><Bi en="Result" bn="ফল" /></label><select id="mediation-outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)}>{['AGREEMENT_REACHED', 'NO_AGREEMENT', 'CONTINUED'].map((code) => <option key={code} value={code}>{say(code)}</option>)}</select><label htmlFor="mediation-outcome-reason"><Bi en="Reason or next step" bn="কারণ বা পরবর্তী ধাপ" /></label><textarea id="mediation-outcome-reason" value={outcomeReason} onChange={(event) => setOutcomeReason(event.target.value)} minLength="10" maxLength="1000" required /><button type="submit" disabled={busy}><Bi en="Save outcome" bn="ফলাফল সংরক্ষণ" /></button>
        </form>
        {mediation.outcome === 'AGREEMENT_REACHED' && <form className="form-stack inline-form" onSubmit={(event) => { event.preventDefault(); send('/draft', { template, notes, identifiersRemoved }, bi('Draft ready. It is not final; review it.', 'খসড়া তৈরি। এটি চূড়ান্ত নয়; পর্যালোচনা করুন।')) }}>
          <h3><Bi en="Draft the settlement" bn="মীমাংসার খসড়া" /></h3><p className="muted"><Bi en="Anonymised notes only; they may go to the AI service and are not stored." bn="শুধু পরিচয় মুছে দেওয়া নোট লিখুন। নোটটি এআই সেবায় পাঠানো হতে পারে; এই ধাপে আমাদের নথিতে তা রাখা হয় না।" /></p><label htmlFor="settlement-template"><Bi en="Template" bn="নমুনা" /></label><select id="settlement-template" value={template} onChange={(event) => setTemplate(event.target.value)}>{['MAINTENANCE', 'PROPERTY', 'LABOUR'].map((code) => <option key={code} value={code}>{say(code)}</option>)}</select><label htmlFor="mediator-notes"><Bi en="Anonymised notes" bn="নামহীন নোট" /></label><textarea id="mediator-notes" value={notes} onChange={(event) => setNotes(event.target.value)} minLength="10" maxLength="3000" required /><label className="checkbox-label" htmlFor="identifiers-removed"><input id="identifiers-removed" type="checkbox" checked={identifiersRemoved} onChange={(event) => setIdentifiersRemoved(event.target.checked)} required /><Bi en="I removed names, phone numbers, addresses and ID numbers." bn="নাম, ফোন নম্বর, ঠিকানা ও পরিচয় নম্বর মুছে দিয়েছি।" /></label><button type="submit" disabled={busy || !identifiersRemoved}><Bi en="Prepare draft" bn="খসড়া তৈরি করুন" /></button>
        </form>}
      </>}

      {mediatorCanAct && mediation.stage === 'DRAFT_OUTCOME' && mediation.draft && <section className="form-stack inline-form" aria-labelledby="settlement-title">
        <h3 id="settlement-title"><Term code={mediation.draft.template} /> · <Bi en="draft" bn="খসড়া" /> v{num(mediation.draft.version)}</h3><p className="muted">{mediation.draft.aiAssisted ? bi('AI-assisted', 'এআই-সহায়তায়') : bi('Rules-only placeholder', 'শুধু নিয়মভিত্তিক')} · <Term code={mediation.draft.status} /></p>
        {mediation.draft.sections.map((section) => <div key={section.key}><h4>{section.label} {section.aiFilled && <span className="badge wait-badge">{bi('AI', 'এআই')}</span>}</h4>{mediation.draft.status === 'HUMAN_REVIEW' ? <><label htmlFor={`draft-section-${section.key}`}><Bi en="Reviewed text" bn="পর্যালোচিত লেখা" /></label><textarea id={`draft-section-${section.key}`} value={draftEdits[section.key] ?? section.text} onChange={(event) => setDraftEdits((current) => ({ ...current, [section.key]: event.target.value }))} maxLength="500" /></> : <p>{section.text}</p>}</div>)}
        <p className="safety-note"><Bi en="Check every amount, date and duty. AI can miss contradictions." bn="প্রতিটি অঙ্ক, তারিখ ও দায়িত্ব যাচাই করুন। এআই পরস্পরবিরোধী তথ্য চোখ এড়িয়ে যেতে পারে।" /></p>
        {mediation.draft.inconsistencies.map((warning, index) => <p className="error" key={`${warning}-${index}`}>{warning}</p>)}
        {mediation.draft.status === 'HUMAN_REVIEW' && <>
          <form className="form-stack" onSubmit={async (event) => {
            event.preventDefault()
            const result = await send('/draft/amend', { template: mediation.draft.template, sections: mediation.draft.sections.map(({ key }) => ({ key, text: draftEdits[key] ?? '' })), reason: amendReason }, bi('Edits saved as a new version. Record the review again.', 'সম্পাদনা নতুন সংস্করণ হিসেবে সংরক্ষিত। আবার পর্যালোচনা লিখুন।'))
            if (result) { setAcknowledgements({ partyAUnderstands: false, partyAConsents: false, partyBUnderstands: false, partyBConsents: false }); setReviewReason(''); setAmendReason('') }
          }}>
            <label htmlFor="settlement-amend-reason"><Bi en="Reason for edits" bn="সম্পাদনার কারণ" /></label><textarea id="settlement-amend-reason" value={amendReason} onChange={(event) => setAmendReason(event.target.value)} minLength="10" maxLength="1000" required /><button type="submit" disabled={busy}><Bi en="Save edits as new version" bn="নতুন সংস্করণ সংরক্ষণ" /></button>
          </form>
          <form className="form-stack" onSubmit={(event) => { event.preventDefault(); send('/draft/review', { ...acknowledgements, reason: reviewReason }, bi('Review saved. Signing opens only if both parties understood and agreed.', 'পর্যালোচনা সংরক্ষিত। দুই পক্ষ বুঝে সম্মতি দিলে তবেই স্বাক্ষর।')) }}>
          <h4><Bi en="Did the parties understand and agree?" bn="পক্ষরা কি বুঝেছেন ও সম্মত?" /></h4><p className="muted"><Bi en="Your attestation, not proof of identity or capacity." bn="আপনি যা যাচাই করেছেন, এটি তার বিবরণ; এতে কারও পরিচয় বা সিদ্ধান্ত নেওয়ার সক্ষমতা প্রমাণ হয় না।" /></p>
          {Object.entries({ partyAUnderstands: ['Party A understood', 'পক্ষ ক বুঝেছেন'], partyAConsents: ['Party A agrees to sign', 'পক্ষ ক স্বাক্ষরে সম্মত'], partyBUnderstands: ['Party B understood', 'পক্ষ খ বুঝেছেন'], partyBConsents: ['Party B agrees to sign', 'পক্ষ খ স্বাক্ষরে সম্মত'] }).map(([key, [en, bn]]) => <label className="checkbox-label" htmlFor={key} key={key}><input id={key} type="checkbox" checked={acknowledgements[key]} onChange={(event) => setAcknowledgements((current) => ({ ...current, [key]: event.target.checked }))} /><Bi en={en} bn={bn} /></label>)}
          <label htmlFor="settlement-review-reason"><Bi en="Review reason" bn="পর্যালোচনার কারণ" /></label><textarea id="settlement-review-reason" value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} minLength="10" maxLength="1000" required /><button type="submit" disabled={busy}><Bi en="Save review" bn="পর্যালোচনা সংরক্ষণ" /></button>
          </form>
        </>}
      </section>}

      {signing && <section className="form-stack inline-form" aria-labelledby="signature-title">
        <h3 id="signature-title"><Bi en="Signatures" bn="স্বাক্ষর" /></h3><p className="muted"><Bi en="Party A, Party B and the mediator sign the same version. Choose a party only after checking who they are." bn="পক্ষ ক, পক্ষ খ ও মধ্যস্থতাকারী একই সংস্করণে স্বাক্ষর করেন। পরিচয় যাচাইয়ের পরেই পক্ষ বাছাই করুন।" /></p><p><strong><Bi en="A valid signature does not prove identity, consent or legal effect." bn="স্বাক্ষরটি যাচাইয়ে মিললেও তাতে পরিচয়, সম্মতি বা আইনি কার্যকারিতা প্রমাণ হয় না।" /></strong></p>
        <ol className="plain-list">{signatures.map((record) => <li key={record.signerRole}><strong><Term code={record.signerRole} /></strong> · {when(record.receivedAt)} · {record.documentHash.slice(0, 12)}…</li>)}</ol>
        <label htmlFor="signature-passphrase"><Bi en="Local passphrase for encrypted offline signature packets" bn="অফলাইন স্বাক্ষরের পাসফ্রেজ" /></label><input id="signature-passphrase" type="password" autoComplete="off" minLength="8" value={signingPassphrase} onChange={(event) => setSigningPassphrase(event.target.value)} />
        <p className="muted"><Bi en="The signing key is made in this browser and thrown away. Offline packets hold no document text." bn="স্বাক্ষরের জন্য ব্যবহৃত চাবি এই ব্রাউজারে তৈরি হয় এবং পরে মুছে যায়। ইন্টারনেট ছাড়া রাখা স্বাক্ষরের সঙ্গে নথির লেখা থাকে না।" /></p>
        <label htmlFor="signer-role"><Bi en="Signer role witnessed by mediator" bn="যিনি স্বাক্ষর করছেন" /></label><select id="signer-role" value={signerRole} onChange={(event) => setSignerRole(event.target.value)}>{['PARTY_A', 'PARTY_B', 'MEDIATOR'].filter((item) => !signedRoles.has(item)).map((item) => <option key={item} value={item}>{say(item)}</option>)}</select>
        <button type="button" disabled={busy || !signerRole || signingPassphrase.length < 8 || (signerRole === 'MEDIATOR' && missingPartySignatures)} onClick={sign}>{bi(`Create ${signerRole.replaceAll('_', ' ')} signature${online ? ' and sync' : ' offline'}`, `${signerBn[signerRole]}-এর স্বাক্ষর ${online ? 'দিন ও সিঙ্ক করুন' : 'অফলাইনে দিন'}`)}</button>
        <p role="status">{online ? bi('Connection: online', 'সংযোগ: অনলাইন') : bi('Connection: offline', 'সংযোগ: অফলাইন')} · {bi(`encrypted signatures awaiting sync: ${queue.length}`, `সিঙ্কের অপেক্ষায়: ${num(queue.length)}`)}</p>
        {queue.length > 0 && <><button type="button" className="secondary-button" disabled={!online || signingPassphrase.length < 8 || busy} onClick={syncPending}><Bi en="Sync now" bn="এখন সিঙ্ক করুন" /></button><ul className="plain-list">{queue.map((item) => <li key={item.id}><Bi en="Encrypted signature" bn="এনক্রিপ্ট করা স্বাক্ষর" /> · {when(item.updatedAt)}</li>)}</ul></>}
        {verifier}
        {mediation.stage !== 'SIGNATURES' && <p className="safety-note"><Term code={mediation.legalEffectState} />. <Bi en="E-signing alone does not create a decree." bn="শুধু ই-স্বাক্ষর করলেই এটি আদালতের ডিক্রি হয়ে যায় না।" /></p>}
      </section>}

      {role === 'CLAO' && mediation.stage === 'PENDING_CLAO_CERTIFICATION' && <section className="form-stack inline-form" aria-labelledby="clao-title">
        <h3 id="clao-title"><Bi en="Legal review and CLAO certification" bn="আইনি পর্যালোচনা ও সিএলএও সনদ" /></h3><p className="safety-note"><strong><Term code={mediation.legalEffectState} /></strong>. <Bi en="Applicability depends on date and area; the system does not decide it." bn="আইনটি প্রযোজ্য কি না, তা তারিখ ও এলাকার ওপর নির্ভর করে। সিস্টেম এই সিদ্ধান্ত নেয় না।" /></p>
        <p><Bi en="Signatures must verify first. Record the legal basis and any Gazette, date or area reference." bn="আগে স্বাক্ষর যাচাই হতে হবে। আইনি ভিত্তি ও গেজেট, তারিখ বা এলাকার সূত্র লিখুন।" /></p>
        {mediation.legalApplicability !== 'APPLICABLE_VERIFIED' ? <form className="form-stack" onSubmit={(event) => { event.preventDefault(); send('/legal-applicability', { applicability: 'APPLICABLE_VERIFIED', basis: applicabilityBasis }, bi('Applicability recorded. Certification is a separate step.', 'আইনটি প্রযোজ্য বলে যাচাইয়ের তথ্য নথিভুক্ত হয়েছে। সনদ দেওয়া আলাদা ধাপ।')) }}><label htmlFor="legal-basis"><Bi en="Verified legal basis" bn="যাচাইকৃত আইনি ভিত্তি" /></label><textarea id="legal-basis" value={applicabilityBasis} onChange={(event) => setApplicabilityBasis(event.target.value)} minLength="10" maxLength="500" required /><button type="submit" disabled={busy}><Bi en="Record verified applicability" bn="প্রযোজ্যতা লিখুন" /></button><button type="button" className="secondary-button" disabled={busy} onClick={() => send('/legal-applicability', { applicability: 'UNVERIFIED' }, bi('Left unverified; final status is blocked.', 'প্রযোজ্যতা যাচাই হয়নি। তাই মামলাটি চূড়ান্ত করা যাবে না।'))}><Bi en="Leave unverified" bn="যাচাইহীন রাখুন" /></button></form> : <><p><Bi en="Legal basis:" bn="আইনি ভিত্তি:" /> {mediation.legalReviewBasis}</p><form className="form-stack" onSubmit={(event) => { event.preventDefault(); send('/certify', { reason: certificateReason }, bi('CLAO certification recorded. No court-decree finding is made.', 'সিএলএওর সনদ নথিভুক্ত হয়েছে। এটি আদালতের ডিক্রি কি না, সে সিদ্ধান্ত এখানে দেওয়া হয়নি।')) }}><label htmlFor="certificate-reason"><Bi en="Certification reason" bn="সনদের কারণ" /></label><textarea id="certificate-reason" value={certificateReason} onChange={(event) => setCertificateReason(event.target.value)} minLength="10" maxLength="500" required /><button type="submit" disabled={busy}><Bi en="Record CLAO certification" bn="সনদ লিখুন" /></button></form></>}
      </section>}

      {mediation.stage === 'CERTIFIED_FINAL' && <p role="status" className="safety-note"><Bi en="CLAO certification recorded. Court-decree status is not decided here." bn="সিএলএওর সনদ নথিভুক্ত হয়েছে। এটি আদালতের ডিক্রি কি না, সে সিদ্ধান্ত এখানে দেওয়া হয় না।" /></p>}
      {['SIGNATURES', 'PENDING_CLAO_CERTIFICATION', 'CERTIFIED_FINAL'].includes(mediation.stage) && role !== 'CLAO' && !signing && <p>{verifier}</p>}
    </>}
  </Panel>
}
