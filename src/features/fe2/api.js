import axios from 'axios'
import client from '../../api/client.js'
import { createSpringApi } from './springContract.js'
import { FE2_DATA_CHANGED_EVENT } from './integration.js'

// Production uses the inspected Spring contract. Draft fixtures are development only.
export const mockEnabled = import.meta.env.DEV && import.meta.env.VITE_FE2_MOCK === 'true'
const http = mockEnabled ? axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  timeout: 15000,
  headers: { Accept: 'application/json', 'Cache-Control': 'no-store' },
}) : client

let serverOffset = 0
let mockAdapter
const intents = new Map()
export function intentKey(intent) {
  if (!intents.has(intent)) intents.set(intent, crypto.randomUUID())
  return intents.get(intent)
}
export function clearIntent(intent) { intents.delete(intent) }
export const serverNow = () => Date.now() + serverOffset

export async function request(method, url, data, options = {}) {
  if (mockEnabled) {
    mockAdapter ??= import('./mockAdapter.js').then(module => module.adapter)
  }
  const headers = { ...options.headers }
  if (options.intent) headers['Idempotency-Key'] = intentKey(options.intent)
  let response
  try { response = await http.request({
    method, url, data, signal: options.signal, headers,
    ...(mockEnabled ? { adapter: await mockAdapter } : {}),
  }) } catch(error) {
    if(!mockEnabled && error.response?.data?.code) {
      const {code,message}=error.response.data
      error.response.data={error:{code,message}}
    }
    throw error
  }
  const serverTime = response.data?.serverTime || response.data?.meta?.server_now || response.headers?.date
  if (serverTime && Number.isFinite(Date.parse(serverTime))) serverOffset=Date.parse(serverTime)-Date.now()
  if (response.data?.meta?.server_now && Number.isFinite(Date.parse(response.data.meta.server_now))) serverOffset = Date.parse(response.data.meta.server_now) - Date.now()
  if (mockEnabled && response.status !== 204 && (!response.data || !Object.hasOwn(response.data, 'data'))) throw new Error('Unexpected API response envelope')
  if (!mockEnabled && response.status !== 204 && (!response.data || typeof response.data !== 'object')) throw new Error('Invalid API JSON response')
  const result = response.status === 204 ? null : mockEnabled ? response.data?.data : response.data
  return { data: result, status: response.status }
}
const get = (url, options) => request('get', url, undefined, options).then(r => r.data)
const send = (method, url, body, options) => request(method, url, body, options).then(r => r.data)
const id = encodeURIComponent
const storageKey = (worryId, type) => `wooly.fe2.activity:${worryId}:${type}`
function savedActivity(worryId, type) { try { return sessionStorage.getItem(storageKey(worryId, type)) } catch { return null } }
function rememberActivity(a) { try { sessionStorage.setItem(storageKey(a.worry_id, a.type), a.activity_id) } catch { /* Memory-only browsing remains usable. */ } return a }
export function forgetActivity(a) {
  try { sessionStorage.removeItem(storageKey(a.worry_id, a.type)) } catch { /* No sensitive content is persisted. */ }
  clearIntent(`start:${a.worry_id}:${a.type}`)
}
const draftApi = {
  markViewed: async () => null,
  nextUnviewed: async worryId => worryId ? (await api.vault()).available.some(w=>w.id!==worryId && w.is_unviewed) : false,
  session: options => get('/session', options),
  vault: (cursor, options) => get(`/vault/worries?status=all&limit=20${cursor ? `&cursor=${id(cursor)}` : ''}`, options),
  lock: (worryId, options) => get(`/worries/${id(worryId)}/lock`, options),
  detail: (worryId, options) => get(`/worries/${id(worryId)}`, options),
  summary: (worryId, value) => send('patch', `/worries/${id(worryId)}/summary`, { display_summary: value }),
  distress: (worryId, value) => send('put', `/worries/${id(worryId)}/post-distress`, { distress_after: value }),
  release: (worryId, release_at) => send('patch', `/worries/${id(worryId)}/release`, { release_at }),
  reflection: (worryId, options) => get(`/reflections/candidate?current_worry_id=${id(worryId)}`, options),
  reflect: (worryId, outcome) => send('put', `/reflections/${id(worryId)}`, { outcome }),
  skipReflection: () => send('post', '/reflections/skip-today', { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  similar: (worryId, options) => get(`/worries/${id(worryId)}/similar-experience`, options),
  selectHelp: (worryId, type, activeId) => send('post', `/worries/${id(worryId)}/help-selections`, {
    help_type: type, confirm_switch: Boolean(activeId), expected_active_activity_id: activeId ?? null,
  }),
  start: (worryId, type, options) => send('post', `/worries/${id(worryId)}/activities`, { type }, { intent: `start:${worryId}:${type}`, ...options }).then(rememberActivity),
  currentActivity: async (worryId, type, options) => {
    const savedId = savedActivity(worryId, type)
    if (!savedId) return null
    try {
      const activity = await api.activity(savedId, options)
      if (activity.worry_id !== worryId || activity.type !== type) return null
      if (activity.status === 'COMPLETED' || (activity.type === 'REST' && activity.status === 'STOPPED')) { forgetActivity(activity); return null }
      return activity
    } catch (error) {
      if (error.response?.status === 404) { try { sessionStorage.removeItem(storageKey(worryId, type)) } catch { /* Optional metadata. */ } return null }
      throw error
    }
  },
  entryActivity: async (worryId, type, options) => {
    const existing = await api.currentActivity(worryId, type, options)
    if (existing?.status === 'STOPPED' && type === 'ACTION') return api.activityCommand(existing.activity_id, 'resume')
    return existing || api.start(worryId, type, options)
  },
  activity: (activityId, options) => get(`/activities/${id(activityId)}`, options).then(rememberActivity),
  step: (activityId, number, checked) => send('patch', `/activities/${id(activityId)}/steps/${number}`, { completed: checked }),
  activityCommand: (activityId, command) => send('post', `/activities/${id(activityId)}/${command}`, command === 'stop' ? { reason: 'USER_QUIT' } : undefined,
    command === 'complete' ? { intent: `complete:${activityId}` } : undefined),
  empathy: (worryId, options) => get(`/worries/${id(worryId)}/empathy`, options),
  rate: (activityId, value) => send('put', `/activities/${id(activityId)}/rating`, { helpfulness: value }),
  records: (cursor, options) => get(`/records?limit=20${cursor ? `&cursor=${id(cursor)}` : ''}`, options),
  record: (worryId, options) => get(`/records/${id(worryId)}`, options),
  deleteWorry: (worryId, intent) => request('delete', `/worries/${id(worryId)}`, undefined, { headers: { 'X-Deletion-Intent': intent } }),
  deletionJob: (jobId) => get(`/deletion-jobs/${id(jobId)}`),
  scenarios: options => get('/demo/scenarios', options),
  createDemo: scenario_id => send('post', '/demo/sessions', { scenario_id }),
  advanceDemo: (demoId, simulated_now) => send('post', `/demo/sessions/${id(demoId)}/advance`, { simulated_now }),
  resetDemo: demoId => send('delete', `/demo/sessions/${id(demoId)}`),
}

export const api = mockEnabled ? draftApi : createSpringApi(request, { onStopped: forgetActivity })

export function notifyDataChanged() {
  // FE1 can subscribe to this event to refetch its home/notification summaries.
  window.dispatchEvent(new Event(FE2_DATA_CHANGED_EVENT))
}
