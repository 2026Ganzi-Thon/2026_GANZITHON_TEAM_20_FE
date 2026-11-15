import {calendarDays,dayValue,canSelectDay} from '../src/features/fe2/calendar.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createSpringApi,normalizeWorry} from '../src/features/fe2/springContract.js'
const worry={worryId:'w1',visibility:'PUBLIC',createdAt:'2026-11-14T10:00:00Z',publishAt:'2026-11-15T00:00:00Z',summary:'사용자 정리',text:'걱정 원문',memo:'메모',anxietyBefore:4,anxietyAfter:null,firstViewedAt:null,analysis:{summary:'AI 원본',recommendation:{type:'ACTION',reason:'추천 이유'},actionSteps:['첫째','둘째','셋째'],restGuide:'휴식 안내',empathyMessage:'공감 문구'}}
const action={activityId:'a1',worryId:'w1',helpType:'ACTION',state:'IN_PROGRESS',serverTime:'2026-11-15T10:00:00Z',action:{steps:[{stepNo:1,done:true},{stepNo:2,done:false},{stepNo:3,done:false}]},rest:null,feedback:null}
function setup(handler,options){const calls=[];const api=createSpringApi(async(method,url,data,options)=>{calls.push({method,url,data,options});const value=await handler({method,url,data,options});return value?.httpStatus?{status:value.httpStatus,data:value.body}:{status:200,data:value}},options);return {api,calls}}
test('실제 잠금 DTO는 민감 필드를 전달받아도 화면 모델에 포함하지 않는다',()=>{
  const locked=normalizeWorry({...worry,visibility:'LOCKED'})
  assert.equal(locked.worry_text,undefined);assert.equal(locked.ai_content,undefined);assert.equal(locked.display_summary,undefined)
  assert.equal(locked.status,'LOCKED');assert.equal(locked.release_at,worry.publishAt)
})
test('금고 공개/잠금은 별도 커서를 사용하고 끝난 목록을 다시 요청하지 않는다',async()=>{
 const {api,calls}=setup(({url})=>url.includes('PUBLIC')?{items:[worry],nextCursor:'public-next'}:{items:[{...worry,worryId:'locked',visibility:'LOCKED'}],nextCursor:null})
 const first=await api.vault(null);assert.equal(first.available.length,1);assert.equal(first.locked.length,1)
 const second=await api.vault(first.next_cursor);assert.equal(second.locked.length,0)
 assert.equal(calls.length,3);assert.ok(calls[2].url.includes('cursor=public-next'))
})
test('상세 조회는 최초 열람 쓰기를 하지 않으며 잠김을 거절한다',async()=>{
 let locked=false;const {api,calls}=setup(()=>({...worry,visibility:locked?'LOCKED':'PUBLIC'}))
 const value=await api.detail('w1');assert.equal(value.ai_content.display_summary,'사용자 정리');assert.equal(value.summary_edited,true)
 assert.equal(calls.length,1);assert.equal(calls[0].method,'get');locked=true
 await assert.rejects(()=>api.detail('w1'),e=>e.code==='WORRY_LOCKED')
})
test('요약/불안도/공개 시각은 실제 컨트롤러의 method와 camelCase body를 쓴다',async()=>{
 const {api,calls}=setup(()=>({httpStatus:204}))
 await api.summary('w1','새 정리');await api.distress('w1',2);await api.release('w1','2026-11-16T00:00:00Z');await api.markViewed('w1')
 assert.deepEqual(calls.map(c=>[c.method,c.url,c.data]),[['put','/worries/w1/summary',{summary:'새 정리'}],['put','/worries/w1/anxiety',{anxietyAfter:2}],['patch','/worries/w1/publication',{publishAt:'2026-11-16T00:00:00Z'}],['post','/worries/w1/view',undefined]])
})
test('활동 시작은 새 DTO를 강제하고 실제 AI 단계 문구로 보충한다',async()=>{
 const {api,calls}=setup(({url,method})=>url==='/worries/w1/activities'&&method==='get'?[]:url==='/worries/w1'?worry:action)
 const result=await api.entryActivity('w1','ACTION')
 const post=calls.find(c=>c.method==='post');assert.deepEqual(post.data,{helpType:'ACTION',replaceOpen:false});assert.ok(post.options.intent)
 assert.equal(result.steps[0].title,'첫째');assert.equal(result.steps[0].checked,true)
})
test('액션 나중에 이어하기는 REST pause가 아니라 stop이며 완료 응답의 다음 걱정 값을 보존한다',async()=>{
 const {api,calls}=setup(({url,method})=>url==='/worries/w1'?worry:method==='post'?{...action,state:url.endsWith('/complete')?'COMPLETED':'STOPPED',nextUnviewedExists:true}:action)
 await api.activityCommand('a1','pause');assert.ok(calls.some(c=>c.method==='post'&&c.url==='/activities/a1/stop'));assert.ok(!calls.some(c=>c.url.endsWith('/pause')))
 const done=await api.activityCommand('a1','complete');assert.equal(done.next_unviewed_exists,true);assert.equal(done.status,'COMPLETED')
})
test('도움 변경은 확인 전 쓰기 없음, REST 선택으로 타이머를 만들지 않음, 확인 ID 불일치 거절',async()=>{
 const stopped=[];const {api,calls}=setup(({method})=>method==='get'?[{activityId:'a1',worryId:'w1',helpType:'ACTION',state:'IN_PROGRESS'}]:action,{onStopped:a=>stopped.push(a)})
 await assert.rejects(()=>api.selectHelp('w1','REST'),e=>e.response.data.error.details.active_activity_id==='a1')
 assert.equal(calls.filter(c=>c.method==='post').length,0)
 await assert.rejects(()=>api.selectHelp('w1','REST','stale'),e=>e.response.status===409)
 await api.selectHelp('w1','REST','a1');assert.deepEqual(calls.filter(c=>c.method==='post').map(c=>c.url),['/activities/a1/stop']);assert.equal(stopped[0].type,'ACTION')
})
test('휴식 복귀는 서버 기록으로 찾아 sessionStorage에 의존하지 않는다',async()=>{
 const {api}=setup(({url})=>url==='/worries/w1/activities'?[{activityId:'r1',worryId:'w1',helpType:'REST',state:'PAUSED'}]:{activityId:'r1',worryId:'w1',helpType:'REST',state:'PAUSED',rest:{durationSeconds:180,remainingSeconds:90,endsAt:null}})
 const current=await api.currentActivity('w1','REST');assert.equal(current.remaining_seconds,90);assert.equal(current.status,'PAUSED')
})
test('회고는 currentWorryId/timeZone과 AS_FEARED 계약을 사용한다',async()=>{
 const {api,calls}=setup(()=>null);await api.reflect('past','HAPPENED','w1');await api.skipReflection()
 assert.ok(calls[0].url.includes('currentWorryId=w1'));assert.ok(calls[0].url.includes('timeZone='));assert.deepEqual(calls[0].data,{answer:'AS_FEARED'});assert.equal(calls[1].data,undefined)
})
test('기록 상세의 최신 활동/평가는 서버 DESC 목록을 ASC로 바꾼 뒤 마지막 값으로 연결한다',async()=>{
 const {api}=setup(({url})=>url==='/records/w1'?worry:url.startsWith('/reflections/')?{answer:'AS_FEARED'}:[{activityId:'new',worryId:'w1',helpType:'REST',state:'COMPLETED',feedback:'HELPFUL'},{activityId:'old',worryId:'w1',helpType:'ACTION',state:'STOPPED',feedback:null}])
 const record=await api.record('w1');assert.equal(record.activities.at(-1).activity_id,'new');assert.equal(record.ratings[0].helpfulness,'HELPFUL');assert.equal(record.reflection.outcome,'HAPPENED')
})
test('삭제202/204 상태를 그대로 보존하고 없는 job API를 호출하거나 완료를 꾸미지 않는다',async()=>{
 const {api,calls}=setup(()=>({httpStatus:202,body:{status:'DELETING'}}));const deletion=await api.deleteWorry('w1');assert.equal(deletion.status,202);assert.equal(deletion.data.deletion_job_id,undefined)
 await assert.rejects(()=>api.deletionJob('unknown'),e=>e.code==='DELETION_PENDING');assert.equal(calls.length,1)
})
test('단계/평가/시연은 실제 경로를 사용하며 시연 키를 요청 헤더로만 보낸다',async()=>{
 const {api,calls}=setup(()=>null);await api.step('a1',2,true);await api.rate('a1','HELPFUL');await api.demoAdvance({'X-Demo-Key':'temporary'})
 assert.deepEqual(calls[0].data,{done:true});assert.equal(calls[0].method,'put');assert.equal(calls[1].url,'/activities/a1/feedback');assert.deepEqual(calls[1].data,{answer:'HELPFUL'});assert.equal(calls[2].url,'/demo/time-machine');assert.deepEqual(calls[2].data,{preset:'TO_PUBLISH'});assert.equal(calls[2].options.headers['X-Demo-Key'],'temporary')
})

test('달력은 실제 요일·윤년·허용 날짜 범위를 계산한다',()=>{
 const leap=calendarDays(2028,1);assert.equal(leap.filter(Boolean).length,29);assert.equal(leap[new Date(2028,1,1).getDay()],1)
 const april=calendarDays(2026,3);assert.equal(april[3],1);assert.equal(april.filter(Boolean).at(-1),30)
 assert.equal(dayValue(2026,10,5),'2026-11-05');assert.equal(canSelectDay('2026-11-04','2026-11-05','2026-12-04'),false);assert.equal(canSelectDay('2026-11-05','2026-11-05','2026-12-04'),true)
})
