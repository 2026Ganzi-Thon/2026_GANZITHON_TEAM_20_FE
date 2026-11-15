import { useEffect, useRef, useState } from 'react'
import { api, notifyDataChanged } from './api.js'
import { Button, Feedback, Modal } from './components.jsx'
import { safeError } from './domain.js'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const pendingKey = id => `wooly.fe2.deletion:${id}`
function pending(id) { try { return JSON.parse(sessionStorage.getItem(pendingKey(id)) || 'null') } catch { return null } }
function savePending(id, value) { try { if (value) sessionStorage.setItem(pendingKey(id), JSON.stringify(value)); else sessionStorage.removeItem(pendingKey(id)) } catch { /* Optional job metadata only. */ } }
export default function Deletion({ worryId, description, onClose, onDeleted, shred = false, inline = false, title = '이 기록을 삭제할까요?', wide = false }) {
  const [busy, setBusy] = useState(false), [jobId, setJobId] = useState(() => pending(worryId)?.jobId), [error, setError] = useState('')
  const mounted = useRef(true), inFlight = useRef(false)
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false}},[])
  const [accepted, setAccepted] = useState(() => Boolean(pending(worryId)))
  function done() { savePending(worryId, null); notifyDataChanged(); if(mounted.current) onDeleted() }
  async function remove() {
    if (inFlight.current) return
    inFlight.current=true
    setBusy(true); setError('')
    try {
      let current = jobId
      if (!current) {
        if (accepted) throw { code: 'DELETION_PENDING' }
        // A lost response must not trigger another destructive request blindly.
        setAccepted(true)
        savePending(worryId, { unknown: true })
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
      if (fault.response?.status && fault.response.status < 500 && !jobId) { setAccepted(false); savePending(worryId, null) }
      if(mounted.current) setError(safeError(fault))
    }
    finally { inFlight.current=false; if(mounted.current) setBusy(false) }
  }
  const content = <>{!inline && <p className="fe2-muted fe2-modal-description">{description}</p>}
    <Feedback error={Boolean(error)}>{busy ? '삭제 결과를 확인하고 있어요…' : error}</Feedback>
    <Button disabled={busy || (accepted && !jobId)} onClick={remove}>{jobId ? '삭제 결과 다시 확인' : shred ? '파쇄하기' : '삭제'}</Button>
    <Button secondary disabled={busy} onClick={onClose}>{accepted ? '닫기' : '취소'}</Button></>
  if (inline) return <div className="fe2-delete-actions">{content}</div>
  return <Modal className={wide ? 'fe2-wide-delete' : ''} title={title} onClose={onClose} busy={busy}>{content}</Modal>
}
