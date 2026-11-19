import { canComplete, isValidSummary, remainingSeconds } from './domain.js'

// Synthetic fixtures only; this is not authentication, encryption, or a backend.
export class MockFault extends Error {
  constructor(code, status = 409, details = {}) { super(code); this.code = code; this.status = status; this.details = details }
}
const clone = value => structuredClone(value)
const day = 86400000
export function createMockEngine(clock = Date.now) {
  let sequence = 0
  let skippedOn = ''
  let demoSession = null
  let forcedError = false
  const jobs = new Map()
  const idempotency = new Map()
  let worries = []
  let activities = []
  function seed() {
    const now = clock()
    const summary = '발표 준비가 밀렸다는 점이 걱정의 중심이었어요. 남은 분량을 먼저 확인해보면 무엇부터 할지 정하기 쉬워질 수 있어요.'
    worries = [
      { id: 'example-presentation', ago: 2, summary: '발표 준비가 밀렸다는 걱정', text: '내일 발표 자료가 아직 반도 안 끝났는데 시간 안에 될지 모르겠다', before: 4, after: null },
      { id: 'example-conversation', ago: 3, summary: '말실수했을까 봐 신경 쓰인다는 걱정', text: '팀원에게 말을 잘못한 것 같아서 계속 신경이 쓰인다', before: 3, after: null },
      { id: 'example-locked', ago: .1, summary: '공개 전 예시', text: '이 문장은 잠김 DTO에 포함되면 안 됩니다.', before: 4, locked: true },
      { id: 'example-history', ago: 5, summary: '발표 준비가 밀렸다는 걱정', text: '발표 준비가 반도 안 끝났는데 시간 안에 될지 모르겠다', before: 4, after: 2, viewed: true, reviewed: null, rated: true },
    ].map(w => ({
      id: w.id, created_at: new Date(now - w.ago * day).toISOString(), release_at: new Date(w.locked ? now + 3600000 : now - (w.ago - .3) * day).toISOString(),
      status: w.locked ? 'LOCKED' : 'AVAILABLE', first_viewed_at: w.viewed ? new Date(now - 3 * day).toISOString() : null,
      worry_text: w.text, tomorrow_note: w.id.includes('presentation') || w.rated ? '발표 자료 분량 확인하기' : null,
      distress_before: w.before, distress_after: w.after ?? null, card_summary: w.summary, summary_edited: false,
      ai_content: { display_summary: summary, recommended_help: 'ACTION', recommendation_reason: '지금 할 수 있는 작은 행동을 골라보세요.',
        action_steps: ['발표 자료 파일 열기', '내일 발표할 분량이 어디까지인지 적어보기', '첫 장에 쓸 문장 한 줄 적기'].map((title, i) => ({ title, step_number: i + 1, checked: false })),
        rest_guidance: '눈을 감거나 창밖을 보면서\n숨을 천천히 쉬어보세요',
        empathy_message: '자료가 반도 안 끝난 채로 누우려니\n마음이 무거웠겠어요.\n\n지금 당장 전부 끝내야 하는 건 아니에요.\n\n오늘 걱정을 적어둔 것만으로도\n할 수 있는 일을 하나 한 거예요.' },
      allowed_help: ['SHRED', 'ACTION', 'REST', 'EMPATHY'], reflection: w.reviewed,
    }))
    activities = [{ activity_id: 'example-completed', worry_id: 'example-history', type: 'ACTION', status: 'COMPLETED', steps: worries[3].ai_content.action_steps.map(s => ({ ...s, checked: true })), helpfulness: 'HELPFUL', can_complete: false }]
    skippedOn = ''; forcedError = false; jobs.clear(); idempotency.clear()
  }
  seed()
  function alive(w) { return w && !['DELETING', 'DELETED'].includes(w.status) && clock() < Date.parse(w.created_at) + 30 * day }
  function refresh(w) {
    if (w.status === 'LOCKED' && clock() >= Date.parse(w.release_at)) w.status = 'AVAILABLE'
    return w
  }
  function worry(id, mustOpen = false) {
    const w = worries.find(v => v.id === id)
    if (!alive(w)) throw new MockFault('NOT_FOUND', 404)
    refresh(w)
    if (mustOpen && w.status === 'LOCKED') throw new MockFault('WORRY_LOCKED')
    return w
  }
  function activity(id) {
    const a = activities.find(v => v.activity_id === id)
    if (!a) throw new MockFault('NOT_FOUND', 404)
    worry(a.worry_id, true)
    if (a.type === 'REST' && a.status === 'IN_PROGRESS' && remainingSeconds(a, clock()) === 0) a.status = 'READY_TO_COMPLETE'
    a.remaining_seconds = remainingSeconds(a, clock()); a.can_complete = canComplete(a, clock())
    return a
  }
  const active = () => activities.find(a => ['IN_PROGRESS', 'PAUSED', 'READY_TO_COMPLETE'].includes(a.status))
  const card = w => ({ id: w.id, created_at: w.created_at, release_at: w.release_at, status: w.status,
    ...(w.status === 'AVAILABLE' ? { display_summary: w.summary_edited ? w.ai_content.display_summary : w.card_summary, distress_before: w.distress_before, distress_after: w.distress_after,
      is_unviewed: !w.first_viewed_at, latest_help_type: activities.filter(a => a.worry_id === w.id).at(-1)?.type ?? null } : {}) })
  function dispatch(method, input, body = {}, key) {
    const url = new URL(input, 'https://mock.invalid')
    const parts = url.pathname.split('/').filter(Boolean)
    const resource = parts[0], target = decodeURIComponent(parts[1] ?? ''), op = parts[2]
    if (forcedError && method === 'get' && resource !== 'demo' && resource !== 'session') throw new MockFault('SIMULATED_NETWORK_ERROR', 503)
    if (method === 'get' && resource === 'session') return { authenticated: true, csrf_token: 'synthetic-csrf', roles: ['DEMO_OPERATOR'], mode: 'DEMO_PRESET' }
    if (resource === 'vault') return { locked: worries.filter(alive).map(refresh).filter(w => w.status === 'LOCKED').map(card), available: worries.filter(alive).map(refresh).filter(w => w.status === 'AVAILABLE').map(card), next_cursor: null }
    if (resource === 'worries') {
      const w = worry(target, !['lock', 'release'].includes(op) && method !== 'delete')
      if (method === 'get' && op === 'lock') return { id: w.id, created_at: w.created_at, release_at: w.release_at, status: w.status, can_change_release: w.status === 'LOCKED', can_delete: true }
      if (method === 'patch' && op === 'release') {
        if (w.status !== 'LOCKED') throw new MockFault('ALREADY_AVAILABLE')
        const time = Date.parse(body.release_at)
        if (!Number.isFinite(time) || time <= clock() || time >= Date.parse(w.created_at) + 30 * day) throw new MockFault('RELEASE_TIME_PASSED')
        w.release_at = body.release_at; return { id: w.id, release_at: w.release_at }
      }
      if (method === 'delete') {
        w.status = 'DELETING'
        const deletion_job_id = `deletion-${++sequence}`
        jobs.set(deletion_job_id, { worry_id: w.id, ready_at: clock() + 700 })
        return { deletion_job_id, status: 'PENDING' }
      }
      if (method === 'get' && !op) { w.first_viewed_at ??= new Date(clock()).toISOString(); return clone(w) }
      if (op === 'summary') {
        if (!isValidSummary(body.display_summary)) throw new MockFault('VALIDATION_FAILED', 422)
        w.ai_content.display_summary = body.display_summary; w.summary_edited = true
        return { worry_id: w.id, display_summary: body.display_summary, summary_edited: true }
      }
      if (op === 'post-distress') {
        if (body.distress_after !== null && ![1, 2, 3, 4, 5].includes(body.distress_after)) throw new MockFault('VALIDATION_FAILED', 422)
        w.distress_after = body.distress_after; return { worry_id: w.id, distress_before: w.distress_before, distress_after: w.distress_after }
      }
      if (op === 'similar-experience') {
        const found = worries.filter(alive).find(v => v.id !== w.id && v.status === 'AVAILABLE' && activities.some(a => a.worry_id === v.id && a.helpfulness === 'HELPFUL'))
        return found ? { record_id: found.id, display_summary: card(found).display_summary, previous_help_type: 'ACTION', helpfulness: 'HELPFUL', created_at: found.created_at } : null
      }
      if (op === 'help-selections') {
        if (!w.allowed_help.includes(body.help_type)) throw new MockFault('VALIDATION_FAILED', 422)
        const current = active()
        if (current && (current.worry_id !== w.id || current.type !== body.help_type)) {
          if (!body.confirm_switch || body.expected_active_activity_id !== current.activity_id) throw new MockFault('ACTIVITY_SWITCH_CONFIRM_REQUIRED', 409, { active_activity_id: current.activity_id, type: current.type, status: current.status })
          if (current.type === 'REST') current.remaining_seconds = 0
          current.status = 'STOPPED'; current.reason = 'HELP_SWITCH'
        }
        return { worry_id: w.id, help_type: body.help_type, requires_delete_confirmation: body.help_type === 'SHRED' }
      }
      if (op === 'empathy') return { worry_id: w.id, empathy_message: w.ai_content.empathy_message }
      if (op === 'activities') {
        if (!['ACTION', 'REST', 'EMPATHY'].includes(body.type)) throw new MockFault('VALIDATION_FAILED', 422)
        if (key && idempotency.has(key)) return clone(activity(idempotency.get(key)))
        const current = active()
        if (current) {
          if (current.worry_id === w.id && current.type === body.type) return clone(activity(current.activity_id))
          throw new MockFault('ACTIVITY_SWITCH_CONFIRM_REQUIRED', 409, { active_activity_id: current.activity_id, type: current.type, status: current.status })
        }
        const stopped = body.type === 'ACTION' && activities.find(a => a.worry_id === w.id && a.type === 'ACTION' && a.status === 'STOPPED')
        const a = stopped || { activity_id: `activity-${++sequence}`, worry_id: w.id, type: body.type,
          steps: body.type === 'ACTION' ? clone(w.ai_content.action_steps) : undefined,
          duration_seconds: body.type === 'REST' ? 180 : undefined,
          remaining_seconds: body.type === 'REST' ? 180 : undefined,
          ends_at: body.type === 'REST' ? new Date(clock() + 180000).toISOString() : undefined }
        a.status = 'IN_PROGRESS'
        if (!stopped) activities.push(a)
        if (key) idempotency.set(key, a.activity_id)
        return clone(activity(a.activity_id))
      }
    }
    if (resource === 'activities') {
      const a = activity(target)
      if (!op && method === 'get') return clone(a)
      if (op === 'rating') {
        if (a.status !== 'COMPLETED' || !['HELPFUL', 'UNSURE', 'NOT_HELPFUL'].includes(body.helpfulness)) throw new MockFault('ACTIVITY_NOT_READY')
        a.helpfulness = body.helpfulness; return { activity_id: a.activity_id, helpfulness: a.helpfulness }
      }
      if (a.status === 'COMPLETED') {
        if (op === 'complete') return clone(a)
        throw new MockFault('ACTIVITY_NOT_READY')
      }
      if (op === 'steps') {
        const step = a.steps?.find(s => s.step_number === Number(parts[3]))
        if (!step) throw new MockFault('NOT_FOUND', 404)
        step.checked = Boolean(body.completed)
      }
      if (op === 'pause') { if (a.type === 'REST') a.remaining_seconds = remainingSeconds(a, clock()); a.status = a.type === 'REST' ? 'PAUSED' : 'STOPPED' }
      if (op === 'resume') { a.status = 'IN_PROGRESS'; if (a.type === 'REST') a.ends_at = new Date(clock() + a.remaining_seconds * 1000).toISOString() }
      if (op === 'stop') { a.status = 'STOPPED'; a.reason = body.reason; if (a.type === 'REST') a.remaining_seconds = 0 }
      if (op === 'complete') { if (!canComplete(a, clock())) throw new MockFault('ACTIVITY_NOT_READY'); a.status = 'COMPLETED' }
      return clone(activity(a.activity_id))
    }
    if (resource === 'records') {
      if (!target) return { items: worries.filter(alive).map(refresh).filter(w => w.status === 'AVAILABLE').map(card), next_cursor: null }
      const w = worry(target, true); w.first_viewed_at ??= new Date(clock()).toISOString()
      return { worry: clone(w), activities: clone(activities.filter(a => a.worry_id === w.id)), reflection: w.reflection,
        ratings: activities.filter(a => a.worry_id === w.id && a.helpfulness).map(a => ({ activity_id: a.activity_id, helpfulness: a.helpfulness })) }
    }
    if (resource === 'reflections') {
      if (target === 'candidate') {
        const current = url.searchParams.get('current_worry_id')
        const found = skippedOn === new Date(clock()).toDateString() ? null : worries.filter(alive).filter(w => w.id !== current && refresh(w).status === 'AVAILABLE' && w.first_viewed_at && !w.reflection && clock() - Date.parse(w.release_at) >= day).sort((a, b) => Date.parse(a.release_at) - Date.parse(b.release_at))[0]
        return found ? { worry_id: found.id, created_at: found.created_at, first_available_at: found.release_at, display_summary: card(found).display_summary } : null
      }
      if (target === 'skip-today') { skippedOn = new Date(clock()).toDateString(); return { skipped: true } }
      const w = worry(target, true)
      if (!['BETTER', 'ONGOING', 'HAPPENED'].includes(body.outcome)) throw new MockFault('VALIDATION_FAILED', 422)
      w.reflection = { outcome: body.outcome }; return { worry_id: w.id, outcome: body.outcome }
    }
    if (resource === 'deletion-jobs') {
      const job = jobs.get(target)
      if (!job) throw new MockFault('NOT_FOUND', 404)
      if (clock() < job.ready_at) return { deletion_job_id: target, status: 'RUNNING' }
      activities = activities.filter(a => a.worry_id !== job.worry_id)
      worries = worries.filter(w => w.id !== job.worry_id)
      return { deletion_job_id: target, status: 'COMPLETED' }
    }
    if (resource === 'demo') {
      if (target === 'scenarios') return { scenarios: [{ scenario_id: 'basic', name: '기본 시나리오' }, { scenario_id: 'network-error', name: '네트워크 장애 응답' }] }
      if (method === 'post' && !parts[2]) {
        if (!['basic', 'network-error'].includes(body.scenario_id)) throw new MockFault('VALIDATION_FAILED', 422)
        seed(); forcedError = body.scenario_id === 'network-error'
        demoSession = { demo_id: 'synthetic-demo', simulated_now: new Date(clock()).toISOString(), mode: 'DEMO_PRESET' }; return clone(demoSession)
      }
      if (!demoSession || parts[2] !== demoSession.demo_id) throw new MockFault('NOT_FOUND', 404)
      if (method === 'delete') { worries = []; activities = []; demoSession = null; forcedError = false; jobs.clear(); return null }
      if (parts[3] === 'advance') {
        // Synthetic demo entries only. Do not change the application/server clock.
        for (const w of worries) if (w.status === 'LOCKED') w.release_at = new Date(clock() - 1).toISOString()
        demoSession.simulated_now = body.simulated_now; return clone(demoSession)
      }
    }
    throw new MockFault('NOT_FOUND', 404)
  }
  return { dispatch, reset: seed }
}
