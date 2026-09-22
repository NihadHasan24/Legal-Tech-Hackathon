import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router'
import Dashboard from './pages/Dashboard.jsx'
import RecordPage from './pages/RecordPage.jsx'
import VoiceAccess from './pages/VoiceAccess.jsx'
import { api } from './services/api.js'

function SignIn({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onLogin(username, password)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="login-panel" aria-labelledby="welcome-title">
      <p className="eyebrow">Provider workspace · fictional data only</p>
      <h1 id="welcome-title">One record, every handover.</h1>
      <p className="lede">Sign in with a fictional provider account to review applications and their shared history. This is a local prototype, not a live legal-aid service.</p>
      <p className="citizen-door">Citizen access: <Link to="/voice">Call 16699 – Voice Access Prototype</Link></p>
      <form onSubmit={submit} className="form-stack">
        <label htmlFor="username">Demo username</label>
        <input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
        <label htmlFor="password">Demo password</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="muted">Generated credentials are stored locally in the ignored <code>server/.demo-credentials.json</code> file. Do not use real beneficiary information.</p>
    </section>
  )
}

function CasePage({ session }) {
  const { caseId } = useParams()
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/cases/${encodeURIComponent(caseId)}`, { token: session.token, signal: controller.signal })
      .then(setRecord)
      .catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message) })
    return () => controller.abort()
  }, [caseId, session.token])

  return (
    <section aria-labelledby="case-title">
      <Link to="/">← Workspace</Link>
      <p className="eyebrow">Assigned case summary</p>
      <h1 id="case-title">{caseId}</h1>
      {error && <p role="alert" className="error">{error}</p>}
      {!error && !record && <p role="status">Loading case…</p>}
      {record && <div className="card">
        <dl className="details"><div><dt>Application ID</dt><dd>{record.applicationId}</dd></div><div><dt>Status</dt><dd>{record.status}</dd></div></dl>
        <p className="muted">Only the assigned case summary is available here. Lawyer updates and documents arrive in a later step.</p>
      </div>}
    </section>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const navigate = useNavigate()

  async function signIn(username, password) {
    const login = await api('/api/auth/login', { method: 'POST', body: { username, password } })
    const current = await api('/api/auth/me', { token: login.token })
    setSession({ token: login.token, user: current.user })
  }

  async function signOut() {
    try { await api('/api/auth/logout', { token: session.token, method: 'POST' }) } catch { /* Clear this browser session regardless. */ }
    setSession(null)
    navigate('/')
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="DLAS provider workspace home">DLAS <span>Provider workspace</span></Link>
        <span className="prototype-label">Prototype · fictional data</span>
        {session && <div className="account"><span>{session.user.displayName}</span><button type="button" className="quiet-button" onClick={signOut}>Sign out</button></div>}
      </header>
      <main id="main" className="app-main">
        <Routes>
          <Route path="/" element={session ? <Dashboard session={session} /> : <SignIn onLogin={signIn} />} />
          <Route path="/applications/:applicationId" element={session ? <RecordPage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/cases/:caseId" element={session ? <CasePage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/voice" element={<VoiceAccess />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
