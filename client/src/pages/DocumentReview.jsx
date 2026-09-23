import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { AddForm, Badge, Bi, Panel, Term, bi, num, say } from '../components/Bi.jsx'

const sampleDocuments = [
  ['identity-note.txt', 'Applicant identity evidence', 'READABLE'],
  ['land-deed-unreadable.txt', 'Land record or deed', 'UNREADABLE'],
  ['plot-location.txt', 'Location or plot details', 'READABLE'],
  ['village-meeting.txt', 'Other context', 'READABLE'],
  ['free-service-receipt.txt', 'Other context', 'READABLE'],
  ['map-note.txt', 'Other context', 'READABLE'],
]
const checklist = {
  FAMILY: ['Applicant identity evidence', 'Relationship record', 'Relevant communication'],
  LAND: ['Applicant identity evidence', 'Land record or deed', 'Location or plot details', 'Witness or other supporting record'],
  LABOUR: ['Applicant identity evidence', 'Employment or wage record', 'Employer communication'],
  CRIMINAL: ['Applicant identity evidence', 'Police or court document', 'Incident chronology'],
  OTHER: ['Applicant identity evidence', 'Problem chronology', 'Available supporting record'],
}
const itemNames = {
  'Applicant identity evidence': 'আবেদনকারীর পরিচয়ের প্রমাণ', 'Relationship record': 'সম্পর্কের প্রমাণ', 'Relevant communication': 'প্রাসঙ্গিক যোগাযোগ',
  'Land record or deed': 'জমির রেকর্ড বা দলিল', 'Location or plot details': 'অবস্থান বা দাগের তথ্য', 'Witness or other supporting record': 'সাক্ষী বা অন্য সহায়ক রেকর্ড',
  'Employment or wage record': 'চাকরি বা মজুরির রেকর্ড', 'Employer communication': 'মালিকের সাথে যোগাযোগ', 'Police or court document': 'পুলিশ বা আদালতের কাগজ',
  'Incident chronology': 'ঘটনার ক্রম', 'Problem chronology': 'সমস্যার ক্রম', 'Available supporting record': 'প্রাপ্ত সহায়ক রেকর্ড', 'Other context': 'অন্যান্য প্রসঙ্গ',
}
const item = (name) => itemNames[name] ? <Bi en={name} bn={itemNames[name]} /> : name

export default function DocumentReview({ applicationId, caseType, documents, token, onChanged }) {
  const [briefing, setBriefing] = useState(null)
  const [files, setFiles] = useState([])
  const [checklistItem, setChecklistItem] = useState('Other context')
  const [qualityState, setQualityState] = useState('PENDING_REVIEW')
  const [approvalReason, setApprovalReason] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/applications/${applicationId}/briefing`, { token, signal: controller.signal })
      .then(setBriefing).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [applicationId, token])

  async function upload(filename, textContent, checklistName, quality) {
    if (!/^[\w .()-]+\.txt$/i.test(filename) || new TextEncoder().encode(textContent).byteLength > 50000 || !textContent.trim()) throw new Error(bi('Use a non-empty fictional .txt file under 50 KB.', 'লেখা আছে এমন একটি নমুনা .txt ফাইল দিন, যার আকার ৫০ কেবির কম।'))
    return api(`/api/applications/${applicationId}/documents`, { token, method: 'POST', body: {
      label: filename.replace(/\.txt$/i, '').replaceAll('-', ' '), filename, textContent, checklistItem: checklistName, qualityState: quality,
    } })
  }

  async function uploadSelected(event) {
    event.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    try {
      for (const file of files) await upload(file.name, await file.text(), checklistItem, qualityState)
      setFiles([])
      setNotice(bi(`${files.length} file(s) uploaded.`, `${num(files.length)}টি ফাইল আপলোড হয়েছে।`))
      onChanged()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  async function uploadSamples() {
    setError(''); setNotice(''); setBusy(true)
    try {
      for (const [filename, checklistName, quality] of sampleDocuments) {
        const response = await fetch(`/samples/${filename}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(bi(`Could not load sample ${filename}.`, `নমুনা ${filename} লোড হয়নি।`))
        await upload(filename, await response.text(), checklistName, quality)
      }
      setNotice(bi('Six fictional documents uploaded. The deed is unreadable and the witness item is missing on purpose.', 'ছয়টি নমুনা নথি আপলোড হয়েছে। পরীক্ষার জন্য দলিলটি পড়া যায় না এবং সাক্ষীর নথি রাখা হয়নি।'))
      onChanged()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  async function generate() {
    setError(''); setNotice(''); setBusy(true)
    try {
      const result = await api(`/api/applications/${applicationId}/briefing`, { token, method: 'POST' })
      setBriefing(result)
      setNotice(bi('Draft briefing ready. Check every source before approving.', 'নথির সারসংক্ষেপের খসড়া তৈরি হয়েছে। অনুমোদনের আগে প্রতিটি তথ্যের উৎস যাচাই করুন।'))
      onChanged()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  async function approve(event) {
    event.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    try {
      await api(`/api/applications/${applicationId}/briefing/approve`, { token, method: 'POST', body: { reason: approvalReason } })
      setBriefing(await api(`/api/applications/${applicationId}/briefing`, { token }))
      setApprovalReason('')
      setNotice(bi('Briefing accuracy approved. This is not a legal decision.', 'সারসংক্ষেপটি নথির সঙ্গে মিলেছে বলে অনুমোদন দেওয়া হয়েছে। এটি মামলার আইনি সিদ্ধান্ত নয়।'))
      onChanged()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  const generated = briefing && briefing.status !== 'NOT_GENERATED'

  return <Panel id="briefing-title" en="Document briefing" bn="নথির সারসংক্ষেপ" hint={generated ? say(briefing.status) : bi('Not generated', 'তৈরি হয়নি')}>
    <p className="muted"><Bi en="Plain-text files only (50 KB). AI drafts, you verify. Unreadable text is never guessed." bn="শুধু ৫০ কেবি পর্যন্ত লেখাযুক্ত ফাইল নেওয়া যাবে। এআই সারসংক্ষেপের খসড়া করবে; আপনাকে মূল নথির সঙ্গে মিলিয়ে দেখতে হবে। পড়া না গেলে এআই কিছু অনুমান করবে না।" /></p>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    <dl className="details compact">
      <div><dt><Bi en="Case type" bn="মামলার ধরন" /></dt><dd>{caseType ? <Term code={caseType} /> : bi('Not recorded', 'লেখা নেই')}</dd></div>
      <div><dt><Bi en="Files" bn="ফাইল" /></dt><dd>{num(documents.length)}</dd></div>
      {caseType && <div><dt><Bi en="Checklist" bn="তালিকা" /></dt><dd><ul className="chips">{checklist[caseType]?.map((name) => <li key={name} className={briefing?.missing?.includes(name) ? 'missing' : undefined}>{item(name)}</li>)}</ul></dd></div>}
    </dl>
    <div className="choice-row">
      <button type="button" onClick={generate} disabled={busy || !caseType}><Bi en="Generate briefing" bn="সারসংক্ষেপ তৈরি করুন" /></button>
      {caseType === 'LAND' && <button type="button" className="secondary-button" onClick={uploadSamples} disabled={busy || documents.some(({ label }) => label === 'identity note')}><Bi en="Upload six fictional sample documents" bn="ছয়টি নমুনা নথি আপলোড" /></button>}
    </div>
    <AddForm en="Upload text files" bn="টেক্সট ফাইল আপলোড">
      <form onSubmit={uploadSelected} className="form-stack inline-form">
        <label htmlFor="document-files"><Bi en="Text files" bn="টেক্সট ফাইল" /></label><input id="document-files" name="documentFiles" type="file" accept=".txt,text/plain" multiple onChange={(event) => setFiles(Array.from(event.target.files))} required />
        <label htmlFor="document-checklist"><Bi en="Checklist item" bn="তালিকার বিষয়" /></label><select id="document-checklist" name="checklistItem" autoComplete="off" value={checklistItem} onChange={(event) => setChecklistItem(event.target.value)}>{['Other context', ...(checklist[caseType] || [])].map((name) => <option key={name} value={name}>{itemNames[name] ? bi(name, itemNames[name]) : name}</option>)}</select>
        <label htmlFor="document-quality"><Bi en="Quality" bn="মান" /></label><select id="document-quality" name="qualityState" autoComplete="off" value={qualityState} onChange={(event) => setQualityState(event.target.value)}>{['PENDING_REVIEW', 'READABLE', 'UNREADABLE'].map((code) => <option key={code} value={code}>{say(code)}</option>)}</select>
        <button type="submit" className="secondary-button" disabled={busy || files.length === 0}><Bi en="Upload" bn="আপলোড" /></button>
      </form>
    </AddForm>
    {generated && <div className="version-history">
      <h3><Bi en="Briefing" bn="সারসংক্ষেপ" /> <Badge code={briefing.status} /></h3>
      <p>{briefing.summary} <small className="muted">({briefing.model})</small></p>
      <h3><Bi en="Sources" bn="উৎস" /></h3>{briefing.citations.length ? <ol>{briefing.citations.map((citation) => <li key={`${citation.documentVersionId}-${citation.line}`}><strong>{bi(`${citation.label}, line ${citation.line}`, `${citation.label}, লাইন ${num(citation.line)}`)}</strong> · {citation.excerpt}</li>)}</ol> : <p><Bi en="No readable lines." bn="পড়া যায় এমন কোনো লেখা পাওয়া যায়নি।" /></p>}
      <h3><Bi en="Missing" bn="যা নেই" /></h3><p>{briefing.missing.length ? briefing.missing.map((name, index) => <span key={name}>{index ? ' · ' : ''}{item(name)}</span>) : bi('Nothing', 'কিছু নেই')}</p>
      <h3><Bi en="Unreadable or uncertain" bn="অপাঠযোগ্য বা অনিশ্চিত" /></h3><p>{briefing.unreadable.join(' · ') || bi('Nothing', 'কিছু নেই')}</p>
      {briefing.status === 'PROPOSED' && <form onSubmit={approve} className="form-stack inline-form"><label htmlFor="briefing-reason"><Bi en="Officer verification reason" bn="যাচাইয়ের কারণ" /></label><textarea id="briefing-reason" name="briefingReason" autoComplete="off" value={approvalReason} onChange={(event) => setApprovalReason(event.target.value)} minLength="10" maxLength="500" required /><button type="submit" disabled={busy}><Bi en="Approve briefing accuracy only" bn="শুধু নথির সঙ্গে মিলেছে কি না অনুমোদন করুন" /></button></form>}
    </div>}
  </Panel>
}
