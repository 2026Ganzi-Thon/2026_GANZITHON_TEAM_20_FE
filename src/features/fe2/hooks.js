import { useCallback, useEffect, useState, useRef } from 'react'
import { api, serverNow } from './api.js'
import { safeError } from './domain.js'

export function useResource(method, args = []) {
  const argsKey = JSON.stringify(args)
  const [revision, setRevision] = useState(0)
  const key = `${method}:${argsKey}`
  const identity = `${key}:${revision}`
  const [result, setResult] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    api[method](...JSON.parse(argsKey), { signal: controller.signal }).then(
      data => { if (!controller.signal.aborted) setResult({ key, identity, data }) },
      error => { if (!controller.signal.aborted) setResult({ key, identity, error }) },
    )
    return () => controller.abort()
  }, [method, argsKey, identity, key])
  const refresh = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    if (method === 'session') return
    function onFocus() { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('wooly:data-changed', refresh)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('wooly:data-changed', refresh)
    }
  }, [refresh, method])
  return { loading: result?.key !== key, refreshing: result?.identity !== identity, data: result?.key === key ? result.data : null,
    error: result?.identity === identity ? result.error : null, refresh }
}

export function useMutation() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const run = useCallback(async task => {
    if (inFlight.current) return { ok: false }
    inFlight.current = true; setBusy(true); setError('')
    try { return { ok: true, data: await task() } }
    catch (fault) { setError(safeError(fault)); return { ok: false, error: fault } }
    finally { inFlight.current = false; setBusy(false) }
  }, [])
  return { busy, error, run, clearError: () => setError('') }
}

export function useServerClock() {
  const [now, setNow] = useState(serverNow)
  useEffect(() => {
    const timer = setInterval(() => setNow(serverNow()), 500)
    return () => clearInterval(timer)
  }, [])
  return now
}
