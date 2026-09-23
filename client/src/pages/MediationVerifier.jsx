import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../services/api.js'
import { verifySettlement } from '../utils/settlementCrypto.js'

export default function MediationVerifier({ session }) {
  const { applicationId } = useParams()
  const [mediation, setMediation] = useState(null)
  const [error, setError] = useState('')
  const [deviceResult, setDeviceResult] = useState(null)
  const [serverResult, setServerResult] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/applications/${applicationId}/mediation`, { token: session.token, signal: controller.signal })
      .then(({ mediation: result }) => setMediation(result)).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [applicationId, session.token])

  async function verifyCurrent() {
    if (!mediation?.draft) return
    setBusy(true)
    setError('')
    try { setDeviceResult(await verifySettlement(mediation.draft, mediation.signatures)) }
    catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }

  async function testChangedCopy() {
    if (!mediation?.draft) return
    const sections = mediation.draft.sections.map((section, index) => index ? section : { ...section, text: `${section.text} [changed copy]` })
    setBusy(true)
    setError('')
    try { setDeviceResult(await verifySettlement(mediation.draft, mediation.signatures, sections)) }
    catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }

  async function verifyServer() {
    setBusy(true)
    setError('')
    try { setServerResult(await api(`/api/applications/${applicationId}/mediation/verify`, { token: session.token, method: 'POST', body: {} })) }
    catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }

  return <section aria-labelledby="verification-title">
    <Link to={`/applications/${applicationId}`}>← Mediation record</Link>
    <p className="eyebrow">Independent integrity check · Application {applicationId}</p>
    <h1 id="verification-title">Settlement signature verifier</h1>
    <p className="safety-note"><strong>Cryptographic validity does not by itself prove legal identity, capacity, informed consent, or enforceability.</strong></p>
    {error && <p role="alert" className="error">{error}</p>}
    {!mediation && !error && <p role="status">Loading signed settlement…</p>}
    {mediation && !mediation.draft && <p>No settlement draft is recorded on this Case.</p>}
    {mediation?.draft && <section className="card" aria-labelledby="document-title">
      <h2 id="document-title">{mediation.caseId} · draft version {mediation.draft.version}</h2>
      <p>Template: {mediation.draft.template.replaceAll('_', ' ')} · legal state: {mediation.legalEffectState.replaceAll('_', ' ')}</p>
      <dl className="details">{mediation.draft.sections.map((section) => <div key={section.key}><dt>{section.label}</dt><dd>{section.text}{section.aiFilled ? ' · AI-filled' : ''}</dd></div>)}</dl>
      <ol className="plain-list">{mediation.signatures.map((signature) => <li key={signature.signerRole}>{signature.signerRole.replaceAll('_', ' ')} · received {new Date(signature.receivedAt).toLocaleString()} · device-reported {new Date(signature.clientSignedAt).toLocaleString()}</li>)}</ol>
      <div className="choice-row"><button type="button" disabled={busy} onClick={verifyCurrent}>Verify this document on this device</button><button type="button" className="secondary-button" disabled={busy || mediation.signatures.length === 0} onClick={testChangedCopy}>Test a changed copy</button><button type="button" className="secondary-button" disabled={busy} onClick={verifyServer}>Verify independently on server</button></div>
      {deviceResult && <section role="status" aria-live="polite"><h3>Browser verification</h3><p>{deviceResult.allValid ? 'All three signatures match this document version.' : 'Verification failed or fewer than three signatures are present.'} Document SHA-256: <code>{deviceResult.documentHash}</code></p><ul>{deviceResult.signatures.map((signature) => <li key={signature.signerRole}>{signature.signerRole.replaceAll('_', ' ')}: {signature.valid ? 'valid' : 'FAILED'} · hash {signature.hashMatches ? 'matches' : 'does not match'} · signature {signature.cryptographicallyValid ? 'valid' : 'invalid'}</li>)}</ul></section>}
      {serverResult && <section role="status" aria-live="polite"><h3>Server verification</h3><p>{serverResult.allValid ? 'All three stored signatures verify.' : 'Verification failed or fewer than three signatures are present.'}</p><ul>{serverResult.signatures.map((signature) => <li key={signature.signerRole}>{signature.signerRole.replaceAll('_', ' ')}: {signature.valid ? 'valid' : 'FAILED'}</li>)}</ul></section>}
    </section>}
  </section>
}
