import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import Dashboard from './pages/Dashboard.jsx'
import RecordPage from './pages/RecordPage.jsx'
import VoiceAccess from './pages/VoiceAccess.jsx'
import AssistedIntake from './pages/AssistedIntake.jsx'
import ReferralPage from './pages/ReferralPage.jsx'
import LawyerCasePage from './pages/LawyerCasePage.jsx'
import IncidentGroupPage from './pages/IncidentGroupPage.jsx'
import MediationPage from './pages/MediationPage.jsx'
import MediationVerifier from './pages/MediationVerifier.jsx'
import { api } from './services/api.js'
import { clearOfflineDrafts, resumeOfflineDrafts } from './utils/offlineDrafts.js'

function SignIn({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function fillDemoAccount(role, label) {
    setError('')
    setStatus('')
    setBusy(true)
    try {
      const account = await api(`/api/auth/demo-credentials/${role}`)
      setUsername(account.username)
      setPassword(account.password)
      setStatus(`${label} account filled. Select Sign in to continue.`)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

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
      <h1 id="welcome-title">One record, every handover.</h1>
      <p className="citizen-door">Need voice support? <Link to="/voice">Start a voice intake</Link></p>
      <form onSubmit={submit} className="form-stack">
        <label htmlFor="username">{import.meta.env.PROD ? 'Staff username' : 'Demo username'}</label>
        <input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
        <label htmlFor="password">{import.meta.env.PROD ? 'Staff password' : 'Demo password'}</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {!import.meta.env.PROD && <fieldset className="demo-roles">
          <legend>Quick fill a role</legend>
          <div className="demo-role-buttons">
            <button type="button" className="secondary-button" disabled={busy} onClick={() => fillDemoAccount('DLAO_OFFICER', 'DLAO Officer')}>DLAO Officer</button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => fillDemoAccount('UDC_OPERATOR', 'UDC Operator')}>UDC Operator</button>
          </div>
          <p role="status" className="visually-hidden">{status}</p>
        </fieldset>}
      </form>
    </section>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [lightMode, setLightMode] = useState(() => typeof localStorage !== 'undefined' && localStorage.getItem('dlas-light-mode') === '1')
  const [installPrompt, setInstallPrompt] = useState(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const previousPath = useRef(pathname)
  const mediationOnly = session?.user.assignments.some(({ role }) => role === 'MEDIATOR' || role === 'CLAO')
    && !session?.user.assignments.some(({ role }) => role === 'DLAO_OFFICER')

  useEffect(() => {
    document.documentElement.dataset.lightMode = lightMode ? 'on' : 'off'
    localStorage.setItem('dlas-light-mode', lightMode ? '1' : '0')
  }, [lightMode])

  useEffect(() => {
    if (previousPath.current !== pathname) document.getElementById('main')?.focus()
    previousPath.current = pathname
  }, [pathname])

  useEffect(() => {
    const ready = (event) => { event.preventDefault(); setInstallPrompt(event) }
    window.addEventListener('beforeinstallprompt', ready)
    return () => window.removeEventListener('beforeinstallprompt', ready)
  }, [])

  async function signIn(username, password) {
    const login = await api('/api/auth/login', { method: 'POST', body: { username, password } })
    const current = await api('/api/auth/me', { token: login.token })
    resumeOfflineDrafts()
    setSession({ token: login.token, user: current.user })
  }

  async function signOut() {
    const token = session.token
    try { await clearOfflineDrafts() } catch { window.alert('Local drafts could not be cleared. Do not leave this browser on a shared device.') }
    setSession(null)
    navigate('/')
    try { await api('/api/auth/logout', { token, method: 'POST' }) } catch { /* Browser session is already cleared if the network is unavailable. */ }
  }

  function toggleLight() { setLightMode((value) => !value) }

  async function install() {
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label={pathname === '/voice' ? 'DLAS voice intake home' : 'DLAS provider workspace home'}>DLAS <span>{pathname === '/voice' ? 'Voice intake' : 'Provider workspace'}</span></Link>
        {pathname !== '/voice' && (session || pathname !== '/') && <span className="prototype-label">Prototype · fictional data</span>}
        <button type="button" className="quiet-button" onClick={toggleLight}>{lightMode ? 'Normal mode' : 'Light mode'}</button>
        {installPrompt && <button type="button" className="quiet-button" onClick={install}>Install app</button>}
        {session && <div className="account"><span>{session.user.displayName}</span><button type="button" className="quiet-button" onClick={signOut}>Sign out</button></div>}
      </header>
      <main id="main" className="app-main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={session ? <Dashboard session={session} /> : <SignIn onLogin={signIn} />} />
          <Route path="/applications/:applicationId/mediation/verify" element={session ? <MediationVerifier session={session} /> : <Navigate to="/" replace />} />
          <Route path="/applications/:applicationId" element={session ? mediationOnly ? <MediationPage session={session} /> : <RecordPage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/cases/:caseId" element={session ? <LawyerCasePage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/referrals/:referralId" element={session?.user.assignments.some(({ role }) => role === 'RECEIVING_DLAO') ? <ReferralPage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/incidents/:groupId" element={session?.user.assignments.some(({ role }) => role === 'DLAO_OFFICER') ? <IncidentGroupPage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/voice" element={<VoiceAccess />} />
          <Route path="/assisted" element={session?.user.assignments.some(({ role }) => role === 'UDC_OPERATOR') ? <AssistedIntake session={session} /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
