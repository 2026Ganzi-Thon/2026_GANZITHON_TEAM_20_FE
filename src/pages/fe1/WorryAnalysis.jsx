import usePrivateNavigation from '../../hooks/usePrivateNavigation.js'
import { readDraft, clearDrafts } from '../../session/privateDraft.js'
import { useEffect, useRef, useState } from 'react'
import { useLocation} from 'react-router-dom';
import { X, LoaderCircle } from 'lucide-react'
import { getWorryRequest, retryWorryRequest } from '../../api/worry.js'
import { isValidPublication } from '../../api/publication.js'
import useRetryCooldown from '../../hooks/useRetryCooldown.js'
import SupportGuidance from './SupportGuidance.jsx'
import './WorryAnalysis.css'

export default function WorryAnalysis() {
  const navigate = usePrivateNavigation(), location = useLocation()
  const { requestId, analysisContext, retryPayload } = readDraft(location.state)
  const [status, setStatus] = useState('PENDING')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [retrying, setRetrying] = useState(false)
  const [checkAttempt, setCheckAttempt] = useState(0)
  const [cooldown, beginCooldown] = useRetryCooldown()
  const finished = useRef(false), retryInFlight = useRef(false), retryAttempt = useRef(null), leaving = useRef(false)
  function close() { leaving.current = true; finished.current = true; navigate('/', { replace: true }) }

  useEffect(() => {
    if (!requestId) { navigate('/', { replace: true }); return }
    let active = true, checking = false
    const started = Date.now()
    finished.current = false
    async function check() {
      if (!active || checking || finished.current) return
      checking = true
      try {
        const data = await getWorryRequest(requestId, analysisContext)
        if (!active || finished.current) return
        if (data.status === 'SUCCEEDED') {
          clearDrafts()
          finished.current = true
          navigate('/worry-complete', { replace: true, state: { status: 'SUCCEEDED', worryId: data.worryId, sealedAt: data.sealedAt, publishAt: data.publishAt } })
        } else if (data.status === 'SUPPORT_GUIDANCE') {
          clearDrafts()
          finished.current = true
          setStatus('SUPPORT_GUIDANCE')
          setErrorMessage('')
          // Remove the original input from this history entry after the safety branch.
          navigate('/worry-analysis', { replace: true, state: { requestId, analysisContext } })
        } else if (data.status === 'FAILED') {
          finished.current = true
          retryAttempt.current = null
          setStatus('FAILED')
          setErrorMessage('걱정을 정리하지 못했어요. 다시 시도해 주세요.')
        } else if (data.status === 'PENDING') {
          setStatus('PENDING')
          setErrorMessage('')
          if (Date.now() - started >= 30000) {
            finished.current = true
            navigate('/', { replace: true })
          }
        } else {
          finished.current = true
          setStatus('CHECK_ERROR')
          setErrorMessage('분석 상태를 확인하지 못했어요. 다시 확인해 주세요.')
        }
      } catch (error) {
        if (!active || finished.current) return
        if (error.response?.status === 429 || error.response?.status === 404) {
          finished.current = true
          setStatus('CHECK_ERROR')
          if (error.response.status === 429) beginCooldown(error)
        }
        setErrorMessage('상태를 확인하는 데 시간이 걸리고 있어요. 다시 확인해 주세요.')
      } finally { checking = false }
    }
    check()
    const poll = window.setInterval(check, 2000)
    const clock = window.setInterval(() => { if (active && !finished.current) setElapsedSeconds(Math.floor((Date.now() - started) / 1000)) }, 1000)
    return () => { active = false; window.clearInterval(poll); window.clearInterval(clock) }
  }, [requestId, analysisContext, checkAttempt, navigate, beginCooldown])

  async function retry() {
    if (status !== 'FAILED' || retryInFlight.current || cooldown) return
    if (!retryPayload?.text || !retryAttempt.current && !isValidPublication(retryPayload.publishAt, Date.now())) {
      navigate('/worry-input', { state: { retryRequestId: requestId, worry: retryPayload?.text || '', anxietyLevel: retryPayload?.anxiety ?? null, tomorrowCheck: retryPayload?.memo || '' } })
      return
    }
    retryAttempt.current ??= { key: crypto.randomUUID(), context: crypto.randomUUID() }
    const attempt = retryAttempt.current
    retryInFlight.current = true
    setRetrying(true)
    setErrorMessage('')
    try {
      await retryWorryRequest(requestId, retryPayload, attempt.key, attempt.context)
      if (leaving.current) return
      retryAttempt.current = null
      setStatus('PENDING')
      setElapsedSeconds(0)
      navigate('/worry-analysis', { replace: true, state: { requestId, analysisContext: attempt.context, retryPayload } })
    } catch (error) {
      if (leaving.current) return
      if (error.response?.status === 429) beginCooldown(error)
      if (error.response?.status === 422) {
        retryAttempt.current = null
        navigate('/worry-confirm', { state: { retryRequestId: requestId, worry: retryPayload.text, anxietyLevel: retryPayload.anxiety, tomorrowCheck: retryPayload.memo || '' } })
      } else if (error.response?.data?.code === 'RETRY_NOT_ALLOWED') {
        setStatus('PENDING')
        setCheckAttempt(value => value + 1)
      } else setErrorMessage(error.response?.status === 429 ? '요청이 많아요. 안내된 시간이 지나면 다시 눌러 주세요.' : '재시도 접수 결과를 확인하지 못했어요. 다시 누르면 같은 요청으로 확인해요.')
    } finally { retryInFlight.current = false; setRetrying(false) }
  }

  if (status === 'SUPPORT_GUIDANCE') return <SupportGuidance />
  const failed = status === 'FAILED', checkError = status === 'CHECK_ERROR'
  return <div className="wa-page">
    <header className="wa-header"><button type="button" className="wa-close" onClick={close} aria-label="닫기"><X size={25} strokeWidth={1.8} /></button></header>
    <main className="wa-main">
      <div className="wa-loading-area"><div className={'wa-spinner' + (failed || checkError ? ' wa-spinner-stopped' : '')} role="status" aria-label={failed ? '분석 실패' : '분석 상태 확인'} /></div>
      <section className="wa-message"><h1>{failed ? '걱정을 정리하지 못했어요' : checkError ? '상태를 확인하지 못했어요' : '걱정을 정리하고 있어요'}</h1><p>{failed || checkError ? '아래 버튼으로 다시 확인할 수 있어요' : '잠시만 기다려 주세요'}</p></section>
      {!failed && !checkError && <div className="wa-status-pill"><LoaderCircle size={17} className="wa-small-spinner" /><span>나가도 정리는 계속돼요</span></div>}
      {failed && <button type="button" className="wa-retry-button" disabled={retrying || cooldown > 0} onClick={retry}>{cooldown ? cooldown + '초 뒤 다시 시도' : retrying ? '재시도 접수 중...' : retryPayload ? '다시 시도' : '입력 확인 후 다시 시도'}</button>}
      {failed && retryPayload && <button type="button" className="wa-home-button" disabled={retrying || cooldown > 0} onClick={() => navigate('/worry-input', { state: { retryRequestId: requestId, worry: retryPayload.text, anxietyLevel: retryPayload.anxiety, tomorrowCheck: retryPayload.memo || '' } })}>입력 다시 확인</button>}
      {checkError && <button type="button" className="wa-retry-button" disabled={cooldown > 0} onClick={() => { setStatus('PENDING'); setCheckAttempt(value => value + 1) }}>{cooldown ? cooldown + '초 뒤 다시 확인' : '상태 다시 확인'}</button>}
      {(failed || checkError) && <button type="button" className="wa-home-button" onClick={close}>홈으로 이동</button>}
    </main>
    <footer className="wa-footer"><div className="wa-notice"><p className="wa-notice-title">{failed ? '정리하지 못했어요' : elapsedSeconds >= 15 ? '조금만 더 기다려 주세요' : '걱정을 안전하게 정리하고 있어요'}</p><p>{errorMessage || (elapsedSeconds >= 15 ? '정리가 길어지고 있어요. 나가더라도 서버에서 계속 진행돼요.' : '잠시 기다려 주세요. 화면을 나가도 정리는 계속돼요.')}</p></div></footer>
  </div>
}
