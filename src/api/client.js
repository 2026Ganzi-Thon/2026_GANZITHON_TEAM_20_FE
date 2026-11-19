import axios from 'axios'
import { clearDrafts } from '../session/privateDraft.js'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1', withCredentials: true, timeout: 15000, headers: { Accept:'application/json', 'Cache-Control':'no-store' } })
const unsafe = ['post','put','patch','delete']
let csrf = null, csrfPromise = null, generation = 0, controller = new AbortController()
let transition = Promise.resolve()
function resetMetadata() {
  clearDrafts()
  try { for (const key of Object.keys(sessionStorage)) if (key.startsWith('wooly.fe2.')) sessionStorage.removeItem(key) } catch { /* Optional ID metadata. */ }
}
function invalidate() { generation++; controller.abort(); controller = new AbortController(); clearCsrf() }
export function clearCsrf() { csrf = null; csrfPromise = null }
async function fetchCsrf() {
  if (!csrfPromise) {
    const epoch = generation
    const task = api.get('/csrf', { _sessionCsrf:true }).then(({data}) => {
      if (epoch !== generation) throw new axios.CanceledError('Session changed')
      if (!data?.token || !data.headerName) throw new Error('Invalid CSRF response')
      csrf = data
      return data
    }).finally(() => { if (csrfPromise === task) csrfPromise = null })
    csrfPromise = task
  }
  return csrfPromise
}
function changing(config) { return config.method === 'post' && ['/guest-sessions','/demo/session'].includes(config.url) || config.method === 'delete' && config.url === '/vault' }
api.interceptors.request.use(async config => {
  const epoch = generation
  if (changing(config) && !config._retryingSession) {
    let release
    const done = new Promise(resolve => { release = resolve })
    const previous = transition
    transition = previous.then(() => done)
    await previous
    invalidate()
    config._releaseSession = release
  } else if (!config._sessionCsrf && !config._retryingSession) {
    await transition
    if (epoch !== generation) throw new axios.CanceledError('Session changed')
  }
  config._sessionGeneration = generation
  const groupSignal = controller.signal, own = new AbortController(), original = config.signal
  const abort = () => own.abort()
  groupSignal.addEventListener('abort', abort, { once:true })
  original?.addEventListener('abort', abort, { once:true })
  if (groupSignal.aborted || original?.aborted) own.abort()
  config.signal = own.signal
  config._detach = () => { groupSignal.removeEventListener('abort',abort); original?.removeEventListener('abort',abort) }
  try {
    if (unsafe.includes(config.method)) {
      const token = csrf ?? await fetchCsrf()
      config.headers[token.headerName] = token.token
    }
    return config
  } catch (error) { config._detach(); config._releaseSession?.(); throw error }
})
api.interceptors.response.use(response => {
  const config = response.config
  config._detach?.()
  if (config._sessionGeneration !== generation) { config._releaseSession?.(); throw new axios.CanceledError('Session changed') }
  if (changing(config) && (config.url !== '/vault' || response.status === 204)) {
    clearCsrf(); resetMetadata()
    try { localStorage.setItem('wooly.session.changed', crypto.randomUUID()) } catch { /* Cross-tab checks also happen on focus. */ }
  }
  config._releaseSession?.()
  return response
}, async error => {
  const {config,response} = error
  config?._detach?.()
  if (config && config._sessionGeneration !== generation) { config._releaseSession?.(); throw new axios.CanceledError('Session changed') }
  if (response?.status === 429) error.retryAfterSec = Number(response.headers['retry-after']) || 10
  if (config && response?.status === 403 && response.data?.code === 'CSRF_REJECTED' && !config._csrfRetried) {
    config._csrfRetried = true
    clearCsrf()
    try { await fetchCsrf() } catch (fault) { config._releaseSession?.(); throw fault }
    // The same transition already holds the gate; do not acquire it twice.
    const release = config._releaseSession
    config._releaseSession = undefined
    if (release) config._retryingSession = true
    try { return await api(config) } finally { release?.() }
  }
  config?._releaseSession?.()
  if (response?.status === 401 && ['GUEST_SESSION_REQUIRED','GUEST_SESSION_INVALID'].includes(response.data?.code)) {
    resetMetadata(); clearCsrf()
    window.dispatchEvent(new CustomEvent('wooly:auth-error',{detail:response.data.code}))
  }
  throw error
})
window.addEventListener('storage', event => {
  if (event.key !== 'wooly.session.changed') return
  invalidate(); resetMetadata()
  window.dispatchEvent(new Event('wooly:external-session-change'))
})
export const errorCode = error => error.response?.data?.code ?? null
export default api
