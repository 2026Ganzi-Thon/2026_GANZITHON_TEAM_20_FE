export function calendarDays(year,month){
  const offset=new Date(year,month,1).getDay()
  const count=new Date(year,month+1,0).getDate()
  return Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>i>=offset&&i<offset+count?i-offset+1:null)
}
export function dayValue(year,month,day){return [year,String(month+1).padStart(2,'0'),String(day).padStart(2,'0')].join('-')}
export const canSelectDay=(value,min,max)=>value>=min&&value<=max
