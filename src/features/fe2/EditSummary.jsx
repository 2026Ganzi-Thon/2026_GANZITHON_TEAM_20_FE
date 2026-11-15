import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, notifyDataChanged } from './api.js'
import { countCharacters, isValidSummary } from './domain.js'
import { Actions, Button, Header, Icon, ResourceState } from './components.jsx'
import { useMutation, useResource } from './hooks.js'

function Editor({ worry }) {
  const navigate = useNavigate(), mutation = useMutation()
  const [value, setValue] = useState(worry.ai_content.display_summary), [attempted, setAttempted] = useState(false)
  const valid = isValidSummary(value)
  async function save() {
    setAttempted(true)
    if (!valid) return
    const result = await mutation.run(() => api.summary(worry.id, value))
    if (result.ok) { notifyDataChanged(); navigate(`/worries/${worry.id}`, { replace: true, state: { toast: '저장했어요 · 도움 추천은 그대로예요', summaryEdited: true } }) }
  }
  return <><main className="fe2-content fe2-editor"><div className="fe2-readonly-label"><Icon name="lock" size={14} />그날의 걱정 · 수정되지 않아요</div><div className="fe2-readonly">{worry.worry_text}</div>
    <label className="fe2-field-label" htmlFor="summary-field">AI 정리</label><textarea id="summary-field" placeholder="입력 내용" value={value} onChange={event => { const next = event.target.value; if (countCharacters(next) <= 500) setValue(next); mutation.clearError() }}
      className={attempted && !valid ? 'invalid' : ''} aria-invalid={attempted && !valid} aria-describedby="summary-count summary-error" />
    <p className="fe2-counter" id="summary-count">{countCharacters(value)}/500</p>
    <div id="summary-error">{attempted && !valid ? <div className="fe2-editor-min-error" role="alert"><Icon name="alert" size={14}/><p>공백 제외 1자 이상 써야 저장할 수 있어요</p></div> : mutation.error ? <div className="fe2-editor-save-error" role="alert"><Icon name="alert" size={16}/><p>저장하지 못했어요 · 잠시 뒤 다시 시도해 주세요</p></div> : null}</div>
  </main><Actions className="fe2-editor-actions"><Button className={attempted && !valid ? 'fe2-invalid-save' : ''} disabled={mutation.busy} onClick={save}>저장</Button><Button secondary disabled={mutation.busy} onClick={() => navigate(`/worries/${worry.id}`)}>취소</Button></Actions></>
}
export default function EditSummary() {
  const { worryId } = useParams(), resource = useResource('detail', [worryId])
  return <><Header title="정리 내용 수정" back={`/worries/${worryId}`} /><ResourceState resource={resource}>{resource.data && <Editor key={worryId} worry={resource.data} />}</ResourceState></>
}
