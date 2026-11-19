export function retryAfterSeconds(error) {
  if (error?.response?.status !== 429) return 0
  const value = Number(error.retryAfterSec ?? error.response.headers?.['retry-after'])
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 10
}
