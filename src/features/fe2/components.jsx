import { useEffect, useId, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { safeError } from './domain.js'

const designIcons = {
  back: ['vault-imgIconBack.svg',24,24],
  'lock-open':['vault-imgIconUnlock.svg',20,20], lock:['vault-imgIconLock.svg',20,20],
  chevron:['vault-imgIconChev.svg',18,18], arrow:['recordDetail-imgIconArrow.svg',20,20],
  moon:['rest-imgCilMoon.svg',80,80], heart:['empathy-imgIconHeart.svg',28,28],
  check:['result-imgCiCheckBig.svg',80,80], shred:['shredDone-imgIconShred.svg',80,80],
  home:['records-imgFrame.svg',24,24],records:['records-imgFrame1.svg',24,24],settings:['records-imgFrame2.svg',24,24],
  clock:['demo-imgIconClock.svg',18,18],
}
export function Icon({ name, size, className = '' }) {
  let asset=designIcons[name]
  if(name==='alert') asset=[size===16?'editFailure-imgIconAlert.svg':'editInvalid-imgIconAlert.svg',size===16?16:14,size===16?16:14]
  if(name==='lock' && size===14) asset=['edit-imgIconLock.svg',14,14]
  if(name==='chevron' && size===16) asset=['records-imgIconChev.svg',16,16]
  if(asset) {
    const nightFile = name==='alert'?(size===16?'nightEditFailure-imgIconAlert.svg':'nightEditInvalid-imgIconAlert.svg'):name==='lock-open'?'nightTime-imgIconUnlock.svg':name==='chevron'&&asset[1]===18?'nightTime-imgIconChev.svg':name==='lock'&&asset[1]===14?'nightEdit-imgIconLock.svg':name==='clock'?'nightDemo-imgIconClock.svg':null
    if(nightFile) return <span className={'fe2-icon fe2-icon-variants '+className} aria-hidden="true"><img className="fe2-asset-day" alt="" src={'/fe2/figma/'+asset[0]} width={asset[1]} height={asset[2]}/><img className="fe2-asset-night" alt="" src={'/fe2/figma/'+nightFile} width={asset[1]} height={asset[2]}/></span>
    return <img aria-hidden="true" alt="" src={'/fe2/figma/'+asset[0]} width={asset[1]} height={asset[2]} className={'fe2-icon '+className}/>
  }
  return <svg aria-hidden="true" width={size||20} height={size||20} className={'fe2-icon '+className}><use href={'/fe2/icons.svg#'+name}/></svg>
}

export function Header({ title, back = '/vault', tab = false }) {
  return <header className={`fe2-header ${tab ? 'fe2-tab-header' : ''}`}>
    {!tab && <Link to={back} className="fe2-back" aria-label="뒤로가기"><Icon name="back" /></Link>}
    <h1 className="title-2">{title}</h1>
  </header>
}
export function Button({ children, secondary, className = '', ...props }) {
  return <button type="button" className={`fe2-button ${secondary ? 'fe2-secondary' : 'fe2-primary'} ${className}`} {...props}>{children}</button>
}
export function Actions({ children, className = '' }) { return <div className={`fe2-actions ${className}`}>{children}</div> }
export function Feedback({ children, error = false }) { return children ? <p className={`fe2-feedback ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error && <span aria-hidden="true">ⓘ </span>}{children}</p> : null }
export function ResourceState({ resource, children }) {
  if (resource.loading) return <div className="fe2-state" role="status"><span className="fe2-spinner" />불러오는 중…</div>
  if (resource.error) return <div className="fe2-state fe2-error-state" role="alert"><div className="fe2-error-illustration" aria-hidden="true"><img className="fe2-error-day" alt="" width="214" height="214" src="/fe2/figma/error-imgIllust.svg"/><img className="fe2-error-night" alt="" width="214" height="214" src="/fe2/figma/errorNight-imgIllust.svg"/></div><h2 className="title-2">불러오지 못했어요</h2><p>{safeError(resource.error)}</p><Button onClick={resource.refresh}>다시 시도</Button><Link to="/" className="fe2-button fe2-secondary">홈으로</Link></div>
  return children
}
export function EmptyState({ title = '아직 아무것도 없어요', description, action, placeholder = false }) {
  return <div className={`fe2-empty ${placeholder ? 'fe2-record-empty' : ''}`}><div className="fe2-empty-body">{placeholder ? <div className="fe2-illustration-placeholder" aria-hidden="true">일러스트 영역</div> : <div className="fe2-mark-glow"><Icon name="vault" size={104} /></div>}<div className="fe2-empty-copy"><h2 className="title-2">{title}</h2><p>{description}</p></div></div>{action}</div>
}
export function BottomTabs() {
  return <nav className="fe2-bottom-nav" aria-label="하단 메뉴">{[['/', 'home', '홈'], ['/records', 'records', '기록'], ['/settings', 'settings', '설정']].map(([to, icon, label]) => <NavLink end={to === '/'} key={to} to={to}><Icon name={icon} size={24} /><span>{label}</span></NavLink>)}</nav>
}
export function Modal({ title, children, onClose, sheet = false, busy = false, className = '', dismissOnBackdrop = false }) {
  const dialog = useRef(null), id = useId()
  useEffect(() => {
    const node = dialog.current, previous = document.activeElement
    node.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { node.close(); document.body.style.overflow = previousOverflow; previous?.focus() }
  }, [])
  return <dialog ref={dialog} className={`fe2-dialog ${sheet ? 'fe2-sheet' : ''} ${className}`} aria-labelledby={id} onPointerDown={event=>{if(!dismissOnBackdrop||busy)return;const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)onClose()}}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    {sheet && <div className="fe2-handle" aria-hidden="true" />}
    <h2 id={id} className="title-2">{title}</h2>{children}
  </dialog>
}
export function StepBars({ count = 0 }) { return <div className="fe2-step-bars" aria-hidden="true">{[0, 1, 2].map(n => <span key={n} className={n < count ? 'filled' : ''} />)}</div> }
export function DistressScale({ value, onChange, disabled }) {
  return <div className="fe2-distress" role="group" aria-label="지금 불안도">{['거의 없음', '조금', '보통', '많이', '아주 많이'].map((label, index) => <button type="button" key={label} aria-pressed={value === index + 1} disabled={disabled} onClick={() => onChange(index + 1)}>
    <strong>{index + 1}</strong><span>{label}</span></button>)}</div>
}
