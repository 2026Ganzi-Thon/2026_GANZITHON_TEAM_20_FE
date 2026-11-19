export const logError = error => ({status:error?.response?.status, code:error?.response?.data?.code ?? error?.response?.data?.error?.code ?? error?.code})
