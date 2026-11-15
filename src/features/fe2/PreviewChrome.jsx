import {createPortal} from 'react-dom'
export default function PreviewChrome({legacy,night,theme,onTheme,mock,homeIndicator}){
 return <><div className={'fe2-preview-status '+(legacy?'is-legacy':'')} aria-hidden="true"><span>9:41</span>{legacy?<div className="fe2-preview-signals"><i/><i/><i/></div>:<img alt="" width="75" height="13" src={'/fe2/figma/'+(night?'nightEdit':'vault')+'-imgGroup1.svg'}/>}</div>
 {homeIndicator&&<div className="fe2-preview-home-indicator" aria-hidden="true"/>}
 {createPortal(<aside className="fe2-preview-tools" aria-label="디자인 확인 도구"><strong>디자인 확인</strong><span>{mock?'예시 데이터 · 실제 저장 안 됨':'실제 API 연결'}</span><label>화면 모드<select aria-label="디자인 확인 모드" value={theme} onChange={e=>onTheme(e.target.value)}><option value="auto">시간에 따라 자동</option><option value="light">라이트 원본 비교</option><option value="night">나이트 원본 비교</option></select></label></aside>,document.body)}</>
}
