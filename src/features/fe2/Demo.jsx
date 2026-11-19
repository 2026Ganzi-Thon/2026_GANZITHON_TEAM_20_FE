import { useState } from 'react'
import { api, mockEnabled, notifyDataChanged, serverNow } from './api.js'
import { Button, Feedback, Header, Icon, ResourceState } from './components.jsx'
import { useMutation, useResource } from './hooks.js'

function LocalDemo() {
  // This request is the server-side permission gate. No regular menu links here.
  const resource = useResource('scenarios'), mutation = useMutation()
  const [session, setSession] = useState(null), [message, setMessage] = useState('')
  const scenarios = resource.data?.scenarios || []
  async function load(scenario) {
    const result = await mutation.run(() => api.createDemo(scenario.scenario_id))
    if (result.ok) { setSession(result.data); setMessage(`${scenario.name || scenario.scenario_id} · 예시 데이터를 불러왔어요`); notifyDataChanged() }
  }
  async function advance() {
    if (!session) return
    const result = await mutation.run(() => api.advanceDemo(session.demo_id, new Date(serverNow() + 86400000).toISOString()))
    if (result.ok) { setSession(result.data); setMessage('시연 기록의 공개 상태를 전환했어요'); notifyDataChanged() }
  }
  async function reset() {
    const result = await mutation.run(() => api.resetDemo(session.demo_id))
    if (result.ok) { setSession(null); setMessage('시연 데이터만 초기화했어요'); notifyDataChanged() }
  }
  return <><Header title="시연 패널" /><main className="fe2-content fe2-demo"><ResourceState resource={resource}>
    <span className="fe2-demo-badge">시연 모드 · 예시 데이터</span>
    <section><h2>타임머신 (DEMO-02)</h2><p className="fe2-muted">시연 기록의 공개 상태만 전환해요. 일반 사용자 기록과 실제 알림에는 영향이 없어요.</p><div className="fe2-demo-state"><Icon name="clock" /><span>{session ? '시연 세션이 준비되었어요' : '기본 시나리오를 먼저 불러와 주세요'}</span></div><Button disabled={!session || mutation.busy} onClick={advance}>공개 상태로 전환</Button></section>
    <section><h2>프리셋 (DEMO-03)</h2><p className="fe2-muted">발표용 예시를 불러와요. 불러온 기록에는 예시 표시가 붙어요.</p>
      {scenarios.map(scenario => <Button key={scenario.scenario_id} secondary disabled={mutation.busy} onClick={() => load(scenario)}>{scenario.name || scenario.scenario_id} 불러오기</Button>)}</section>
    <section><h2>초기화 (DEMO-03)</h2><p className="fe2-muted">시연 데이터만 지워요. 실제 기록은 그대로 남아요.</p><Button secondary disabled={!session || mutation.busy} onClick={reset}>시연 데이터 초기화</Button></section>
    <Feedback error={Boolean(mutation.error)}>{mutation.error || message}</Feedback>
  </ResourceState></main></>
}

function ServerDemo() {
  const [key,setKey]=useState(''), [status,setStatus]=useState(null), [message,setMessage]=useState(''), [unavailable,setUnavailable]=useState(false)
  const mutation=useMutation()
  const headers={'X-Demo-Key':key}
  async function connect() {
    const result=await mutation.run(async()=>{await api.demoSession(headers);return api.demoStatus(headers)})
    if(result.ok && result.data.demo === true){setStatus(result.data);setUnavailable(false);setMessage('시연 권한을 확인했어요')}
    else if(result.error?.response?.status === 404){setStatus(null);setUnavailable(true)}
  }
  async function execute(command,success,preset) {
    const result=await mutation.run(()=>api[command](headers,preset))
    if(result.ok){setStatus(result.data.status || result.data);setMessage(success);notifyDataChanged()}
    else if(result.error?.response?.status === 404){setStatus(null);setUnavailable(true)}
  }
  return <><Header title="시연 패널"/><main className="fe2-content fe2-demo">
    {status?.demo === true && <span className="fe2-demo-badge">시연 모드 · 예시 데이터</span>}
    {!status ? <section><h2>시연 권한 확인</h2><p className="fe2-muted">시연 전용 브라우저에서 이용해 주세요. 키는 현재 화면의 메모리에만 보관해요.</p>
      <label className="fe2-field-label" htmlFor="demo-key">시연 키</label><input id="demo-key" className="fe2-demo-key" type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} />
      <Button disabled={!key.trim() || mutation.busy} onClick={connect}>시연 시작</Button></section> : <>
    <section><h2>타임머신</h2><p className="fe2-muted">시연 기록의 공개 상태만 전환해요. 실제 사용자 기록은 바꾸지 않아요.</p>
      <div className="fe2-demo-state"><Icon name="clock"/><span>잠긴 기록 {status.lockedCount}개 · 공개 기록 {status.publicCount}개 · 실패 요청 {status.failedRequestCount}개</span></div>
      {status.nextPublishAt && <p className="fe2-small fe2-muted">다음 공개 {new Date(status.nextPublishAt).toLocaleString()}</p>}
      <Button disabled={mutation.busy || !status.lockedCount} onClick={()=>execute('demoAdvance','시연 기록을 공개했어요')}>공개 상태로 전환</Button>
      <Button secondary disabled={mutation.busy} onClick={()=>execute('demoAdvance','시연 시간을 24시간 이동했어요','PLUS_24H')}>24시간 후로 이동</Button></section>
    <section><h2>프리셋</h2><p className="fe2-muted">발표용 걱정 기록과 분석 실패 예시를 시연 금고에 불러와요.</p>
      <Button secondary disabled={mutation.busy} onClick={()=>execute('demoPresets','시연 예시를 불러왔어요')}>기본 시나리오 불러오기</Button></section>
    <section><h2>초기화</h2><p className="fe2-muted">시연 금고의 데이터만 지워요. 실제 기록은 그대로 남아요.</p>
      <Button secondary disabled={mutation.busy} onClick={()=>execute('demoReset','시연 데이터를 초기화했어요')}>시연 데이터 초기화</Button></section></>}
    <Feedback error={!unavailable && Boolean(mutation.error)}>{unavailable ? '시연 패널 없음' : mutation.error || message}</Feedback>
  </main></>
}
export default function Demo(){return mockEnabled ? <LocalDemo/> : <ServerDemo/>}
