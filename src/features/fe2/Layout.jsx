import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { mockEnabled } from './api.js'
import { isNight } from './domain.js'
import { ResourceState } from './components.jsx'
import { useResource } from './hooks.js'
import Fe2Boundary from './Boundary.jsx'
import './fe2.css'

const PreviewChrome=import.meta.env.DEV ? lazy(()=>import('./PreviewChrome.jsx')) : null

export default function Fe2Layout() {
  const session = useResource('session')
  const [night, setNight] = useState(() => isNight(new Date()))
  const location = useLocation()
  const [previewTheme,setPreviewTheme]=useState(()=>{const v=new URLSearchParams(window.location.search).get('theme');return import.meta.env.DEV && ['light','night'].includes(v)?v:'auto'})
  const displayedNight=import.meta.env.DEV && previewTheme!=='auto' ? previewTheme==='night' : night
  const legacy=location.pathname.startsWith('/records')
  useEffect(() => {
    const update = () => setNight(isNight(new Date()))
    const timer = setInterval(update, 10000)
    window.addEventListener('focus', update)
    return () => { clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  useEffect(() => {
    if(!mockEnabled) return
    const previous=document.title
    document.title='[예시 데이터] 심야 걱정 금고'
    return ()=>{document.title=previous}
  }, [])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [location.pathname])
  return <div className={`fe2-layout ${displayedNight ? 'theme-night' : 'theme-morning'} ${legacy?'fe2-legacy':''}`}>
    {PreviewChrome && <Suspense fallback={<div className={legacy?'fe2-preview-status is-legacy':'fe2-preview-status'}/> }><PreviewChrome legacy={legacy} night={displayedNight} theme={previewTheme} onTheme={setPreviewTheme} mock={mockEnabled} homeIndicator={location.pathname.endsWith('/edit')}/></Suspense>}
    {location.pathname === '/demo' ? <Fe2Boundary key={location.pathname}><Outlet /></Fe2Boundary> : <ResourceState resource={session}>{session.data?.authenticated === false ? <div className="fe2-state"><h1 className="title-2">금고를 먼저 만들어 주세요</h1><p>이 브라우저에 연결된 금고가 없어요.</p><Link to="/" className="fe2-button fe2-primary">홈으로</Link></div> : <Fe2Boundary key={location.pathname}><Outlet /></Fe2Boundary>}</ResourceState>}
  </div>
}
