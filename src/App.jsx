import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Layout from './layouts/Layout'
import Start from './pages/fe1/Start'
import Home from './pages/fe1/Home'
import Settings from './pages/fe1/Settings'
import WorryInput from './pages/fe1/WorryInput'
import WorryTime from './pages/fe1/WorryTime'
import WorryAnalysis from './pages/fe1/WorryAnalysis'
import WorryComplete from './pages/fe1/WorryComplete'
import useNightTheme from './hooks/useNightTheme'
import Records from './pages/fe2/Records'
import { checkGuest } from './api/guest'
import Fe2Layout from './features/fe2/Layout.jsx'
import Vault from './features/fe2/Vault.jsx'
import Detail from './features/fe2/Detail.jsx'
import EditSummary from './features/fe2/EditSummary.jsx'
import { ActionPage, RestPage, EmpathyPage, ShredPage, ResultPage, ActivityLink } from './features/fe2/Activities.jsx'
import { RecordDetail } from './features/fe2/Records.jsx'
import Demo from './features/fe2/Demo.jsx'
import NotFound from './features/fe2/NotFound.jsx'

// FE1 guest gate. FE2 retains its own session/error handling; demo uses its operator gate.
function GuestGate() {
  const location = useLocation()
  const [status, setStatus] = useState('CHECKING')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    checkGuest().then(value => { if (active) setStatus(value) })
      .catch(() => { if (active) setStatus('ERROR') })
    return () => { active = false }
  }, [retry])
  if (status === 'CHECKING') return <div style={{ padding: '40px 24px', textAlign: 'center' }}>금고를 확인하고 있어요...</div>
  if (status === 'ERROR') return <div style={{ padding: '40px 24px', textAlign: 'center' }}><p>서버에 연결할 수 없어요.</p><button onClick={() => { setStatus('CHECKING'); setRetry(value => value + 1) }}>다시 시도</button></div>
  if (status === 'NEED_START') return location.pathname === '/start' ? <Start /> : <Navigate to="/start" replace />
  if (status === 'INVALID') return location.pathname === '/start' && new URLSearchParams(location.search).get('mode') === 'restart' ? <Start /> : <Navigate to="/start?mode=restart" replace />
  return location.pathname === '/start' ? <Navigate to="/" replace /> : <Outlet />
}
function SessionEvents() {
  const navigate = useNavigate()
  useEffect(() => {
    const auth = event => {
      if (window.location.pathname === '/demo') return
      const target = event.detail === 'GUEST_SESSION_INVALID' ? '/start?mode=restart' : '/start'
      if (window.location.pathname + window.location.search !== target) navigate(target, { replace:true })
    }
    const changed = () => window.location.reload()
    window.addEventListener('wooly:auth-error',auth)
    window.addEventListener('wooly:external-session-change',changed)
    return () => { window.removeEventListener('wooly:auth-error',auth); window.removeEventListener('wooly:external-session-change',changed) }
  }, [navigate])
  return null
}
function AppRoutes() {
  const location = useLocation()
  return <Routes>
    <Route element={<GuestGate key={location.pathname} />}>
      <Route path="/start" element={<Start />} />
      <Route path="/worry-input" element={<WorryInput />} />
      <Route path="/worry-confirm" element={<WorryTime />} />
      <Route path="/worry-analysis" element={<WorryAnalysis />} />
      <Route path="/worry-complete" element={<WorryComplete />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Route>
    <Route element={<Fe2Layout />}>
      <Route path="/vault" element={<Vault />} />
      <Route path="/worries/:worryId" element={<Detail />} />
      <Route path="/worries/:worryId/edit" element={<EditSummary />} />
      <Route path="/worries/:worryId/shred" element={<ShredPage />} />
      <Route path="/worries/:worryId/action" element={<ActionPage />} />
      <Route path="/worries/:worryId/rest" element={<RestPage />} />
      <Route path="/worries/:worryId/empathy" element={<EmpathyPage />} />
      <Route path="/activities/:activityId" element={<ActivityLink />} />
      <Route path="/activities/:activityId/result" element={<ResultPage />} />
      <Route path="/records" element={<Records />} />
      <Route path="/records/:worryId" element={<RecordDetail />} />
      <Route path="/demo" element={<Demo />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
}
export default function App() { const night=useNightTheme(); return <div className={night?"theme-night":"theme-morning"}><BrowserRouter><SessionEvents /><AppRoutes /></BrowserRouter></div> }
