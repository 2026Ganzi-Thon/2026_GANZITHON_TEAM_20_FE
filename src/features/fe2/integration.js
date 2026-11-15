export const FE2_DATA_CHANGED_EVENT = 'wooly:data-changed'
const id = encodeURIComponent
export const fe2Links = Object.freeze({
  vault: '/vault', records: '/records',
  worry: worryId => '/worries/'+id(worryId),
  record: worryId => '/records/'+id(worryId),
  activity: activityId => '/activities/'+id(activityId),
})
export function subscribeFe2Changes(refresh){
  window.addEventListener(FE2_DATA_CHANGED_EVENT,refresh)
  return ()=>window.removeEventListener(FE2_DATA_CHANGED_EVENT,refresh)
}
