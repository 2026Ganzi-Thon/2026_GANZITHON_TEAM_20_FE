import { useEffect, useRef, useState } from 'react'
import { Icon, Modal } from './components.jsx'
import { calendarDays, canSelectDay, dayValue } from './calendar.js'

export default function DatePicker({value,min,max,onChange,timeLabel}){
  const [open,setOpen]=useState(false)
  return <><button type="button" className="fe2-date" aria-label="공개 날짜 선택" aria-haspopup="dialog" onClick={()=>setOpen(true)}>{new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long'}).format(new Date(value+'T12:00:00'))}</button>
    {open&&<Calendar value={value} min={min} max={max} timeLabel={timeLabel} onClose={()=>setOpen(false)} onChange={next=>{onChange(next);setOpen(false)}}/>}</>
}
function Calendar({value,min,max,onChange,onClose,timeLabel}){
  const initial=new Date(value+'T12:00:00')
  const [month,setMonth]=useState({year:initial.getFullYear(),month:initial.getMonth()})
  const [focused,setFocused]=useState(value)
  const grid=useRef(null)
  const days=calendarDays(month.year,month.month),rows=Array.from({length:days.length/7},(_,i)=>days.slice(i*7,i*7+7))
  useEffect(()=>{grid.current?.querySelector('[tabindex="0"]')?.focus()},[focused])
  const changeMonth=delta=>{
    const next=new Date(month.year,month.month+delta,1)
    setMonth({year:next.getFullYear(),month:next.getMonth()})
    const start=dayValue(next.getFullYear(),next.getMonth(),1)
    setFocused(start<min?min:start>max?max:start)
  }
  const monthEnd=delta=>{const date=new Date(month.year,month.month+delta+1,0);return dayValue(date.getFullYear(),date.getMonth(),date.getDate())}
  const monthStart=delta=>{const date=new Date(month.year,month.month+delta,1);return dayValue(date.getFullYear(),date.getMonth(),1)}
  function keyDown(event,day){
    const shifts={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}
    if(!(event.key in shifts))return
    event.preventDefault()
    const next=new Date(month.year,month.month,day+shifts[event.key],12)
    const key=dayValue(next.getFullYear(),next.getMonth(),next.getDate())
    if(!canSelectDay(key,min,max))return
    setMonth({year:next.getFullYear(),month:next.getMonth()});setFocused(key)
  }
  return <Modal title="공개 날짜 선택" className="fe2-calendar-dialog" onClose={onClose} dismissOnBackdrop>
    <div className="fe2-calendar-heading"><strong aria-live="polite">{new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(month.year,month.month,1))}</strong><div>
      <button type="button" aria-label="이전 달" disabled={monthEnd(-1)<min} onClick={()=>changeMonth(-1)}><Icon name="back"/></button>
      <button type="button" aria-label="다음 달" disabled={monthStart(1)>max} onClick={()=>changeMonth(1)}><Icon name="chevron"/></button></div></div>
    <div role="grid" aria-label="공개 날짜" className="fe2-calendar-grid" ref={grid}>
      <div role="row">{['SUN','MON','TUE','WED','THU','FRI','SAT'].map(day=><span role="columnheader" key={day}>{day}</span>)}</div>
      {rows.map((row,i)=><div role="row" key={i}>{row.map((day,j)=>{const key=day?dayValue(month.year,month.month,day):'';return <div role="gridcell" key={j} aria-selected={key===value}>{day&&<button type="button" aria-label={month.year+'년 '+(month.month+1)+'월 '+day+'일'} aria-current={key===dayValue(new Date().getFullYear(),new Date().getMonth(),new Date().getDate())?'date':undefined} tabIndex={key===focused?0:-1} disabled={!canSelectDay(key,min,max)} onKeyDown={event=>keyDown(event,day)} onClick={()=>onChange(key)}>{day}</button>}</div>})}</div>)}
    </div><div className="fe2-calendar-time"><span>Time</span><button type="button" aria-label="시간 선택으로 돌아가기" onClick={onClose}>{timeLabel}</button></div>
  </Modal>
}
