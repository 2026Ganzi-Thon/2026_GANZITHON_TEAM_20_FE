export function firstFuturePublication(now, hour = 8, minute = 0) {
  const date = new Date(now)
  date.setHours(hour, minute, 0, 0)
  if (date.getTime() <= now) date.setDate(date.getDate() + 1)
  return date
}
export function isValidPublication(value, now, expiresAt = now + 30 * 86400000) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) && time > now && time < expiresAt
}
