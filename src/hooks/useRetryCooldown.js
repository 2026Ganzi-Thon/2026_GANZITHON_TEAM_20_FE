import { useCallback, useEffect, useState } from 'react'
import { retryAfterSeconds } from '../api/retryPolicy.js'
export default function useRetryCooldown() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!seconds) return
    const timer = window.setTimeout(() => setSeconds(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])
  const begin = useCallback(error => setSeconds(retryAfterSeconds(error)), [])
  return [seconds, begin]
}
