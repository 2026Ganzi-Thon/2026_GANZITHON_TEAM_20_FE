import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, notifyDataChanged } from './api.js'
import { dateLabel, HELP, OUTCOMES } from './domain.js'
import { Button, DistressScale, Feedback, Header, Icon, Modal, ResourceState, StepBars } from './components.jsx'
import { useMutation, useResource } from './hooks.js'

export default function Detail() {
  const { worryId } = useParams(), navigate = useNavigate(), location = useLocation()
  const detail = useResource('detail', [worryId]), candidate = useResource('reflection', [worryId]), past = useResource('similar', [worryId])
  const mutation = useMutation(), reflectionMutation = useMutation(), distressMutation = useMutation()
  const [switching, setSwitching] = useState(null), [toast, setToast] = useState(location.state?.toast || '')
  const [currentDistress, setCurrentDistress] = useState(undefined), [hiddenCandidate, setHiddenCandidate] = useState(false)
  const w = detail.data
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 4200)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (!w?.id) return
    let active = true
    api.markViewed(w.id).then(() => { if(active) notifyDataChanged() }).catch(() => {
      if(active) setToast('열람 상태를 저장하지 못했어요. 다시 열면 재시도해요.')
    })
    return () => {active=false}
  }, [w?.id])
  async function select(type, activeId) {
    const result = await mutation.run(() => api.selectHelp(worryId, type, activeId))
    if (result.ok) { notifyDataChanged(); navigate(`/worries/${worryId}/${HELP[type].slug}`) }
    else if (result.error?.response?.data?.error?.code === 'ACTIVITY_SWITCH_CONFIRM_REQUIRED') {
      const details = result.error.response.data.error.details
      const activeId = details?.active_activity_id
      // Read the current activity and send the exact expected ID on confirmation.
      if (activeId) {
        const current = await mutation.run(() => api.activity(activeId))
        if (current.ok) setSwitching({ type, activity: current.data })
      }
    }
  }
  async function distress(value) {
    if (value === null) return // Optional skip never erases an already saved anxiety score.
    const result = await distressMutation.run(() => api.distress(worryId, value))
    if (result.ok) { setCurrentDistress(value); notifyDataChanged() }
  }
  async function reflect(outcome) {
    const result = await reflectionMutation.run(() => api.reflect(candidate.data.worry_id, outcome, worryId))
    if (result.ok) { setHiddenCandidate(true); notifyDataChanged() }
  }
  async function skip() {
    const result = await reflectionMutation.run(api.skipReflection)
    if (result.ok) setHiddenCandidate(true)
  }
  const edited = w?.summary_edited || location.state?.summaryEdited || (w?.ai_content.original_summary && w.ai_content.display_summary !== w.ai_content.original_summary)
  return <><Header title={w ? `${dateLabel(w.created_at)} 걱정` : '걱정 확인'} /><main className="fe2-content fe2-detail"><ResourceState resource={detail}>{w && <>
    {!hiddenCandidate && candidate.data && <section className="fe2-reflection"><div className="fe2-reflection-copy"><h2>지난 걱정은 어떻게 됐나요?</h2><p className="fe2-small fe2-muted">{dateLabel(candidate.data.created_at || candidate.data.first_available_at)}에 맡긴 걱정 · 선택 사항이에요</p></div>
      <div className="fe2-choice-row">{Object.entries(OUTCOMES).map(([value, label]) => <button key={value} disabled={reflectionMutation.busy} onClick={() => reflect(value)}>{label}</button>)}</div>
      <button className="fe2-text-button" disabled={reflectionMutation.busy} onClick={skip}>오늘은 건너뛰기</button><Feedback error>{reflectionMutation.error}</Feedback></section>}
    {candidate.error && <div className="fe2-optional-error"><Feedback error>지난 걱정을 불러오지 못했어요</Feedback><button className="fe2-text-button" onClick={candidate.refresh}>다시 시도</button></div>}
    <section className="fe2-original"><h2 className="fe2-section-label">그날의 걱정 <span className="fe2-badge">그날 불안도 {w.distress_before}</span></h2><p>{w.worry_text}</p>
      {w.tomorrow_note && <div className="fe2-note"><span>내일 확인할 것</span><strong>{w.tomorrow_note}</strong></div>}</section>
    <section className="fe2-summary-card"><div className="fe2-row-meta"><h2>{edited ? '내가 정리했어요' : 'AI가 정리했어요'}</h2><Link to={`/worries/${worryId}/edit`} className="fe2-text-button">수정</Link></div><p>{w.ai_content.display_summary}</p></section>
    <section className="fe2-current-distress"><div className="fe2-row-meta"><h2>지금은 어때요?</h2><button className="fe2-text-button" disabled={distressMutation.busy} onClick={() => distress(null)}>건너뛰기</button></div>
      <DistressScale value={currentDistress === undefined ? w.distress_after : currentDistress} onChange={distress} disabled={distressMutation.busy} /><Feedback error>{distressMutation.error}</Feedback></section>
    {past.data && <Link to={`/records/${past.data.record_id}`} className="fe2-past"><div><strong>비슷한 걱정이 있었어요</strong><p>{past.data.created_at && new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric'}).format(new Date(past.data.created_at))+' · '}{past.data.helpfulness === 'HELPFUL' ? `그때는 ${HELP[past.data.previous_help_type]?.title || '선택한 도움'}이 도움이 됐다고 답했어요` : `그때는 ${HELP[past.data.previous_help_type]?.title || '도움'}을 선택했어요`}</p></div><Icon name="chevron" size={16} /></Link>}
    {past.error && <div className="fe2-optional-error"><Feedback error>과거 경험을 불러오지 못했어요</Feedback><button className="fe2-text-button" onClick={past.refresh}>다시 시도</button></div>}
    <section className="fe2-help"><h2 className="fe2-section-label">지금 뭘 해볼까요</h2>{Object.entries(HELP).map(([type, help]) => w.allowed_help.includes(type) && <button key={type} className={`fe2-help-option ${w.ai_content.recommended_help === type ? 'is-recommended' : ''}`} disabled={mutation.busy} onClick={() => select(type)}><div><strong>{help.title} {w.ai_content.recommended_help === type && <span className="fe2-badge">AI 추천</span>}</strong><p>{help.description}</p></div><Icon name="chevron" size={16} /></button>)}<Feedback error>{mutation.error}</Feedback></section>
  </>}</ResourceState></main>{toast && <div className="fe2-toast" role="status">{toast}</div>}
  {switching && <Modal className="fe2-switch-modal" title="진행 중인 활동을 중단할까요?" onClose={() => setSwitching(null)} busy={mutation.busy}>
    <p className="fe2-muted fe2-modal-description">{HELP[switching.activity.type]?.title}{switching.activity.type === 'ACTION' ? `이 ${switching.activity.steps?.filter(s => s.checked).length || 0}/3 단계까지 진행돼 있어요. 다른 도움을 고르면 지금 활동은 중단돼요. 체크한 단계는 그대로 남고, 중단을 실패로 기록하지 않아요.` : '이 진행 중이에요. 다른 도움을 고르면 지금 활동은 중단돼요. 중단을 실패로 기록하지 않아요.'}</p>
    {switching.activity.type === 'ACTION' && <StepBars count={switching.activity.steps?.filter(s => s.checked).length} />}<Feedback error>{mutation.error}</Feedback>
    <Button disabled={mutation.busy} onClick={() => select(switching.type, switching.activity.activity_id)}>중단하고 바꾸기</Button><Button secondary disabled={mutation.busy} onClick={() => setSwitching(null)}>취소</Button>
  </Modal>}</>
}
