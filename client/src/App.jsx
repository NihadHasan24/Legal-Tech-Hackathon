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
import { bi, setLang, useLang } from './components/Bi.jsx'

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
      setStatus(bi(`${label} account filled. Select Sign in to continue.`, `${label} অ্যাকাউন্ট পূরণ হয়েছে। চালিয়ে যেতে সাইন ইন চাপুন।`))
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
      <h1 id="welcome-title">{bi('One record, every handover.', 'একটি রেকর্ড, প্রতিটি হস্তান্তরে।')}</h1>
      <p className="citizen-door">{bi('Need voice support?', 'ফোনে সাহায্য দরকার?')} <Link to="/voice">{bi('Start a voice intake', 'ভয়েসে আবেদন শুরু করুন')}</Link></p>
      <form onSubmit={submit} className="form-stack">
        <label htmlFor="username">{import.meta.env.PROD ? bi('Staff username', 'কর্মীর ইউজারনেম') : bi('Demo username', 'ডেমো ইউজারনেম')}</label>
        <input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
        <label htmlFor="password">{import.meta.env.PROD ? bi('Staff password', 'কর্মীর পাসওয়ার্ড') : bi('Demo password', 'ডেমো পাসওয়ার্ড')}</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? bi('Signing in…', 'সাইন ইন হচ্ছে…') : bi('Sign in', 'সাইন ইন')}</button>
        {!import.meta.env.PROD && <fieldset className="demo-roles">
          <legend>{bi('Quick fill a role', 'দ্রুত একটি ভূমিকা পূরণ করুন')}</legend>
          <div className="demo-role-buttons">
            <button type="button" className="secondary-button" disabled={busy} onClick={() => fillDemoAccount('DLAO_OFFICER', bi('DLAO Officer', 'ডিএলএও কর্মকর্তা'))}>{bi('DLAO Officer', 'ডিএলএও কর্মকর্তা')}</button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => fillDemoAccount('UDC_OPERATOR', bi('UDC Operator', 'ইউডিসি অপারেটর'))}>{bi('UDC Operator', 'ইউডিসি অপারেটর')}</button>
          </div>
          <p role="status" className="visually-hidden">{status}</p>
        </fieldset>}
      </form>
    </section>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const lang = useLang()
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

  useEffect(() => { document.documentElement.lang = lang }, [lang])

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
    try { await clearOfflineDrafts() } catch { window.alert(bi('Local drafts could not be cleared. Do not leave this browser on a shared device.', 'এই ডিভাইসের খসড়া মোছা যায়নি। অন্যের সঙ্গে ব্যবহার করা ডিভাইসে এই পৃষ্ঠা খোলা রাখবেন না।')) }
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
      <a className="skip-link" href="#main">{bi('Skip to main content', 'মূল অংশে যান')}</a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label={pathname === '/voice' ? bi('DLAS voice intake home', 'DLAS-এ ফোনে আবেদনের শুরু') : bi('DLAS provider workspace home', 'DLAS কর্মীদের কাজের শুরু')}>DLAS <span>{pathname === '/voice' ? bi('Voice intake', 'ফোনে আবেদন') : bi('Provider workspace', 'কর্মক্ষেত্র')}</span></Link>
        {pathname !== '/voice' && (session || pathname !== '/') && <span className="prototype-label">{bi('Prototype · fictional data', 'প্রোটোটাইপ · কাল্পনিক তথ্য')}</span>}
        <div className="lang-switch" role="group" aria-label="Language / ভাষা">
          <button type="button" lang="bn" aria-pressed={lang === 'bn'} onClick={() => setLang('bn')}>বাংলা</button>
          <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
        </div>
        <button type="button" className="quiet-button" onClick={toggleLight}>{lightMode ? bi('Normal mode', 'সাধারণ মোড') : bi('Light mode', 'হালকা মোড')}</button>
        {installPrompt && <button type="button" className="quiet-button" onClick={install}>{bi('Install app', 'অ্যাপ ইনস্টল করুন')}</button>}
        {session && <div className="account"><span>{session.user.displayName}</span><button type="button" className="quiet-button" onClick={signOut}>{bi('Sign out', 'সাইন আউট')}</button></div>}
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
