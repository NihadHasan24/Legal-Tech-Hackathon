import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../services/api.js'
import MediationPanel from './MediationPanel.jsx'

export default function MediationPage({ session }) {
  const { applicationId } = useParams()
  const role = session.user.assignments.some(({ role: item }) => item === 'MEDIATOR') ? 'MEDIATOR' : 'CLAO'
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/applications/${applicationId}`, { token: session.token, signal: controller.signal })
      .then(setRecord).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [applicationId, session.token])

  return <section aria-labelledby="mediation-page-title">
    <Link to="/">← Workspace</Link>
    <p className="eyebrow">Shared Application and Case · {role.replaceAll('_', ' ')}</p>
    <h1 id="mediation-page-title">{record?.caseId || applicationId}</h1>
    {error && <p role="alert" className="error">{error}</p>}
    {record && <><p>{record.applicantName} · Application {record.applicationId}</p><MediationPanel applicationId={applicationId} session={session} role={role} /></>}
  </section>
}
