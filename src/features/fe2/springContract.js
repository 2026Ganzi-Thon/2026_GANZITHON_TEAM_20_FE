// Contract: TEAM_20_BE develop 213b5a7 (2026-11-15). Keep wire DTOs out of views.
const enc = encodeURIComponent
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone
export const normalizeWorry = w => {
  const base = { id: w.worryId, status: w.visibility === 'PUBLIC' ? 'AVAILABLE' : 'LOCKED', created_at: w.createdAt, release_at: w.publishAt }
  if (w.visibility !== 'PUBLIC') return { ...base, can_change_release: true, can_delete: true }
  const analysis = w.analysis
  return { ...base, display_summary: w.summary, distress_before: w.anxietyBefore, distress_after: w.anxietyAfter ?? null,
    is_unviewed: !w.firstViewedAt, worry_text: w.text, tomorrow_note: w.memo,
    summary_edited: Boolean(w.summaryEdited),
    allowed_help: ['ACTION','REST','EMPATHY','SHRED'],
    ai_content: analysis ? { display_summary: w.summary, recommended_help: analysis.recommendation.type,
      action_steps: analysis.actionSteps, rest_guidance: analysis.restGuide, empathy_message: analysis.empathyMessage } : undefined }
}
export function normalizeActivity(a, worry) {
  return { activity_id: a.activityId, worry_id: a.worryId, type: a.helpType, status: a.state,
    ends_at: a.rest?.endsAt, remaining_seconds: a.rest?.remainingSeconds, duration_seconds: a.rest?.durationSeconds, server_time:a.serverTime, time_over:a.rest?.timeOver,
    helpfulness: a.feedback?.answer, next_unviewed_exists: a.nextUnviewedExists,
    steps: a.action?.steps.map(s => ({ step_number: s.stepNo, checked: s.done, title: worry?.ai_content?.action_steps?.[s.stepNo-1] })),
    started_at: a.startedAt, ended_at: a.endedAt }
}
function conflict(activeId) {
  return { response: { status: 409, data: { error: { code: 'ACTIVITY_SWITCH_CONFIRM_REQUIRED', details: { active_activity_id: activeId } } } } }
}
export function createSpringApi(request, { onStopped = () => {} } = {}) {
  const get = (url, options) => request('get',url,undefined,options).then(r=>r.data)
  const send = (method,url,body,options) => request(method,url,body,options).then(r=>r.data)
  const rawDetail = (id, options) => get('/worries/'+enc(id), options)
  async function detail(id, options) {
    const raw = await rawDetail(id, options)
    if (raw.visibility !== 'PUBLIC') throw { code: 'WORRY_LOCKED' }
    return normalizeWorry(raw)
  }
  async function activity(id, options) {
    const raw = await get('/activities/'+enc(id),options)
    const worry = raw.helpType === 'ACTION' ? await detail(raw.worryId,options) : undefined
    return normalizeActivity(raw,worry)
  }
  async function currentActivity(worryId,type,options) {
    const rows=await history(worryId,options)
    const current=rows.find(a=>a.type===type && ['IN_PROGRESS','PAUSED'].includes(a.status))
    return current ? activity(current.activity_id,options) : null
  }
  async function start(worryId,type,options={}) {
    const raw = await send('post','/worries/'+enc(worryId)+'/activities',{helpType:type,replaceOpen:false}, { ...options, intent:'start:'+worryId+':'+type })
    return activity(raw.activityId,options)
  }
  async function history(worryId,options) {
    const rows = await get('/worries/'+enc(worryId)+'/activities',options)
    // Legacy history contains IDs/checks but no decrypted action text. Only record metadata uses it.
    return rows.map(a=>({activity_id:a.activityId,worry_id:a.worryId,type:a.helpType,status:a.state,helpfulness:a.feedback})).reverse()
  }
  return {
    async session(options) {
      try { return await get('/guest-sessions/current',options) }
      catch(error) { if(error.response?.data?.error?.code === 'GUEST_SESSION_REQUIRED') return {authenticated:false}; throw error }
    },
    async vault(cursor,options) {
      const cursors = cursor ? JSON.parse(cursor) : {available:null,locked:null}
      const page = async (key,visibility) => cursors[key] === 'END' ? {items:[],nextCursor:null} : get('/worries?visibility='+visibility+'&limit=20'+(cursors[key]?'&cursor='+enc(cursors[key]):''), options)
      const [available,locked]=await Promise.all([page('available','PUBLIC'),page('locked','LOCKED')])
      const next={available:available.nextCursor||'END',locked:locked.nextCursor||'END'}
      return {available:available.items.map(normalizeWorry),locked:locked.items.map(normalizeWorry),next_cursor:Object.values(next).some(v=>v!=='END')?JSON.stringify(next):null}
    },
    lock: async (id,options)=>normalizeWorry(await rawDetail(id,options)), detail,
    markViewed: id=>send('post','/worries/'+enc(id)+'/view'),
    summary: (id,value)=>send('put','/worries/'+enc(id)+'/summary',{summary:value}),
    distress: (id,value)=>send('put','/worries/'+enc(id)+'/anxiety',{anxietyAfter:value}),
    release: (id,value)=>send('patch','/worries/'+enc(id)+'/publication',{publishAt:value}),
    async reflection(id,options) {const r=await get('/reflections/candidate?currentWorryId='+enc(id)+'&timeZone='+enc(zone()),options);return r?{worry_id:r.worryId,first_available_at:r.firstAvailableAt}:null},
    reflect:(id,outcome,current)=>send('put','/reflections/'+enc(id)+'?currentWorryId='+enc(current)+'&timeZone='+enc(zone()),{answer:outcome==='HAPPENED'?'AS_FEARED':outcome}),
    skipReflection:()=>send('post','/reflections/skip-today?timeZone='+enc(zone())),
    async similar(id,options) {const r=await get('/worries/'+enc(id)+'/past-experience',options);return r?{record_id:r.worryId,previous_help_type:r.helpType,helpfulness:r.helpful?'HELPFUL':null,created_at:(await get('/records/'+enc(r.worryId),options)).createdAt}:null},
    async selectHelp(id,type,expectedId) {
      const rows=await history(id)
      const row=rows.find(a=>['IN_PROGRESS','PAUSED'].includes(a.status))
      const current=row?{activityId:row.activity_id,worryId:row.worry_id,helpType:row.type}:null
      if(expectedId && current?.activityId!==expectedId) throw conflict(current?.activityId)
      if(current && (current.worryId!==id || current.helpType!==type)) {
        if(!expectedId) throw conflict(current.activityId)
        await send('post','/activities/'+enc(current.activityId)+'/stop')
        onStopped({worry_id:current.worryId,type:current.helpType,activity_id:current.activityId})
      }
      // Choosing REST never starts its timer. Each activity page owns its explicit start semantics.
      return {help_type:type}
    },
    start,currentActivity,
    entryActivity: async (id,type,options) => (await currentActivity(id,type,options)) || start(id,type,options),

    activity,
    step:(id,n,checked)=>send('put','/activities/'+enc(id)+'/steps/'+n,{done:checked}),
    async activityCommand(id,command) {
      const before=command==='pause'?await get('/activities/'+enc(id)):null
      const wireCommand=before?.helpType==='ACTION' && command==='pause'?'stop':command
      const raw=await send('post','/activities/'+enc(id)+'/'+wireCommand,undefined,command==='complete'?{intent:'complete:'+id}:undefined)
      const worry=raw.helpType==='ACTION'?await detail(raw.worryId):undefined
      return normalizeActivity(raw,worry)
    },
    empathy:async(id,options)=>({empathy_message:(await detail(id,options)).ai_content.empathy_message}),
    rate:(id,value)=>send('put','/activities/'+enc(id)+'/feedback',{answer:value}),
    async records(cursor,options) {const r=await get('/records?limit=20'+(cursor?'&cursor='+enc(cursor):''),options);return {items:r.items.map(w=>({...normalizeWorry({...w,visibility:'PUBLIC'}),latest_help_type:w.latestHelpType})),next_cursor:r.nextCursor}},
    async record(id,options) {
      const [worry,activities,reflection]=await Promise.all([get('/records/'+enc(id),options),history(id,options),get('/reflections/'+enc(id),options)])
      return {worry:normalizeWorry(worry),activities,reflection:reflection?{outcome:reflection.answer==='AS_FEARED'?'HAPPENED':reflection.answer}:null,
        ratings:activities.filter(a=>a.helpfulness).map(a=>({activity_id:a.activity_id,helpfulness:a.helpfulness}))}
    },
    deleteWorry:id=>request('delete','/worries/'+enc(id)),
    // Current backend exposes no deletion-job polling. Never fabricate completion for DELETING/404.
    deletionJob:async()=>{throw {code:'DELETION_PENDING'}},
    async nextUnviewed(worryId,options) {
      if (!worryId) return false
      let cursor = null
      const visited = new Set()
      do {
        const page = await get('/worries?visibility=PUBLIC&limit=100'+(cursor?'&cursor='+enc(cursor):''),options)
        if (page.items.some(w=>w.worryId!==worryId && !w.firstViewedAt)) return true
        cursor = page.nextCursor
        if (cursor && visited.has(cursor)) throw new Error('Repeated cursor')
        visited.add(cursor)
      } while (cursor)
      return false
    },
    demoStatus:headers=>get('/demo/status',{headers}),
    demoSession:headers=>send('post','/demo/session',undefined,{headers}),
    demoPresets:headers=>send('post','/demo/presets',undefined,{headers}),
    demoAdvance:(headers,preset='TO_PUBLISH')=>send('post','/demo/time-machine',{preset}, {headers}),
    demoReset:headers=>send('post','/demo/reset',undefined,{headers}),
  }
}
