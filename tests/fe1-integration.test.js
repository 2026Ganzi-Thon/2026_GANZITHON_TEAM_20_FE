import test from 'node:test'
import assert from 'node:assert/strict'
import { firstFuturePublication, isValidPublication } from '../src/api/publication.js'
import { retryAfterSeconds } from '../src/api/retryPolicy.js'

test('before 08:00 proposes the same morning without a nine-hour minimum', () => {
  const now = new Date(2026, 10, 19, 7, 59, 0).getTime()
  const next = firstFuturePublication(now)
  assert.equal(next.getDate(), 19)
  assert.equal(next.getHours(), 8)
  assert.equal(next.getTime() - now, 60000)
})
test('exactly at 08:00 proposes the next day; custom defaults also require strict future', () => {
  assert.equal(firstFuturePublication(new Date(2026, 10, 19, 8).getTime()).getDate(), 20)
  const next = firstFuturePublication(new Date(2026, 10, 19, 9).getTime(), 10)
  assert.equal(next.getDate(), 19)
  assert.equal(next.getHours(), 10)
})
test('publication rejects past, invalid dates, and the retention boundary', () => {
  const now = Date.now(), expiry = now + 30 * 86400000
  assert.equal(isValidPublication(now, now), false)
  assert.equal(isValidPublication('invalid', now), false)
  assert.equal(isValidPublication(expiry, now), false)
  assert.equal(isValidPublication(now + 60000, now), true)
})
test('only 429 creates a cooldown; invalid Retry-After falls back to ten seconds', () => {
  for (const value of [undefined, 'abc', '0', '-2']) assert.equal(retryAfterSeconds({response:{status:429,headers:{'retry-after':value}}}), 10)
  assert.equal(retryAfterSeconds({response:{status:429,headers:{'retry-after':'2.2'}}}), 3)
  assert.equal(retryAfterSeconds({response:{status:503,headers:{'retry-after':'20'}}}), 0)
})
