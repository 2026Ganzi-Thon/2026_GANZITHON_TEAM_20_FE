import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, notifyDataChanged } from './api.js'
import { dateLabel, HELP, OUTCOMES, RATINGS } from './domain.js'
import { BottomTabs, Button, EmptyState, Feedback, Header, Icon, ResourceState } from './components.jsx'
import { useMutation, useResource } from './hooks.js'
import Deletion from './Deletion.jsx'

export default function Records() {
  const resource = useResource('records', [null]), mutation = useMutation()
  const [extra, setExtra] = useState([]), [cursor, setCursor] = useState(null)
  useEffect(()=>{const reset=()=>{setExtra([]);setCursor(null)};window.addEventListener('wooly:data-changed',reset);return()=>window.removeEventListener('wooly:data-changed',reset)},[])
  const items = [...new Map([...extra, ...(resource.data?.items || [])].map(w => [w.id, w])).values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  async function more() {
    const result = await mutation.run(() => api.records(cursor || resource.data.next_cursor))
    if (result.ok) { setExtra(previous => [...previous, ...result.data.items]); setCursor(result.data.next_cursor || 'END') }
  }
  return <><Header title="기록" tab /><main className="fe2-content fe2-records"><ResourceState resource={resource}>
    {items.length ? <div className="fe2-record-list">{items.map(w => <Link className="fe2-record-row" to={`/records/${w.id}`} key={w.id}>
      <div className="fe2-row-meta"><time>{dateLabel(w.created_at)}</time><Icon name="chevron" size={16} /></div><strong className="fe2-ellipsis">{w.display_summary}</strong>
      <div className="fe2-record-chips"><span>불안도 {w.distress_before ?? '미기록'} → {w.distress_after ?? '미기록'}</span><span>{w.latest_help_type ? HELP[w.latest_help_type]?.title : '아직 선택하지 않음'}</span></div></Link>)}</div> :
      <EmptyState placeholder title="아직 공개된 기록이 없어요" description={<>맡긴 걱정이 공개되면<br />여기에 하나씩 쌓여요</>} action={<Link className="fe2-button fe2-primary" to="/worry-input">걱정 맡기기</Link>} />}
    {(cursor !== 'END' && (cursor || resource.data?.next_cursor)) && <Button secondary onClick={more} disabled={mutation.busy}>더 보기</Button>}<Feedback error>{mutation.error}</Feedback>
  </ResourceState></main><BottomTabs /></>
}

export function RecordDetail() {
  const { worryId } = useParams(), navigate = useNavigate(), resource = useResource('record', [worryId])
  const [deleting, setDeleting] = useState(false), [viewError,setViewError] = useState(''), data = resource.data, w = data?.worry
  const last = data?.activities?.at(-1), rating = data?.ratings?.find(r => r.activity_id === last?.activity_id)
  useEffect(() => {
    if (!w?.id) return
    let active = true
    api.markViewed(w.id).then(() => { if(active) { setViewError(''); notifyDataChanged() } }).catch(() => { if(active) setViewError('열람 상태를 저장하지 못했어요. 다시 열면 재시도해요.') })
    return () => { active = false }
  }, [w?.id])
  const both = w?.distress_before != null && w?.distress_after != null
  return <><Header title={w ? `${dateLabel(w.created_at)} 기록` : '기록 상세'} back="/records" /><main className="fe2-content fe2-record-detail"><ResourceState resource={resource}>{w && <>
    <Feedback error>{viewError}</Feedback>
    <section className="fe2-comparison"><h2>불안도 변화</h2><div className="fe2-score-comparison"><div><strong>{w.distress_before ?? '미기록'}</strong><span>봉인 전</span></div>{both && <Icon name="arrow" />}<div><strong>{w.distress_after ?? '미기록'}</strong><span>공개 후</span></div></div>
      <p className="fe2-small fe2-muted">두 값이 모두 있을 때만 비교해요. 좋아지거나 나빠졌다는 판정은 하지 않아요.</p></section>
    <section className="fe2-record-original"><h2 className="fe2-muted">그날의 걱정</h2><p>{w.worry_text}</p></section>
    {w.tomorrow_note && <section><h2 className="fe2-muted">내일 확인할 것</h2><p>{w.tomorrow_note}</p></section>}
    <section className="fe2-summary-card"><h2 className="fe2-muted">{w.summary_edited ? '내가 정리했어요' : 'AI 정리'}</h2><p>{w.ai_content.display_summary}</p></section>
    <dl className="fe2-record-facts"><div><dt>한 활동</dt><dd>{last ? `${HELP[last.type]?.title} · ${last.status === 'COMPLETED' ? last.type === 'ACTION' ? '3단계 모두 완료' : '완료' : last.status === 'STOPPED' ? '중단' : '진행 중'}` : '미기록'}</dd></div>
      <div><dt>회고 응답</dt><dd>{OUTCOMES[data.reflection?.outcome] || '미기록'}</dd></div><div><dt>도움 여부</dt><dd>{rating?.helpfulness === 'HELPFUL' ? '도움 됐어요' : RATINGS[rating?.helpfulness] || '미기록'}</dd></div></dl>
    {data.activities?.length > 1 && <section className="fe2-activity-history"><h2>활동 이력</h2>{data.activities.map(activity => <div key={activity.activity_id}><p>{HELP[activity.type]?.title} · {activity.status === 'COMPLETED' ? '완료' : activity.status === 'STOPPED' ? '중단' : '진행 중'}{activity.helpfulness ? ' · ' + RATINGS[activity.helpfulness] : ''}</p>{activity.type === 'ACTION' && activity.status === 'STOPPED' && <Link to={'/worries/'+w.id} className="fe2-text-button">이어서 활동 선택</Link>}</div>)}</section>}
    {last?.type === 'ACTION' && last.status === 'STOPPED' && <Link to={'/worries/'+w.id} className="fe2-button fe2-secondary">이어서 활동 선택</Link>}
    <Button secondary onClick={() => setDeleting(true)}>이 기록 삭제</Button>
  </>}</ResourceState></main>{deleting && <Deletion worryId={worryId} description={`${dateLabel(w.created_at)} 기록이에요. 원문과 AI 정리, 활동·회고·도움 평가가 함께 지워지고 목록·추천에서도 빠져요. 되돌릴 수 없어요.`}
    onClose={() => setDeleting(false)} onDeleted={() => { notifyDataChanged(); navigate('/records', { replace: true }) }} />}</>
}
