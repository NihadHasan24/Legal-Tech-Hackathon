import { useEffect, useState } from 'react'
import { api } from '../services/api.js'

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

  async function upload(filename, textContent, item, quality) {
    if (!/^[\w .()-]+\.txt$/i.test(filename) || new TextEncoder().encode(textContent).byteLength > 50000 || !textContent.trim()) throw new Error('Use a nonempty fictional .txt file under 50 KB.')
    return api(`/api/applications/${applicationId}/documents`, { token, method: 'POST', body: {
      label: filename.replace(/\.txt$/i, '').replaceAll('-', ' '), filename, textContent, checklistItem: item, qualityState: quality,
    } })
  }

  async function uploadSelected(event) {
    event.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    try {
      for (const file of files) await upload(file.name, await file.text(), checklistItem, qualityState)
      setFiles([])
      setNotice(`${files.length} fictional text document${files.length === 1 ? '' : 's'} uploaded and versioned.`)
      onChanged()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  async function uploadSamples() {
    setError(''); setNotice(''); setBusy(true)
    try {
      for (const [filename, item, quality] of sampleDocuments) {
        const response = await fetch(`/samples/${filename}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Could not load sample ${filename}.`)
        await upload(filename, await response.text(), item, quality)
      }
      setNotice('Six fictional documents uploaded. The deed is deliberately unreadable; the witness item is deliberately missing.')
      onChanged()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  async function generate() {
    setError(''); setNotice(''); setBusy(true)
    try {
      const result = await api(`/api/applications/${applicationId}/briefing`, { token, method: 'POST' })
      setBriefing(result)
      setNotice('Provisional briefing generated. An officer must verify every source before approval.')
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
      setNotice('Officer verification of the briefing was recorded. This is not an eligibility or legal decision.')
      onChanged()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  return <section className="card" aria-labelledby="briefing-title">
    <h2 id="briefing-title">Document review and cited briefing</h2>
    <p className="muted">Fictional plain-text files only, up to 50 KB. No scanned/PDF parsing is claimed. Unreadable content is never guessed; AI output remains a proposal until an officer verifies it.</p>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    <p>{documents.length} document record{documents.length === 1 ? '' : 's'} on this Application. Case type: {caseType || 'not recorded'}.</p>
    {caseType && <p>Checklist: {checklist[caseType]?.join(' · ')}</p>}
    {caseType === 'LAND' && <button type="button" className="secondary-button" onClick={uploadSamples} disabled={busy || documents.some(({ label }) => label === 'identity note')}>Upload six fictional sample documents</button>}
    <form onSubmit={uploadSelected} className="form-stack inline-form">
      <h3>Upload fictional text</h3>
      <label htmlFor="document-files">Text files</label><input id="document-files" name="documentFiles" type="file" accept=".txt,text/plain" multiple onChange={(event) => setFiles(Array.from(event.target.files))} required />
      <label htmlFor="document-checklist">Checklist item</label><select id="document-checklist" name="checklistItem" autoComplete="off" value={checklistItem} onChange={(event) => setChecklistItem(event.target.value)}><option>Other context</option>{(checklist[caseType] || []).map((item) => <option key={item}>{item}</option>)}</select>
      <label htmlFor="document-quality">Quality</label><select id="document-quality" name="qualityState" autoComplete="off" value={qualityState} onChange={(event) => setQualityState(event.target.value)}><option value="PENDING_REVIEW">Pending review</option><option value="READABLE">Readable</option><option value="UNREADABLE">Unreadable / uncertain</option></select>
      <button type="submit" className="secondary-button" disabled={busy || files.length === 0}>Upload selected files</button>
    </form>
    <button type="button" onClick={generate} disabled={busy || !caseType}>Generate provisional briefing</button>
    {briefing && briefing.status !== 'NOT_GENERATED' && <div className="version-history">
      <h3>Briefing: {briefing.status.toLowerCase()}</h3><p>Source: {briefing.model}. {briefing.summary}</p>
      <h3>Source references</h3>{briefing.citations.length ? <ol>{briefing.citations.map((citation) => <li key={`${citation.documentVersionId}-${citation.line}`}><strong>{citation.label}, line {citation.line}</strong> · {citation.excerpt}</li>)}</ol> : <p>No readable source lines.</p>}
      <h3>Missing checklist items</h3><p>{briefing.missing.join(' · ') || 'None recorded'}</p>
      <h3>Unreadable or uncertain</h3><p>{briefing.unreadable.join(' · ') || 'None recorded'}</p>
      {briefing.status === 'PROPOSED' && <form onSubmit={approve} className="form-stack inline-form"><label htmlFor="briefing-reason">Officer verification reason</label><textarea id="briefing-reason" name="briefingReason" autoComplete="off" value={approvalReason} onChange={(event) => setApprovalReason(event.target.value)} minLength="10" maxLength="500" required /><button type="submit" disabled={busy}>Approve briefing accuracy only</button></form>}
    </div>}
  </section>
}
