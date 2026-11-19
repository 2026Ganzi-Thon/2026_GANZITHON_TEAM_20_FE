import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { privateState } from '../session/privateDraft.js'
export default function usePrivateNavigation() {
  const navigate = useNavigate()
  return useCallback((to, options) => navigate(to, options?.state ? { ...options, state: privateState(options.state) } : options), [navigate])
}
