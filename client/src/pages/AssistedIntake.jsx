import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../services/api.js'
import { listDrafts, loadDraft, removeDraft, saveDraft } from '../utils/offlineDrafts.js'
import { bi, num, say } from '../components/Bi.jsx'

const blank = () => ({ applicantName: '', translatorName: '', typistName: '', helperPhone: '', originalLanguage: 'Marma', originalStatement: '', translatedStatement: '', caseType: 'LAND', consentAttestation: '', originalConfirmed: false, translationConfirmed: false, contactChannel: 'IN_PERSON', contactValue: '', safeTime: '' })
const checklist = {
  FAMILY: ['Applicant identity evidence', 'Relationship record', 'Relevant communication'],
  LAND: ['Applicant identity evidence', 'Land record or deed', 'Location or plot details', 'Witness or other supporting record'],
  LABOUR: ['Applicant identity evidence', 'Employment or wage record', 'Employer communication'],
  CRIMINAL: ['Applicant identity evidence', 'Police or court document', 'Incident chronology'],
  OTHER: ['Applicant identity evidence', 'Problem chronology', 'Available supporting record'],
}
const itemsBn = {
  'Applicant identity evidence': 'আবেদনকারীর পরিচয়ের প্রমাণ', 'Relationship record': 'সম্পর্কের প্রমাণ', 'Relevant communication': 'প্রাসঙ্গিক যোগাযোগ',
  'Land record or deed': 'জমির রেকর্ড বা দলিল', 'Location or plot details': 'অবস্থান বা দাগের তথ্য', 'Witness or other supporting record': 'সাক্ষী বা অন্য সহায়ক রেকর্ড',
  'Employment or wage record': 'চাকরি বা মজুরির রেকর্ড', 'Employer communication': 'মালিকের সাথে যোগাযোগ', 'Police or court document': 'পুলিশ বা আদালতের কাগজ',
  'Incident chronology': 'ঘটনার ক্রম', 'Problem chronology': 'সমস্যার ক্রম', 'Available supporting record': 'প্রাপ্ত সহায়ক রেকর্ড',
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
  useEffect(() => { listDrafts(ownerId).then(setDrafts).catch(() => setError(bi('Local draft storage is unavailable.', 'এই ডিভাইসে খসড়া রাখার জায়গা নেই।'))) }, [ownerId])

  useEffect(() => {
    if (passphrase.length < 8 || !(form.applicantName || form.originalStatement)) return
    const timer = setTimeout(() => {
      setSaving(true)
      saveInFlight.current = saveDraft({ id: draftId, ownerId, status: 'DRAFT', passphrase,
        value: { kind: 'DRAFT', mode, form, applicationId, baseVersion, startedAt } })
        .then(refreshDrafts).catch(() => setError(bi('Could not save the encrypted local draft.', 'এনক্রিপ্ট করা খসড়া সংরক্ষণ হয়নি।'))).finally(() => setSaving(false))
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
        setNotice(bi('Encrypted draft unlocked and integrity verified.', 'খসড়া খোলা হয়েছে, সত্যতা যাচাই হয়েছে।'))
      } else if (row.status === 'CONFLICT') {
        setConflict({ id, ...row.value.conflict })
      } else setNotice(bi('Queued item verified. Use Sync now when connected.', 'পাঠানোর অপেক্ষায় থাকা খসড়াটি যাচাই হয়েছে। ইন্টারনেট সংযোগ পেলে ‘এখন সিঙ্ক করুন’ চাপুন।'))
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
          ? bi(`${result.applicationId} was already synced. Its one-time code cannot be shown again; ask an authorised officer through a safe route if needed.`, `${result.applicationId} আগেই সিঙ্ক হয়েছে। এককালীন কোড আর দেখানো যাবে না; দরকার হলে নিরাপদ পথে অনুমোদিত কর্মকর্তাকে জিজ্ঞেস করুন।`)
          : bi(`${kind === 'CREATE' ? 'Created' : 'Updated'} ${result.applicationId}; encrypted queued copy purged.`, `${result.applicationId} ${kind === 'CREATE' ? 'তৈরি' : 'হালনাগাদ'} হয়েছে; এই ডিভাইসে অপেক্ষায় রাখা সুরক্ষিত কপিটি মুছে ফেলা হয়েছে।`))
      } catch (failure) {
        if (failure.status === 409 && failure.data?.kind === 'CONFLICT' && saved) {
          await saveDraft({ id: row.id, ownerId, status: 'CONFLICT', passphrase: secret, value: { ...saved.value, conflict: failure.data, resolutionMutationId: crypto.randomUUID() } })
          setConflict({ id: row.id, ...failure.data })
          setNotice(bi('A version conflict needs human review. Both versions are shown below.', 'দুটি সংস্করণের তথ্য মিলছে না। নিচে দুটিই দেখানো হয়েছে; একজন কর্মীকে যাচাই করতে হবে।'))
        } else { setError(failure.message || bi('Sync is waiting for a working connection.', 'তথ্য পাঠাতে ইন্টারনেট সংযোগ দরকার।')); break }
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
    if (passphrase.length < 8) { setError(bi('Set a local passphrase of at least 8 characters before saving sensitive draft text.', 'সংবেদনশীল খসড়া রাখার আগে কমপক্ষে ৮ অক্ষরের পাসফ্রেজ দিন।')); return }
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
      setNotice(bi(`Queued with temporary ID ${draftId}. It will sync once connected.`, `খসড়াটি অস্থায়ী নম্বর ${draftId} দিয়ে এই ডিভাইসে রাখা হয়েছে। ইন্টারনেট সংযোগ পেলে পাঠানো হবে।`))
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
      setNotice(bi(`Limited correction opened at version ${record.version}. Audit check: ${record.integrityValid ? 'valid' : 'check required'}.`, `সংস্করণ ${num(record.version)} সংশোধনের জন্য খোলা হয়েছে। রেকর্ডের অখণ্ডতা ${record.integrityValid ? 'যাচাই হয়েছে' : 'যাচাই করা দরকার'}।`))
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
      setNotice(bi(`Human resolution recorded: ${result.choice.toLowerCase()} version kept at version ${result.version}.`, `কর্মীর সিদ্ধান্ত নথিভুক্ত হয়েছে। ${say(result.choice)} সংস্করণটি রাখা হয়েছে; নতুন সংস্করণ নম্বর ${num(result.version)}।`))
    } catch (failure) { setError(failure.message) }
  }

  async function verifyIntegrity() {
    setError('')
    try {
      for (const item of drafts) await loadDraft(item.id, ownerId, passphrase)
      setNotice(bi(`${drafts.length} local encrypted draft${drafts.length === 1 ? '' : 's'} verified. Each hash and AES-GCM tag matches.`, `${num(drafts.length)}টি এনক্রিপ্ট করা খসড়া যাচাই হয়েছে। প্রতিটির হ্যাশ ও AES-GCM ট্যাগ মেলে।`))
    } catch (failure) { setError(failure.message) }
  }

  function loadExample() {
    setForm({ ...blank(), applicantName: 'Fictional Nuching Marma', translatorName: 'Fictional Marma translator', typistName: session.user.displayName,
      helperPhone: '01700000000', originalLanguage: 'Marma', originalStatement: 'Fictional original account spoken in Marma, captured by the named typist.',
      translatedStatement: 'নমুনা বাংলা অনুবাদ: জমির নথিটি একজন কর্মকর্তার দেখে দেওয়া দরকার।', caseType: 'LAND',
      consentAttestation: 'Oral assisted-intake consent was given through the named translator for this fictional demo.', safeTime: 'Weekday morning' })
  }

  const item = (name) => bi(name, itemsBn[name] || name)

  return <section aria-labelledby="assisted-title">
    <Link to="/">← {bi('Workspace', 'কর্মক্ষেত্র')}</Link>
    <p className="eyebrow">{bi('UDC assisted access · fictional data only', 'ইউডিসি সহায়তা · শুধু কাল্পনিক তথ্য')}</p>
    <h1 id="assisted-title">{bi('Assisted intake and offline drafts', 'সহায়তায় আবেদন ও অফলাইন খসড়া')}</h1>
    <p className="safety-note"><strong>{bi('Legal aid is free.', 'আইনি সহায়তা বিনামূল্যে।')}</strong> {bi("No UDC worker may charge for this. The applicant's words, the translation, and the typist are recorded separately; an officer checks them later.", 'কোনো ইউডিসি কর্মী এর জন্য টাকা নিতে পারবেন না। আবেদনকারীর কথা, অনুবাদ ও টাইপিস্ট আলাদাভাবে লেখা হয়; পরে একজন কর্মকর্তা যাচাই করেন।')}</p>
    <p role="status">{bi(`Connection: ${online ? 'online' : 'offline'}`, `সংযোগ: ${online ? 'অনলাইন' : 'অফলাইন'}`)} · {saving ? bi('saving encrypted draft…', 'খসড়া সংরক্ষণ হচ্ছে…') : bi('local draft ready', 'খসড়া প্রস্তুত')}</p>
    <p className="muted">{bi('A passphrase encrypts drafts on this device and is never sent. A lost passphrase cannot be recovered. Signing out clears local drafts.', 'পাসফ্রেজ দিয়ে এই ডিভাইসে খসড়া সুরক্ষিত থাকে; পাসফ্রেজ কোথাও পাঠানো হয় না। ভুলে গেলে খসড়া আর খোলা যাবে না। সাইন আউট করলে ডিভাইসে রাখা খসড়া মুছে যাবে।')}</p>
    <div className="inline-form form-stack"><label htmlFor="draft-passphrase">{bi('Local draft passphrase', 'খসড়ার পাসফ্রেজ')}</label><input id="draft-passphrase" name="draftPassphrase" type="password" minLength="8" autoComplete="off" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} /><button type="button" className="secondary-button" onClick={() => syncQueued()}>{bi('Sync now', 'এখন সিঙ্ক করুন')}</button><button type="button" className="secondary-button" onClick={verifyIntegrity}>{bi('Verify local integrity', 'খসড়া যাচাই করুন')}</button></div>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    {receipt?.lookupCode && <p className="safety-note">{bi(`Application ${receipt.applicationId} · lookup code shown once:`, `আবেদন ${receipt.applicationId} · কোড একবারই দেখানো হচ্ছে:`)} <code>{receipt.lookupCode}</code>. {bi('Share only by an agreed safe route.', 'শুধু সম্মত নিরাপদ পথে জানান।')}</p>}

    <section className="card" aria-labelledby="drafts-title"><h2 id="drafts-title">{bi('Local encrypted drafts and queue', 'এই ডিভাইসে রাখা সুরক্ষিত খসড়া')}</h2><p className="muted">{bi('Only temporary IDs and states show until you unlock a draft. Synced copies are deleted.', 'খসড়া না খোলা পর্যন্ত শুধু অস্থায়ী নম্বর ও অবস্থা দেখা যাবে। সার্ভারে পাঠানো হলে ডিভাইসের কপি মুছে যাবে।')}</p>{drafts.length === 0 ? <p>{bi('No local drafts.', 'এই ডিভাইসে এই ডিভাইসে এই ডিভাইসে কোনো খসড়া নেই।')}</p> : <ul className="plain-list">{drafts.map((row) => <li key={row.id}><span>{row.id} · {say(row.status)}</span><button type="button" className="secondary-button" onClick={() => openLocal(row.id)}>{bi('Unlock / verify', 'খুলে যাচাই করুন')}</button></li>)}</ul>}</section>

    <section className="card" aria-labelledby="revision-title"><h2 id="revision-title">{bi('Limited correction after submission', 'জমার পর সীমিত সংশোধন')}</h2><p className="muted">{bi('Only your own pending assisted intake, within the demo window. A DLAO takes over after review.', 'শুধু আপনার নিজের অপেক্ষমাণ আবেদন, ডেমো সময়সীমার মধ্যে। পর্যালোচনার পর ডিএলএও দায়িত্ব নেন।')}</p><form onSubmit={openRevision} className="form-stack inline-form"><label htmlFor="assisted-id">{bi('Application ID', 'আবেদন নম্বর')}</label><input id="assisted-id" name="applicationId" autoComplete="off" value={applicationId} onChange={(event) => setApplicationId(event.target.value)} required /><button type="submit" className="secondary-button">{bi('Open limited correction', 'সীমিত সংশোধন খুলুন')}</button></form></section>

    {conflict && <section className="card safety-card" aria-labelledby="conflict-title"><h2 id="conflict-title">{bi('Human conflict review', 'দুই সংস্করণের অমিল যাচাই')}</h2><p>{bi('The server changed after the local edit began. Neither version was overwritten.', 'এই ডিভাইসে সম্পাদনা শুরু করার পর সার্ভারের তথ্য বদলেছে। কোনো সংস্করণ মুছে যায়নি।')}</p><div className="dashboard-actions"><div><h3>{bi(`Server version ${conflict.serverVersion}`, `সার্ভারের সংস্করণ ${num(conflict.serverVersion)}`)}</h3><p><strong>{bi('Original:', 'মূল:')}</strong> {conflict.server.originalStatement}</p><p><strong>{bi('Translation:', 'অনুবাদ:')}</strong> {conflict.server.translatedStatement}</p></div><div><h3>{bi('Local queued version', 'এই ডিভাইসে রাখা সংস্করণ')}</h3><p><strong>{bi('Original:', 'মূল:')}</strong> {conflict.local.originalStatement}</p><p><strong>{bi('Translation:', 'অনুবাদ:')}</strong> {conflict.local.translatedStatement}</p></div></div><label htmlFor="resolution-reason">{bi('Reason for human choice', 'এই সংস্করণ রাখার কারণ')}</label><textarea id="resolution-reason" name="resolutionReason" autoComplete="off" value={resolutionReason} onChange={(event) => setResolutionReason(event.target.value)} minLength="10" maxLength="500" required /><div className="choice-row"><button type="button" onClick={() => resolve('SERVER')} disabled={resolutionReason.trim().length < 10}>{bi('Keep server version', 'সার্ভারের সংস্করণ রাখুন')}</button><button type="button" className="secondary-button" onClick={() => resolve('LOCAL')} disabled={resolutionReason.trim().length < 10}>{bi('Apply local as new revision', 'এই ডিভাইসের তথ্য নতুন সংস্করণ হিসেবে রাখুন')}</button></div></section>}

    <section className="card" aria-labelledby="form-title"><h2 id="form-title">{mode === 'CREATE' ? bi('New assisted application', 'সহায়তায় নতুন আবেদন') : bi(`Correct ${applicationId} from version ${baseVersion}`, `${applicationId} সংশোধন (সংস্করণ ${num(baseVersion)} থেকে)`)}</h2>
      {mode === 'CREATE' && <button type="button" className="secondary-button" onClick={loadExample}>{bi('Load fictional Nuching example', 'কাল্পনিক নুচিং উদাহরণ লোড করুন')}</button>}
      <form onSubmit={queue} className="form-stack">
        {mode === 'CREATE' && <>
          <label htmlFor="applicant-name">{bi('Applicant name', 'আবেদনকারীর নাম')}</label><input id="applicant-name" name="applicantName" autoComplete="off" value={form.applicantName} onChange={(event) => change('applicantName', event.target.value)} minLength="2" maxLength="120" required />
          <p className="muted">{bi(`Helper: ${session.user.displayName} (signed-in UDC worker). Translator and typist may be different people.`, `সহায়তাকারী: ${session.user.displayName} (সাইন ইন করা ইউডিসি কর্মী)। অনুবাদক ও টাইপিস্ট ভিন্ন হতে পারেন।`)}</p>
          <label htmlFor="translator-name">{bi('Translator name', 'অনুবাদকের নাম')}</label><input id="translator-name" name="translatorName" autoComplete="off" value={form.translatorName} onChange={(event) => change('translatorName', event.target.value)} minLength="2" maxLength="120" required />
          <label htmlFor="typist-name">{bi('Typist name', 'টাইপিস্টের নাম')}</label><input id="typist-name" name="typistName" autoComplete="off" value={form.typistName} onChange={(event) => change('typistName', event.target.value)} minLength="2" maxLength="120" required />
          <label htmlFor="helper-phone">{bi('Helper phone (optional; never applicant contact)', 'সহায়তাকারীর ফোন (ঐচ্ছিক; আবেদনকারীর যোগাযোগ নয়)')}</label><input id="helper-phone" name="helperPhone" type="tel" autoComplete="off" value={form.helperPhone} onChange={(event) => change('helperPhone', event.target.value)} />
          <label htmlFor="original-language">{bi('Original language', 'মূল ভাষা')}</label><input id="original-language" name="originalLanguage" autoComplete="off" value={form.originalLanguage} onChange={(event) => change('originalLanguage', event.target.value)} minLength="2" maxLength="60" required />
          <label htmlFor="case-type">{bi('Case type for document checklist', 'নথির তালিকার জন্য মামলার ধরন')}</label><select id="case-type" name="caseType" autoComplete="off" value={form.caseType} onChange={(event) => change('caseType', event.target.value)}>{Object.keys(checklist).map((type) => <option key={type} value={type}>{say(type)}</option>)}</select>
          <p>{bi('Checklist to discuss (not an eligibility decision):', 'কোন নথি লাগতে পারে, তা নিয়ে কথা বলুন। এটি যোগ্যতার সিদ্ধান্ত নয়:')} {checklist[form.caseType].map(item).join(' · ')}.</p>
        </>}
        <label htmlFor="original-statement">{bi(`Original statement (${form.originalLanguage}; as supplied, not a translation)`, `মূল বক্তব্য (${form.originalLanguage}; যেমন বলা হয়েছে, অনুবাদ নয়)`)}</label><textarea id="original-statement" name="originalStatement" autoComplete="off" value={form.originalStatement} onChange={(event) => change('originalStatement', event.target.value)} minLength="5" maxLength="4000" required />
        <label htmlFor="translated-statement">{bi('Translated / typed Bangla statement', 'বাংলায় অনুবাদ করে লেখা বক্তব্য')}</label><textarea id="translated-statement" name="translatedStatement" autoComplete="off" value={form.translatedStatement} onChange={(event) => change('translatedStatement', event.target.value)} minLength="5" maxLength="4000" required />
        <label className="checkbox-label" htmlFor="original-confirmed"><input id="original-confirmed" name="originalConfirmed" type="checkbox" checked={form.originalConfirmed} onChange={(event) => change('originalConfirmed', event.target.checked)} />{bi('Applicant orally confirmed the original statement after read-back', 'পড়ে শোনানোর পর আবেদনকারী মুখে মূল বক্তব্য নিশ্চিত করেছেন')}</label>
        <label className="checkbox-label" htmlFor="translation-confirmed"><input id="translation-confirmed" name="translationConfirmed" type="checkbox" checked={form.translationConfirmed} onChange={(event) => change('translationConfirmed', event.target.checked)} />{bi('Applicant orally confirmed the translation after read-back', 'পড়ে শোনানোর পর আবেদনকারী মুখে অনুবাদ নিশ্চিত করেছেন')}</label>
        {mode === 'CREATE' && <>
          <label htmlFor="consent-attestation">{bi('Oral consent statement', 'মৌখিক সম্মতির বিবরণ')}</label><textarea id="consent-attestation" name="consentAttestation" autoComplete="off" value={form.consentAttestation} onChange={(event) => change('consentAttestation', event.target.value)} minLength="10" maxLength="500" required />
          <label htmlFor="contact-channel">{bi('Safe applicant contact', 'আবেদনকারীর নিরাপদ যোগাযোগ')}</label><select id="contact-channel" name="contactChannel" autoComplete="off" value={form.contactChannel} onChange={(event) => change('contactChannel', event.target.value)}><option value="IN_PERSON">{bi('In person; do not use helper phone', 'সরাসরি; সহায়তাকারীর ফোন ব্যবহার করবেন না')}</option><option value="PHONE">{bi("Applicant's own safe phone", 'আবেদনকারীর নিজের নিরাপদ ফোন')}</option></select>
          {form.contactChannel === 'PHONE' && <><label htmlFor="applicant-phone">{bi("Applicant's own safe phone", 'আবেদনকারীর নিজের নিরাপদ ফোন')}</label><input id="applicant-phone" name="applicantPhone" type="tel" autoComplete="off" value={form.contactValue} onChange={(event) => change('contactValue', event.target.value)} required /></>}
          <label htmlFor="safe-time">{bi('Safe time (optional)', 'নিরাপদ সময় (ঐচ্ছিক)')}</label><input id="safe-time" name="safeTime" autoComplete="off" value={form.safeTime} onChange={(event) => change('safeTime', event.target.value)} maxLength="100" />
        </>}
        <button type="submit">{mode === 'CREATE' ? bi('Queue encrypted application', 'আবেদনটি সুরক্ষিতভাবে পাঠানোর জন্য রাখুন') : bi('Queue encrypted correction', 'সংশোধনটি সুরক্ষিতভাবে পাঠানোর জন্য রাখুন')}</button>
      </form>
    </section>
  </section>
}
