import { AxiosError } from 'axios'
import { createMockEngine } from './mockEngine.js'
const engine = createMockEngine()
export async function adapter(config) {
  await new Promise(resolve => setTimeout(resolve, 180))
  if (config.signal?.aborted) throw new AxiosError('Canceled', 'ERR_CANCELED', config)
  const method = config.method.toLowerCase()
  try {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    const data = engine.dispatch(method, config.url, body, config.headers.get('Idempotency-Key'))
    return { config, status: method === 'delete' && config.url.startsWith('/worries/') ? 202 : 200, statusText: 'OK', headers: {},
      data: { data, meta: { server_now: new Date().toISOString() } } }
  } catch (fault) {
    throw new AxiosError('예시 요청 실패', 'MOCK_ERROR', config, null, {
      config, status: fault.status || 500, headers: {}, data: { error: { code: fault.code, details: fault.details } },
    })
  }
}
