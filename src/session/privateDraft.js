const drafts = new Map()
export function privateState(state) {
  if (!state || !['worry','tomorrowCheck','anxietyLevel','retryPayload'].some(key => Object.hasOwn(state,key))) return state
  const draftId = crypto.randomUUID()
  drafts.set(draftId,state)
  if (drafts.size > 20) drafts.delete(drafts.keys().next().value)
  return { draftId, ...(state.requestId ? {requestId:state.requestId}:{}), ...(state.analysisContext ? {analysisContext:state.analysisContext}:{}) }
}
export function readDraft(state) { return state?.draftId ? drafts.get(state.draftId) || state : state || {} }
export function clearDrafts() { drafts.clear() }
