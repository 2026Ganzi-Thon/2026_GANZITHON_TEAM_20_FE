import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { api, forgetActivity, notifyDataChanged, serverNow } from './api.js'
import { canComplete, dateLabel, HELP, RATINGS, remainingSeconds } from './domain.js'
import { Actions, Button, Feedback, Header, Icon, Modal, ResourceState } from './components.jsx'
import { useMutation, useResource, useServerClock } from './hooks.js'
import Deletion from './Deletion.jsx'

function useCompletion() {
  const navigate = useNavigate(), mutation = useMutation()
  return { ...mutation, complete: async activity => {
    const result = await mutation.run(() => api.activityCommand(activity.activity_id, 'complete'))
    if (result.ok) { forgetActivity(activity); notifyDataChanged(); navigate(`/activities/${activity.activity_id}/result`, { replace: true }) }
  } }
}
export function ActionPage() {
  const { worryId } = useParams(), navigate = useNavigate()
  const resource = useResource('entryActivity', [worryId, 'ACTION']), mutation = useMutation(), completion = useCompletion()
  const a = resource.data, count = a?.steps?.filter(step => step.checked).length ?? 0
  async function check(step) {
    const result = await mutation.run(() => api.step(a.activity_id, step.step_number, !step.checked))
    if (result.ok) { resource.refresh(); notifyDataChanged() }
  }
  async function pause() {
    const result = await mutation.run(() => api.activityCommand(a.activity_id, 'pause'))
    if (result.ok) { forgetActivity(a); notifyDataChanged(); navigate('/') }
  }
  return <><Header title="10분 액션" back={`/worries/${worryId}`} /><main className="fe2-content fe2-action"><ResourceState resource={resource}>{a && <>
    <h2 className="title-2">지금 할 수 있는 작은 행동이에요</h2><p className="fe2-muted">순서는 자유롭게. 제한 시간은 없어요.</p>
    <div className="fe2-steps">{a.steps?.map(step => <label key={step.step_number} className={`fe2-step ${step.checked ? 'is-checked' : ''}`}><input type="checkbox" checked={step.checked} disabled={mutation.busy || completion.busy} onChange={() => check(step)} /><span>{step.title}</span></label>)}</div>
    <div className="fe2-progress-caption"><span>{count} / 3 완료</span><span>세 단계를 모두 체크하면 완료 가능</span></div>
    <Feedback error>{mutation.error ? '체크 상태를 저장하지 못했어요. 다시 체크해 주세요.' : completion.error}</Feedback>
  </>}</ResourceState></main>{a && <Actions className="fe2-action-actions"><Button disabled={!canComplete(a, serverNow()) || mutation.busy || completion.busy} onClick={() => completion.complete(a)}>전체 완료</Button><Button secondary disabled={mutation.busy || completion.busy} onClick={pause}>나중에 이어하기</Button></Actions>}</>
}

export function RestPage() {
  const { worryId } = useParams(), navigate = useNavigate(), now = useServerClock()
  const detail = useResource('detail', [worryId]), current = useResource('currentActivity', [worryId, 'REST'])
  const [started, setStarted] = useState(null), [confirm, setConfirm] = useState(false), [syncError, setSyncError] = useState('')
  const mutation = useMutation(), completion = useCompletion()
  const a = started || current.data, seconds = remainingSeconds(a, now)
  const activeId = a?.activity_id
  useEffect(() => {
    if (!activeId) return
    let active = true
    const update = () => api.activity(activeId).then(value => { if (active) { setStarted(value); setSyncError('') } }).catch(() => { if (active) setSyncError('휴식 상태를 확인하지 못했어요. 연결이 돌아오면 다시 확인할게요.') })
    const timer = setInterval(update, 5000)
    window.addEventListener('focus', update)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', update) }
  }, [activeId])
  async function start() {
    const result = await mutation.run(() => api.start(worryId, 'REST'))
    if (result.ok) { setStarted(result.data); notifyDataChanged() }
  }
  async function command(name) {
    const result = await mutation.run(() => api.activityCommand(a.activity_id, name))
    if (result.ok) {
      if (name === 'stop') { forgetActivity(a); notifyDataChanged(); navigate(`/worries/${worryId}`) }
      else { setStarted(result.data); notifyDataChanged() }
    }
  }
  const ready = seconds === 0
  return <><Header title="짧은 휴식" back={`/worries/${worryId}`} /><main className="fe2-content fe2-rest"><ResourceState resource={detail}><ResourceState resource={current}>
    {!a ? <div className="fe2-rest-intro"><div className="fe2-illustration-slot"><Icon name="moon" /></div><div className="fe2-rest-copy"><h2 className="title-2">3분만 쉬어가요</h2><p className="fe2-muted">{detail.data?.ai_content.rest_guidance}</p></div><span className="fe2-pill">직접 시작할 때까지 기다릴게요</span></div> : <div className="fe2-timer-wrap"><div className="fe2-timer" role="timer" aria-label={`남은 시간 ${Math.floor(seconds / 60)}분 ${seconds % 60}초`}><strong>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</strong><span>{a.status === 'PAUSED' ? '일시정지' : '남은 시간'}</span></div><p className="fe2-muted">{ready ? '휴식을 마치려면 완료를 눌러 주세요' : '천천히, 서두르지 않아도 돼요'}</p></div>}
    <Feedback error>{mutation.error || completion.error || syncError}</Feedback>
  </ResourceState></ResourceState></main>{!detail.loading && !detail.error && !current.loading && !current.error && <Actions>
    {!a ? <><Button onClick={start} disabled={mutation.busy}>시작하기</Button><Button secondary onClick={() => navigate(`/worries/${worryId}`)}>다음에 할게요</Button></> : <>
      <Button disabled={mutation.busy || completion.busy} onClick={() => ready ? completion.complete(a) : command(a.status === 'PAUSED' ? 'resume' : 'pause')}>{ready ? '휴식 완료' : a.status === 'PAUSED' ? '재개하기' : '일시정지'}</Button>
      <Button secondary disabled={mutation.busy || completion.busy} onClick={() => setConfirm(true)}>그만두기</Button></>}
  </Actions>}{confirm && <Modal className="fe2-rest-stop-modal" title="휴식을 그만둘까요?" onClose={() => setConfirm(false)} busy={mutation.busy}>
    <p className="fe2-muted fe2-modal-description">남은 {Math.floor(seconds / 60)}분 {seconds % 60}초는 저장되지 않아요. 다시 시작하면 처음 3분부터 시작해요.</p><Feedback error>{mutation.error}</Feedback>
    <Button disabled={mutation.busy} onClick={() => setConfirm(false)}>계속하기</Button><Button secondary disabled={mutation.busy} onClick={() => command('stop')}>그만두기</Button></Modal>}</>
}

export function EmpathyPage() {
  const { worryId } = useParams(), content = useResource('empathy', [worryId]), activity = useResource('entryActivity', [worryId, 'EMPATHY']), completion = useCompletion()
  return <><Header title="그냥 들어줘" back={`/worries/${worryId}`} /><main className="fe2-content fe2-empathy"><ResourceState resource={content}><ResourceState resource={activity}>
    <section className="fe2-empathy-card"><Icon name="heart" size={24} /><p>{content.data?.empathy_message}</p></section><Feedback error>{completion.error}</Feedback>
  </ResourceState></ResourceState></main>{activity.data && !content.error && <Actions><Button disabled={completion.busy} onClick={() => completion.complete(activity.data)}>읽었어요</Button></Actions>}</>
}

export function ResultPage() {
  const { activityId } = useParams(), resource = useResource('activity', [activityId]), mutation = useMutation()
  const [rating, setRating] = useState(null), a = resource.data
  async function rate(value) {
    const result = await mutation.run(() => api.rate(activityId, value))
    if (result.ok) { setRating(value); notifyDataChanged() }
  }
  return <><main className="fe2-content fe2-result"><ResourceState resource={resource}>{a && a.status === 'COMPLETED' ? <>
    <div className="fe2-result-heading"><div className="fe2-illustration-slot"><Icon name="check" /></div><div className="fe2-result-copy"><h1 className="title-1">{{ ACTION: '10분 액션을 마쳤어요', REST: '짧은 휴식을 마쳤어요', EMPATHY: '공감 메시지를 읽었어요' }[a.type]}</h1><p className="fe2-muted">{a.completion_message || '작게라도 움직인 게 기록으로 남아요'}</p></div></div>
    <section className="fe2-rating"><h2>도움이 됐나요?</h2><p className="fe2-muted fe2-small">선택하지 않아도 완료는 그대로예요</p><div className="fe2-choice-row">{Object.entries(RATINGS).map(([value, label]) => <button key={value} disabled={mutation.busy} aria-pressed={(rating || a.helpfulness) === value} onClick={() => rate(value)}>{label}</button>)}</div>
      <Feedback error>{mutation.error ? '활동은 완료됐지만 평가를 저장하지 못했어요. 다시 선택해 주세요.' : ''}</Feedback></section>
  </> : a && <Feedback error>아직 완료되지 않은 활동이에요.</Feedback>}</ResourceState></main>{a?.status === 'COMPLETED' && <Actions><Link to="/" className="fe2-button fe2-primary">홈으로</Link><Link to="/vault" className="fe2-button fe2-secondary">다음 걱정 보기</Link></Actions>}</>
}

export function ShredPage() {
  const { worryId } = useParams(), navigate = useNavigate(), resource = useResource('detail', [worryId])
  const [done, setDone] = useState(false)
  if (done) return <><main className="fe2-content fe2-shred-complete"><div className="fe2-illustration-slot"><Icon name="shred" /></div><div className="fe2-shred-copy"><h1 className="title-2">파쇄했어요</h1><p className="fe2-muted">원문과 분석, 활동 기록까지 함께 지웠어요.</p></div></main><Actions><Link to="/" className="fe2-button fe2-primary">홈으로</Link><Link to="/vault" className="fe2-button fe2-secondary">금고로</Link></Actions></>
  return <><Header title="걱정 파쇄" back={`/worries/${worryId}`} /><main className="fe2-content fe2-shred"><ResourceState resource={resource}>{resource.data && <>
    <h2 className="title-2">이 걱정을 파쇄할까요?</h2><p className="fe2-muted fe2-small">{dateLabel(resource.data.created_at)}에 맡긴 걱정이에요</p>
    <section className="fe2-delete-scope"><h3>함께 지워지는 것</h3><ul>{['걱정 원문과 ‘내일 확인할 것’ 메모', 'AI 정리와 도움 추천', '이 걱정으로 한 활동 기록', '회고 응답과 도움 여부 평가', '이 걱정에 걸린 알림 예약'].map(text => <li key={text}>{text}</li>)}</ul></section><p className="fe2-delete-warning">한 번 파쇄하면 되돌릴 수 없어요. 기록·추천에서도 모두 빠져요.</p>
  </>}</ResourceState></main>{resource.data && <Actions className="fe2-shred-actions"><Deletion inline shred worryId={worryId} onClose={() => navigate(`/worries/${worryId}`)} onDeleted={() => setDone(true)} /></Actions>}</>
}
export function ActivityLink() {
  const { activityId } = useParams(), resource = useResource('activity', [activityId]), a = resource.data
  return <ResourceState resource={resource}>{a && <Navigate replace to={a.status === 'COMPLETED' ? `/activities/${activityId}/result` : `/worries/${a.worry_id}/${HELP[a.type].slug}`} />}</ResourceState>
}
