import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, notifyDataChanged, serverNow } from './api.js'
import { dateLabel, releaseLabel, toLocalInput } from './domain.js'
import { Button, EmptyState, Feedback, Header, Icon, Modal, ResourceState } from './components.jsx'
import { useMutation, useResource } from './hooks.js'
import Deletion from './Deletion.jsx'
import DatePicker from './DatePicker.jsx'

export function TimeWheel({ label, values, value, onChange, cyclic = true }) {
  const index = values.findIndex(item => item.value === value)
  const at = position => cyclic ? values[(position + values.length) % values.length] : values[position]
  const select = delta => { const next = at(index + delta); if (next) onChange(next.value) }
  return <div className="fe2-wheel-column" role="spinbutton" tabIndex={0} aria-label={label} aria-valuenow={index} aria-valuetext={values[index]?.label}
    aria-valuemin={0} aria-valuemax={values.length - 1} onKeyDown={e => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); select(e.key === 'ArrowUp' ? -1 : 1) } }}>
    <button type="button" aria-label={`${label} 이전`} disabled={!at(index - 1)} onClick={() => select(-1)}>{at(index - 1)?.label}</button>
    <span>{values[index]?.label}</span>
    <button type="button" aria-label={`${label} 다음`} disabled={!at(index + 1)} onClick={() => select(1)}>{at(index + 1)?.label}</button>
  </div>
}
function ReleaseEditor({ worry, onClose, onSaved }) {
  const initial = new Date(worry.release_at)
  const [day, setDay] = useState(() => toLocalInput(worry.release_at))
  const [hour, setHour] = useState(initial.getHours() % 12 || 12)
  const [period, setPeriod] = useState(initial.getHours() >= 12 ? 'PM' : 'AM')
  const [minute, setMinute] = useState(initial.getMinutes())
  const [validation, setValidation] = useState('')
  const mutation = useMutation()
  async function save() {
    const value = new Date(`${day}T${String(hour % 12 + (period === 'PM' ? 12 : 0)).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
    if (!Number.isFinite(value.getTime()) || value.getTime() <= serverNow() || value.getTime() >= Date.parse(worry.created_at) + 30 * 86400000) { setValidation('지금 이후이고 삭제 예정 시각 이전인 시간을 선택해 주세요.'); return }
    const result = await mutation.run(() => api.release(worry.id, value.toISOString()))
    if (result.ok) { notifyDataChanged(); onSaved() }
    else if (result.error?.response?.data?.error?.code?.match(/^(ALREADY_AVAILABLE|ALREADY_PUBLIC)$/)) onSaved()
  }
  return <Modal sheet className="fe2-release-sheet" title="공개 시각 변경" onClose={onClose} busy={mutation.busy}>
    <p className="fe2-muted">{dateLabel(worry.created_at)}에 맡긴 걱정</p>
    <DatePicker value={day} timeLabel={hour+':'+String(minute).padStart(2,'0')+(period==='PM'?' PM':' AM')} min={toLocalInput(serverNow())} max={toLocalInput(Date.parse(worry.created_at) + 30 * 86400000 - 60000)} onChange={setDay} />
    <div className="fe2-time-wheel"><TimeWheel label="오전·오후" cyclic={false} values={[{ value: 'PM', label: '오후' }, { value: 'AM', label: '오전' }]} value={period} onChange={setPeriod} />
      <TimeWheel label="시" values={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))} value={hour} onChange={setHour} />
      <TimeWheel label="분" values={[...new Set([0, 10, 20, 30, 40, 50, initial.getMinutes()])].sort((a, b) => a - b).map(i => ({ value: i, label: String(i).padStart(2, '0') }))} value={minute} onChange={setMinute} /></div>
    <p className="fe2-small fe2-muted">지금 이후이고 삭제 예정 시각(작성일 +30일) 이전만 고를 수 있어요. 이미 공개된 걱정은 다시 잠글 수 없어요.</p>
    <Feedback error>{validation || mutation.error}</Feedback>
    <Button disabled={mutation.busy} onClick={save}>변경하기</Button><Button secondary disabled={mutation.busy} onClick={onClose}>취소</Button>
  </Modal>
}
function LockSheet({ worryId, onClose, onRefresh }) {
  const resource = useResource('lock', [worryId]), [mode, setMode] = useState('lock')
  const navigate = useNavigate(), worry = resource.data
  const available = worry?.status === 'AVAILABLE' || resource.error?.response?.data?.error?.code === 'ALREADY_AVAILABLE'
  useEffect(() => {
    if (!worry || worry.status !== 'LOCKED') return
    const timer = setTimeout(resource.refresh, Math.max(5000, Date.parse(worry.release_at) - serverNow() + 200))
    return () => clearTimeout(timer)
  }, [worry, resource.refresh])
  if (mode === 'time' && worry && !available) return <ReleaseEditor worry={worry} onClose={() => setMode('lock')} onSaved={() => { setMode('lock'); resource.refresh(); onRefresh() }} />
  if (mode === 'delete' && worry) return <Deletion title="이 걱정을 삭제할까요?" wide worryId={worry.id} description={`${dateLabel(worry.created_at)}에 맡긴 걱정이에요. 원문과 분석·활동 기록, 예약된 알림이 함께 지워지고 되돌릴 수 없어요.`}
    onClose={() => setMode('lock')} onDeleted={() => { onClose(); onRefresh() }} />
  return <Modal sheet className={'fe2-lock-sheet'+(available?' is-available':'')} title={worry ? `${dateLabel(worry.created_at)}에 맡긴 걱정` : '잠금 안내'} onClose={onClose}>
    {available ? <><p className="fe2-muted">지금 열어볼 수 있어요</p><div className="fe2-info"><Icon name="lock-open" /><p>공개 시각이 지났어요. 원문은 자동으로 펼쳐지지 않고, 확인하기를 누르면 열려요.</p></div>
      <Button onClick={() => navigate(`/worries/${worryId}`)}>걱정 확인하기</Button></> : <ResourceState resource={resource}>{worry && <><p className="fe2-muted">{releaseLabel(worry.release_at)}에 열려요</p><div className="fe2-info"><Icon name="lock" /><p>공개 시각까지는 원문·메모·AI 정리·불안도를 볼 수 없어요. 조기 열기는 제공하지 않아요.</p></div>
      {worry.can_change_release && <Button secondary onClick={() => setMode('time')}>공개 시간 변경</Button>}</>}</ResourceState>}
    {worry?.can_delete && <Button secondary className="fe2-muted-button" onClick={() => setMode('delete')}>삭제</Button>}
    <Button secondary={available} onClick={onClose}>닫기</Button>
  </Modal>
}
export default function Vault() {
  const resource = useResource('vault', [null]), [selected, setSelected] = useState(null)
  const [extra, setExtra] = useState({ available: [], locked: [], cursor: null }), loadMore = useMutation()
  const list = resource.data
  useEffect(()=>{const reset=()=>setExtra({available:[],locked:[],cursor:null});window.addEventListener('wooly:data-changed',reset);return()=>window.removeEventListener('wooly:data-changed',reset)},[])
  useEffect(() => {
    if (!list?.locked?.length) return
    const nearest = Math.min(...list.locked.map(w => Date.parse(w.release_at)))
    const timer = setTimeout(resource.refresh, Math.max(5000, nearest - serverNow() + 300))
    return () => clearTimeout(timer)
  }, [list, resource.refresh])
  const merged = kind => [...new Map([...extra[kind], ...(list?.[kind] ?? [])].map(w => [w.id, w])).values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  async function more() {
    const r = await loadMore.run(() => api.vault(extra.cursor || list.next_cursor))
    if (r.ok) setExtra(previous => ({ available: [...previous.available, ...r.data.available], locked: [...previous.locked, ...r.data.locked], cursor: r.data.next_cursor || 'END' }))
  }
  return <><Header title="금고" back="/" /><main className="fe2-content fe2-vault"><ResourceState resource={resource}>
    {list && !list.available.length && !list.locked.length ? <EmptyState title="아직 맡긴 걱정이 없어요" description="맡긴 걱정이 여기에 모여요" action={<Link to="/" className="fe2-button fe2-primary">홈으로</Link>} /> : list && ['available', 'locked'].map(kind => <section key={kind} className="fe2-vault-section">
      <h2 className="fe2-section-label">{kind === 'available' ? '열어볼 수 있어요' : '아직 잠겨 있어요'} <span className="fe2-count">{merged(kind).length}</span></h2>
      {merged(kind).map(w => kind === 'available' ? <Link className="fe2-vault-row is-available" to={`/worries/${w.id}`} key={w.id}>
        <Icon name="lock-open" /><div className="fe2-row-content"><div className="fe2-row-meta"><time>{dateLabel(w.created_at)}</time>{w.is_unviewed && <span className="fe2-new-badge">새로 공개</span>}</div>
        <strong className="fe2-ellipsis">{w.display_summary}</strong><small>봉인 전 불안도 {w.distress_before ?? '미기록'}</small></div><Icon name="chevron" size={16} /></Link> :
        <button className="fe2-vault-row is-locked" key={w.id} onClick={() => setSelected(w.id)}><Icon name="lock" /><div className="fe2-row-content"><strong>{dateLabel(w.created_at)}</strong><small>{releaseLabel(w.release_at)}에 열려요</small></div><Icon name="chevron" size={16} /></button>)}
    </section>)}
    {(extra.cursor !== 'END' && (extra.cursor || list?.next_cursor)) && <Button secondary disabled={loadMore.busy} onClick={more}>더 보기</Button>}<Feedback error>{loadMore.error}</Feedback>
  </ResourceState></main>{selected && <LockSheet key={selected} worryId={selected} onClose={() => setSelected(null)} onRefresh={() => { setExtra({ available: [], locked: [], cursor: null }); resource.refresh() }} />}</>
}
