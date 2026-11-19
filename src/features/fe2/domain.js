export const HELP = {
  ACTION: { title: '10분 액션', description: '지금 할 수 있는 작은 행동 3단계', slug: 'action' },
  REST: { title: '짧은 휴식', description: '3분 타이머와 간단한 휴식 안내', slug: 'rest' },
  EMPATHY: { title: '그냥 들어줘', description: '이 걱정에 대한 짧은 공감 메시지', slug: 'empathy' },
  SHRED: { title: '걱정 파쇄', description: '삭제 범위를 확인하고 완전히 지우기', slug: 'shred' },
}
export const OUTCOMES = { BETTER: '괜찮아짐', ONGOING: '진행 중', HAPPENED: '걱정대로 됨' }
export const RATINGS = { HELPFUL: '도움 됨', UNSURE: '잘 모르겠음', NOT_HELPFUL: '도움 안 됨' }
export const countCharacters = value => Array.from(value).length
export const isValidSummary = value => value.trim().length > 0 && countCharacters(value) <= 500
export const isNight = date => date.getHours() >= 22 || date.getHours() < 6
export function remainingSeconds(activity, serverNow) {
  if (!activity) return 180
  if (activity.status === 'PAUSED') return Math.max(0, activity.remaining_seconds ?? 0)
  if (activity.status === 'READY_TO_COMPLETE' || activity.status === 'COMPLETED') return 0
  if (activity.server_time && activity.remaining_seconds != null) return Math.min(180, Math.max(0, Math.ceil(activity.remaining_seconds - Math.max(0, (serverNow - Date.parse(activity.server_time)) / 1000))))
  if (activity.ends_at) return Math.min(180, Math.max(0, Math.ceil((Date.parse(activity.ends_at) - serverNow) / 1000)))
  return Math.max(0, activity.remaining_seconds ?? 180)
}
export function canComplete(activity, now) {
  if (!activity || activity.status === 'COMPLETED' || activity.status === 'STOPPED') return false
  if (activity.type === 'ACTION') return activity.steps?.length === 3 && activity.steps.every(s => s.checked)
  if (activity.type === 'REST') return remainingSeconds(activity, now) === 0
  return activity.type === 'EMPATHY'
}
export function dateLabel(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)).replace(/, /g, ' ')
}
export function releaseLabel(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value))
}
export function toLocalInput(value) {
  const date = new Date(value)
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
export function safeError(error) {
  const code = error?.response?.data?.error?.code ?? error?.code
  const messages = {
    GUEST_SESSION_REQUIRED: '금고를 먼저 만들어 주세요.',
    CSRF_REJECTED: '인증 상태가 변경됐어요. 내용을 확인하고 다시 시도해 주세요.',
    OPEN_ACTIVITY_EXISTS: '다른 활동이 진행 중이에요. 걱정 상세에서 다시 선택해 주세요.',
    ALREADY_PUBLIC: '이미 공개된 걱정이에요. 금고에서 다시 확인해 주세요.',
    INVALID_PUBLICATION: '지금 이후이고 보관 기간 안의 공개 시각을 선택해 주세요.',
    ACTION_STEPS_INCOMPLETE: '세 단계를 모두 체크한 뒤 완료해 주세요.',
    REST_NOT_FINISHED: '아직 휴식 시간이 남아 있어요.',
    REST_TIME_OVER: '휴식 시간이 끝났어요. 완료 버튼을 눌러 주세요.',
    INVALID_ACTIVITY_STATE: '활동 상태가 변경됐어요. 다시 열어 확인해 주세요.',
    REFLECTION_UNAVAILABLE: '회고 대상이 변경됐어요. 다시 열어 확인해 주세요.',
    INVALID_INPUT: '입력 내용을 다시 확인해 주세요.',
    GUEST_SESSION_INVALID: '이 브라우저의 인증 정보가 만료되었거나 지워졌어요.',
    CSRF_INVALID: '인증 상태를 확인하지 못했어요. 새로고침 후 다시 시도해 주세요.',
    DEMO_FORBIDDEN: '시연 패널에 접근할 권한이 없어요.',
    NOT_FOUND: '이 기록을 확인할 수 없어요. 삭제되었거나 보관 기간이 지났을 수 있어요.',
    WORRY_LOCKED: '아직 잠겨 있는 걱정이에요. 금고에서 공개 시각을 확인해 주세요.',
    ALREADY_AVAILABLE: '이미 공개된 걱정이에요. 공개 시각을 다시 변경할 수 없어요.',
    RELEASE_TIME_PASSED: '지금 이후의 공개 시각을 다시 선택해 주세요.',
    ACTIVITY_NOT_READY: '아직 완료 조건을 충족하지 않았어요. 상태를 다시 확인해 주세요.',
    RATE_LIMITED: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
    DELETION_PENDING: '삭제 결과를 아직 확인하지 못했어요. 완료 여부를 다시 확인해 주세요.',
  }
  return messages[code] ?? '처리하지 못했어요 · 잠시 뒤 다시 시도해 주세요'
}
