import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../services/api.js'
import { listDrafts, loadDraft, removeDraft, saveDraft } from '../utils/offlineDrafts.js'

const blank = () => ({ applicantName: '', translatorName: '', typistName: '', helperPhone: '', originalLanguage: 'Marma', originalStatement: '', translatedStatement: '', caseType: 'LAND', consentAttestation: '', originalConfirmed: false, translationConfirmed: false, contactChannel: 'IN_PERSON', contactValue: '', safeTime: '' })
const checklist = {
  FAMILY: ['Applicant identity evidence', 'Relationship record', 'Relevant communication'],
  LAND: ['Applicant identity evidence', 'Land record or deed', 'Location or plot details', 'Witness or other supporting record'],
  LABOUR: ['Applicant identity evidence', 'Employment or wage record', 'Employer communication'],
  CRIMINAL: ['Applicant identity evidence', 'Police or court document', 'Incident chronology'],
  OTHER: ['Applicant identity evidence', 'Problem chronology', 'Available supporting record'],
}
const emptyDraft = () => crypto.randomUUID()

export default function AssistedIntake({ session }) {
  const ownerId = String(session.user.id)
  const [passphrase, setPassphrase] = useState('')
  const [form, setForm] = useState(blank)
  const [draftId, setDraftId] = useState(emptyDraft)
  const [mode, setMode] = useState('CREATE')
  const [applicationId, setApplicationId] = useState('')
  const [baseVersion, setBaseVersion] = useState(null)
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString())
  const [drafts, setDrafts] = useState([])
  const [online, setOnline] = useState(navigator.onLine)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [resolutionReason, setResolutionReason] = useState('')
  const [saving, setSaving] = useState(false)
  const saveInFlight = useRef(Promise.resolve())

  const refreshDrafts = useCallback(async () => { setDrafts(await listDrafts(ownerId)) }, [ownerId])
  useEffect(() => { listDrafts(ownerId).then(setDrafts).catch(() => setError('Local draft storage is unavailable.')) }, [ownerId])

  useEffect(() => {
    if (passphrase.length < 8 || !(form.applicantName || form.originalStatement)) return
    const timer = setTimeout(() => {
      setSaving(true)
      saveInFlight.current = saveDraft({ id: draftId, ownerId, status: 'DRAFT', passphrase,
        value: { kind: 'DRAFT', mode, form, applicationId, baseVersion, startedAt } })
        .then(refreshDrafts).catch(() => setError('Could not save the encrypted local draft.')).finally(() => setSaving(false))
    }, 450)
    return () => clearTimeout(timer)
  }, [form, passphrase, draftId, ownerId, mode, applicationId, baseVersion, startedAt, refreshDrafts])

  function change(field, value) { setForm((current) => ({ ...current, [field]: value })) }

  function reset() {
    setForm(blank())
    setDraftId(emptyDraft())
    setMode('CREATE')
    setApplicationId('')
    setBaseVersion(null)
    setStartedAt(new Date().toISOString())
    setConflict(null)
  }

  async function openLocal(id) {
    setError('')
    try {
      const row = await loadDraft(id, ownerId, passphrase)
      if (row.status === 'DRAFT') {
        setDraftId(id)
        setForm(row.value.form)
        setMode(row.value.mode)
        setApplicationId(row.value.applicationId)
        setBaseVersion(row.value.baseVersion)
        setStartedAt(row.value.startedAt)
        setNotice('Encrypted draft unlocked and integrity verified.')
      } else if (row.status === 'CONFLICT') {
        setConflict({ id, ...row.value.conflict })
      } else setNotice('Queued mutation integrity verified. Use Sync now when connected.')
    } catch (failure) { setError(failure.message) }
  }

  const syncQueued = useCallback(async (secret = passphrase) => {
    if (secret.length < 8 || !navigator.onLine) return
    setError('')
    for (const row of await listDrafts(ownerId)) {
      if (row.status !== 'QUEUED') continue
      let saved
      try {
        saved = await loadDraft(row.id, ownerId, secret)
        const { kind, payload, applicationId: target } = saved.value
        const result = await api(kind === 'CREATE' ? '/api/assisted' : `/api/assisted/${target}/revisions`, { token: session.token, method: 'POST', body: payload })
        await removeDraft(row.id)
        setReceipt(result)
        setNotice(kind === 'CREATE' && !result.lookupCode
          ? `${result.applicationId} was already synced. Its one-time lookup code is not available on retry; contact an authorised officer through an agreed safe route if needed.`
          : `${kind === 'CREATE' ? 'Created' : 'Updated'} ${result.applicationId}; encrypted queued copy purged.`)
      } catch (failure) {
        if (failure.status === 409 && failure.data?.kind === 'CONFLICT' && saved) {
          await saveDraft({ id: row.id, ownerId, status: 'CONFLICT', passphrase: secret, value: { ...saved.value, conflict: failure.data, resolutionMutationId: crypto.randomUUID() } })
          setConflict({ id: row.id, ...failure.data })
          setNotice('A version conflict needs human review. Both versions are shown below.')
        } else { setError(failure.message || 'Sync is waiting for a working connection.'); break }
      }
    }
    await refreshDrafts()
  }, [ownerId, passphrase, refreshDrafts, session.token])

  useEffect(() => {
    const disconnected = () => setOnline(false)
    const connected = () => { setOnline(true); if (passphrase.length >= 8) syncQueued(passphrase).catch(() => {}) }
    window.addEventListener('offline', disconnected)
    window.addEventListener('online', connected)
    return () => { window.removeEventListener('offline', disconnected); window.removeEventListener('online', connected) }
  }, [passphrase, syncQueued])

  async function queue(event) {
    event.preventDefault()
    setError('')
    if (passphrase.length < 8) { setError('Set a local passphrase of at least 8 characters before saving sensitive draft text.'); return }
    try {
      await saveInFlight.current
      const clientMutationId = crypto.randomUUID()
      const payload = mode === 'CREATE' ? {
        temporaryId: draftId, clientMutationId, offlineCreatedAt: startedAt,
        applicantName: form.applicantName, translatorName: form.translatorName, typistName: form.typistName,
        ...(form.helperPhone ? { helperPhone: form.helperPhone } : {}), originalLanguage: form.originalLanguage,
        originalStatement: form.originalStatement, translatedStatement: form.translatedStatement,
        caseType: form.caseType, consentAttestation: form.consentAttestation,
        originalConfirmed: form.originalConfirmed, translationConfirmed: form.translationConfirmed,
        contactChannel: form.contactChannel, ...(form.contactChannel === 'PHONE' ? { contactValue: form.contactValue } : {}),
        ...(form.safeTime ? { safeTime: form.safeTime } : {}),
      } : { temporaryId: draftId, clientMutationId, baseVersion,
        originalStatement: form.originalStatement, translatedStatement: form.translatedStatement,
        originalConfirmed: form.originalConfirmed, translationConfirmed: form.translationConfirmed }
      await saveDraft({ id: draftId, ownerId, status: 'QUEUED', passphrase, value: { kind: mode, payload, applicationId } })
      setNotice(`Queued with temporary ID ${draftId}. It will sync once connected; a retry uses the same mutation ID.`)
      reset()
      await refreshDrafts()
      if (navigator.onLine) await syncQueued()
    } catch (failure) { setError(failure.message) }
  }

  async function openRevision(event) {
    event.preventDefault()
    setError('')
    try {
      const record = await api(`/api/assisted/${applicationId.trim().toUpperCase()}`, { token: session.token })
      setMode('REVISION')
      setApplicationId(record.applicationId)
      setBaseVersion(record.version)
      setDraftId(emptyDraft())
      setStartedAt(new Date().toISOString())
      setForm({ ...blank(), originalStatement: record.originalStatement, translatedStatement: record.translatedStatement,
        originalConfirmed: record.originalConfirmed, translationConfirmed: record.translationConfirmed })
      setNotice(`Limited UDC correction opened at version ${record.version}. Server audit integrity: ${record.integrityValid ? 'valid' : 'check required'}.`)
    } catch (failure) { setError(failure.message) }
  }

  async function resolve(choice) {
    setError('')
    try {
      const saved = await loadDraft(conflict.id, ownerId, passphrase)
      const result = await api(`/api/assisted/${conflict.applicationId}/conflicts/resolve`, { token: session.token, method: 'POST', body: {
        temporaryId: saved.value.payload.temporaryId, clientMutationId: saved.value.resolutionMutationId,
        conflictMutationId: conflict.conflictMutationId, expectedVersion: conflict.serverVersion,
        choice, reason: resolutionReason,
      } })
      await removeDraft(conflict.id)
      await refreshDrafts()
      setConflict(null)
      setResolutionReason('')
      setNotice(`Human resolution recorded: ${result.choice.toLowerCase()} version retained at version ${result.version}.`)
    } catch (failure) { setError(failure.message) }
  }

  async function verifyIntegrity() {
    setError('')
    try {
      for (const item of drafts) await loadDraft(item.id, ownerId, passphrase)
      setNotice(`${drafts.length} local encrypted draft${drafts.length === 1 ? '' : 's'} verified. Each ciphertext hash and AES-GCM tag matches.`)
    } catch (failure) { setError(failure.message) }
  }

  function loadExample() {
    setForm({ ...blank(), applicantName: 'Fictional Nuching Marma', translatorName: 'Fictional Marma translator', typistName: session.user.displayName,
      helperPhone: '01700000000', originalLanguage: 'Marma', originalStatement: 'Fictional original account spoken in Marma, captured by the named typist.',
      translatedStatement: 'Fictional Bangla translation: a land record needs human review.', caseType: 'LAND',
      consentAttestation: 'Oral assisted-intake consent was given through the named translator for this fictional demo.', safeTime: 'Weekday morning' })
  }

  return <section aria-labelledby="assisted-title">
    <Link to="/">← Workspace</Link>
    <p className="eyebrow">UDC assisted access · fictional data only</p>
    <h1 id="assisted-title">Assisted intake and offline drafts</h1>
    <p className="safety-note"><strong>Legal aid is free.</strong> No UDC worker may charge for this service. The applicant's words, translation, and typist are recorded separately; an officer checks them later.</p>
    <p role="status">Connection: {online ? 'online' : 'offline'} · {saving ? 'saving encrypted draft…' : 'local draft ready'}</p>
    <p className="muted">A passphrase encrypts drafts on this device and is never sent to the server. Keep it safe; a lost passphrase cannot be recovered. Signing out clears all local drafts on this shared device.</p>
    <div className="inline-form form-stack"><label htmlFor="draft-passphrase">Local draft passphrase</label><input id="draft-passphrase" name="draftPassphrase" type="password" minLength="8" autoComplete="off" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} /><button type="button" className="secondary-button" onClick={() => syncQueued()}>Sync now</button><button type="button" className="secondary-button" onClick={verifyIntegrity}>Verify local integrity</button></div>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    {receipt?.lookupCode && <p className="safety-note">Application {receipt.applicationId} · lookup code shown once: <code>{receipt.lookupCode}</code>. Share only by an agreed safe route.</p>}

    <section className="card" aria-labelledby="drafts-title"><h2 id="drafts-title">Local encrypted drafts and queue</h2><p className="muted">Only temporary IDs and states are visible until you unlock a draft. Synced copies are purged.</p>{drafts.length === 0 ? <p>No local drafts.</p> : <ul className="plain-list">{drafts.map((item) => <li key={item.id}><span>{item.id} · {item.status}</span><button type="button" className="secondary-button" onClick={() => openLocal(item.id)}>Unlock / verify</button></li>)}</ul>}</section>

    <section className="card" aria-labelledby="revision-title"><h2 id="revision-title">Limited post-submission correction</h2><p className="muted">Only your own pending assisted intake, within the demo correction window. A DLAO takes over after review.</p><form onSubmit={openRevision} className="form-stack inline-form"><label htmlFor="assisted-id">Application ID</label><input id="assisted-id" name="applicationId" autoComplete="off" value={applicationId} onChange={(event) => setApplicationId(event.target.value)} required /><button type="submit" className="secondary-button">Open limited correction</button></form></section>

    {conflict && <section className="card safety-card" aria-labelledby="conflict-title"><h2 id="conflict-title">Human conflict review</h2><p>The server changed after the local edit began. Neither version was silently overwritten.</p><div className="dashboard-actions"><div><h3>Server version {conflict.serverVersion}</h3><p><strong>Original:</strong> {conflict.server.originalStatement}</p><p><strong>Translation:</strong> {conflict.server.translatedStatement}</p></div><div><h3>Local queued version</h3><p><strong>Original:</strong> {conflict.local.originalStatement}</p><p><strong>Translation:</strong> {conflict.local.translatedStatement}</p></div></div><label htmlFor="resolution-reason">Reason for human choice</label><textarea id="resolution-reason" name="resolutionReason" autoComplete="off" value={resolutionReason} onChange={(event) => setResolutionReason(event.target.value)} minLength="10" maxLength="500" required /><div className="choice-row"><button type="button" onClick={() => resolve('SERVER')} disabled={resolutionReason.trim().length < 10}>Keep server version</button><button type="button" className="secondary-button" onClick={() => resolve('LOCAL')} disabled={resolutionReason.trim().length < 10}>Apply local as new revision</button></div></section>}

    <section className="card" aria-labelledby="form-title"><h2 id="form-title">{mode === 'CREATE' ? 'New assisted application' : `Correct ${applicationId} from version ${baseVersion}`}</h2>
      {mode === 'CREATE' && <button type="button" className="secondary-button" onClick={loadExample}>Load fictional Nuching example</button>}
      <form onSubmit={queue} className="form-stack">
        {mode === 'CREATE' && <>
          <label htmlFor="applicant-name">Applicant name</label><input id="applicant-name" name="applicantName" autoComplete="off" value={form.applicantName} onChange={(event) => change('applicantName', event.target.value)} minLength="2" maxLength="120" required />
          <p className="muted">Helper: {session.user.displayName} (signed-in UDC worker). Translator and typist may be different people.</p>
          <label htmlFor="translator-name">Translator name</label><input id="translator-name" name="translatorName" autoComplete="off" value={form.translatorName} onChange={(event) => change('translatorName', event.target.value)} minLength="2" maxLength="120" required />
          <label htmlFor="typist-name">Typist name</label><input id="typist-name" name="typistName" autoComplete="off" value={form.typistName} onChange={(event) => change('typistName', event.target.value)} minLength="2" maxLength="120" required />
          <label htmlFor="helper-phone">Helper phone (optional; never applicant contact)</label><input id="helper-phone" name="helperPhone" type="tel" autoComplete="off" value={form.helperPhone} onChange={(event) => change('helperPhone', event.target.value)} />
          <label htmlFor="original-language">Original language</label><input id="original-language" name="originalLanguage" autoComplete="off" value={form.originalLanguage} onChange={(event) => change('originalLanguage', event.target.value)} minLength="2" maxLength="60" required />
          <label htmlFor="case-type">Case type for document checklist</label><select id="case-type" name="caseType" autoComplete="off" value={form.caseType} onChange={(event) => change('caseType', event.target.value)}>{Object.keys(checklist).map((type) => <option key={type}>{type}</option>)}</select>
          <p>Checklist to discuss, not an eligibility decision: {checklist[form.caseType].join(' · ')}. Missing items remain visibly missing.</p>
        </>}
        <label htmlFor="original-statement">Original statement ({form.originalLanguage}; as supplied, not a translation)</label><textarea id="original-statement" name="originalStatement" autoComplete="off" value={form.originalStatement} onChange={(event) => change('originalStatement', event.target.value)} minLength="5" maxLength="4000" required />
        <label htmlFor="translated-statement">Translated / typed Bangla statement</label><textarea id="translated-statement" name="translatedStatement" autoComplete="off" value={form.translatedStatement} onChange={(event) => change('translatedStatement', event.target.value)} minLength="5" maxLength="4000" required />
        <label className="checkbox-label" htmlFor="original-confirmed"><input id="original-confirmed" name="originalConfirmed" type="checkbox" checked={form.originalConfirmed} onChange={(event) => change('originalConfirmed', event.target.checked)} />Applicant orally confirmed the original statement after read-back</label>
        <label className="checkbox-label" htmlFor="translation-confirmed"><input id="translation-confirmed" name="translationConfirmed" type="checkbox" checked={form.translationConfirmed} onChange={(event) => change('translationConfirmed', event.target.checked)} />Applicant orally confirmed the translation after read-back</label>
        {mode === 'CREATE' && <>
          <label htmlFor="consent-attestation">Oral assisted-intake consent attestation</label><textarea id="consent-attestation" name="consentAttestation" autoComplete="off" value={form.consentAttestation} onChange={(event) => change('consentAttestation', event.target.value)} minLength="10" maxLength="500" required />
          <label htmlFor="contact-channel">Safe applicant contact</label><select id="contact-channel" name="contactChannel" autoComplete="off" value={form.contactChannel} onChange={(event) => change('contactChannel', event.target.value)}><option value="IN_PERSON">In person; do not use helper phone</option><option value="PHONE">Applicant-owned safe phone, explicitly provided</option></select>
          {form.contactChannel === 'PHONE' && <><label htmlFor="applicant-phone">Applicant-owned safe phone</label><input id="applicant-phone" name="applicantPhone" type="tel" autoComplete="off" value={form.contactValue} onChange={(event) => change('contactValue', event.target.value)} required /></>}
          <label htmlFor="safe-time">Safe time (optional)</label><input id="safe-time" name="safeTime" autoComplete="off" value={form.safeTime} onChange={(event) => change('safeTime', event.target.value)} maxLength="100" />
        </>}
        <button type="submit">Queue encrypted {mode === 'CREATE' ? 'application' : 'correction'}</button>
      </form>
    </section>
  </section>
}
