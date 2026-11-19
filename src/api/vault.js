import client from './client'
/** GET /api/v1/vault/summary; development preview shares FE2's fixture engine. */
export const getVaultSummary = async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_FE2_MOCK === 'true') {
    const { api } = await import('../features/fe2/api.js')
    const data = await api.vault()
    return { lockedCount: data.locked.length, publicCount: data.available.length, analysisRequests: [], nearestPublishAt: data.locked.map(item => item.release_at).sort()[0] || null }
  }
  return (await client.get('/vault/summary')).data
}

// Home continuation contains only activity metadata, never worry content.
export const getCurrentActivity = async () => {
  const response = await client.get('/activities/current');
  return response.status === 204 ? null : response.data;
};
