import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy } from 'lucide-react'
import './SupportGuidance.css'

export default function SupportGuidance() {
  const navigate = useNavigate()
  const [copyStatus, setCopyStatus] = useState('')
  const fallback = useRef(null)
  const [showFallback, setShowFallback] = useState(false)
  async function copyNumbers() {
    try {
      await navigator.clipboard.writeText('109 / 119')
      setCopyStatus('번호를 복사했어요')
    } catch {
      setShowFallback(true)
      setCopyStatus('아래 번호를 길게 눌러 복사해 주세요')
      window.setTimeout(() => { fallback.current?.focus(); fallback.current?.select() }, 0)
    }
  }
  return <main className="support-page">
    <h1>지금은 도움을 함께 받아보세요</h1>
    <p className="support-intro">적어주신 내용에 대해, 지금 도움을 받을 수 있는 연결 정보를 먼저 안내드릴게요.</p>
    <p className="support-description">현재 자신을 해칠 위험이 있거나 이미 다친 상황이라면 응급 도움을 요청해 주세요. 가능하다면 믿을 수 있는 사람에게 지금 함께 있어 달라고 연락해 보세요.</p>
    <div className="support-actions">
      <a className="support-call" href="tel:109">109 상담전화 연결</a>
      <a className="support-secondary" href="tel:119">긴급한 상황이라면 119</a>
      <button className="support-copy" type="button" onClick={copyNumbers}><Copy size={16} aria-hidden="true" /><span>전화 연결이 안 되는 환경이면 번호를 복사할 수 있어요 · 109 / 119</span></button>
    </div>
    {showFallback && <input ref={fallback} className="support-number" aria-label="복사할 상담·응급 번호" readOnly value="109 / 119" />}
    <span className="support-copy-status" role="status">{copyStatus}</span>
    <p className="support-notice">이 서비스는 응급 신고나 전문 상담을 대신하지 않습니다. 입력 내용을 사람이 실시간으로 확인하고 있지 않습니다.</p>
    <button className="support-secondary support-home" type="button" onClick={() => navigate('/', { replace: true })}>홈으로</button>
  </main>
}
