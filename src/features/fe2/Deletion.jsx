import { useEffect, useRef, useState } from 'react'
import { api, mockEnabled, notifyDataChanged } from './api.js'
import { Button, Feedback, Modal } from './components.jsx'
import { safeError } from './domain.js'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const pendingKey = id => `wooly.fe2.deletion:${id}`
function pending(id) { try { return JSON.parse(sessionStorage.getItem(pendingKey(id)) || 'null') } catch { return null } }
function savePending(id, value) { try { if (value) sessionStorage.setItem(pendingKey(id), JSON.stringify(value)); else sessionStorage.removeItem(pendingKey(id)) } catch { /* Optional job metadata only. */ } }
export default function Deletion({ worryId, description, onClose, onDeleted, shred = false, inline = false, title = '이 기록을 삭제할까요?', wide = false }) {
  const [busy, setBusy] = useState(false), [jobId, setJobId] = useState(() => pending(worryId)?.jobId), [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(() => Math.max(0, Math.ceil(((pending(worryId)?.nextCheckAt || 0) - Date.now()) / 1000)))
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(value => Math.max(0,value-1)),1000); return () => clearTimeout(timer) }, [cooldown])
  const mounted = useRef(true), inFlight = useRef(false)
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false}},[])
  const [accepted, setAccepted] = useState(() => Boolean(pending(worryId)))
  function done() { savePending(worryId, null); notifyDataChanged(); if(mounted.current) onDeleted() }
  async function remove() {
    if (inFlight.current || cooldown) return
    inFlight.current=true
    setBusy(true); setError('')
    try {
      let current = jobId
      if (!current) {
        if (accepted && mockEnabled) throw { code: 'DELETION_PENDING' }
        // A lost response must not trigger another destructive request blindly.
        setAccepted(true)
        const previous = pending(worryId) || {}
        const windowStart = Date.now() - (previous.windowStart || 0) < 60000 ? previous.windowStart : Date.now()
        const checks = windowStart === previous.windowStart ? (previous.checks || 0) + 1 : 1
        savePending(worryId, { unknown:true, windowStart, checks, nextCheckAt:Date.now() + (checks >= 12 ? 60000 : 5000) })
        const response = await api.deleteWorry(worryId, shred ? 'SHRED' : 'STANDARD')
        if (response.status === 204) { done(); return }
        if (response.status !== 202 || !response.data?.deletion_job_id) throw { code: 'DELETION_PENDING' }
        current = response.data.deletion_job_id; setJobId(current); savePending(worryId, { jobId: current })
      }
      for (let attempt = 0; attempt < 12; attempt++) {
        if(!mounted.current) return
        const job = await api.deletionJob(current)
        if (job.status === 'COMPLETED') { done(); return }
        if (job.status === 'FAILED_RETRYABLE') throw { code: 'DELETION_PENDING' }
        await pause(700)
      }
      throw { code: 'DELETION_PENDING' }
    } catch (fault) {
      // A definite rejection differs from a lost/unknown deletion response.
      if (fault.response?.status && fault.response.status < 500 && !jobId) { setAccepted(false); savePending(worryId, null); setCooldown(0) }
      if(mounted.current) setError(safeError(fault))
    }
    finally { inFlight.current=false; if(mounted.current) { setBusy(false); setCooldown(Math.max(0, Math.ceil(((pending(worryId)?.nextCheckAt || 0)-Date.now())/1000))) } }
  }
  const content = <>{!inline && <p className="fe2-muted fe2-modal-description">{description}</p>}
    <Feedback error={Boolean(error)}>{busy ? '삭제 결과를 확인하고 있어요…' : error}</Feedback>
    <Button disabled={busy || cooldown > 0 || (mockEnabled && accepted && !jobId)} onClick={remove}>{cooldown > 0 ? cooldown + '초 뒤 결과 재확인' : jobId || accepted ? '삭제 결과 다시 확인' : shred ? '파쇄하기' : '삭제'}</Button>
    <Button secondary disabled={busy} onClick={onClose}>{accepted ? '닫기' : '취소'}</Button></>
  if (inline) return <div className="fe2-delete-actions">{content}</div>
  return <Modal className={wide ? 'fe2-wide-delete' : ''} title={title} onClose={onClose} busy={busy}>{content}</Modal>
}
