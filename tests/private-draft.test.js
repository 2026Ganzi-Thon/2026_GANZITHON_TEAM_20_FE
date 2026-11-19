import test from 'node:test'
import assert from 'node:assert/strict'
import { privateState, readDraft, clearDrafts } from '../src/session/privateDraft.js'
import { remainingSeconds } from '../src/features/fe2/domain.js'
test('브라우저 히스토리는 불투명 ID만 받고 입력은 메모리에서 복원하며 삭제 후 복원되지 않는다',()=>{
 const input={worry:'합성 원문',anxietyLevel:4,tomorrowCheck:'합성 메모',retryRequestId:'request'}
 const state=privateState(input)
 assert.equal(JSON.stringify(state).includes('합성'),false)
 assert.equal(Object.hasOwn(state,'anxietyLevel'),false)
 assert.deepEqual(readDraft(state),input)
 clearDrafts()
 assert.equal(readDraft(state).worry,undefined)
})
test('휴식 카운트는 서버 샘플의 남은 초에서 진행하고 기기의 endsAt 계산에 의존하지 않는다',()=>{
 const now=Date.parse('2026-11-19T00:00:00Z')
 const activity={status:'IN_PROGRESS',server_time:new Date(now).toISOString(),remaining_seconds:12,ends_at:new Date(now+999999).toISOString()}
 assert.equal(remainingSeconds(activity,now+5000),7)
 assert.equal(remainingSeconds(activity,now+20000),0)
 assert.equal(remainingSeconds({...activity,status:'PAUSED'},now+5000),12)
})

test('서버 남은 시간이 0이면 화면 시계가 샘플보다 느려도 1초로 되돌아가지 않는다',()=>{
 const sampled=Date.parse('2026-11-19T00:00:00Z')
 assert.equal(remainingSeconds({status:'IN_PROGRESS',server_time:new Date(sampled).toISOString(),remaining_seconds:0},sampled-800),0)
})
