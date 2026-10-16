export function waitForRequest(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason) }
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
    signal.addEventListener('abort', abort, { once: true })
  })
}

/** Per-method limits apply to the whole instance, including StrictMode remounts. */
export function createRequestGate() {
  const next = new Map<string, number>()
  const slowMethods = new Set(['getStateInstance', 'getSettings', 'getChats', 'getChatHistory'])
  return async (method: string, signal: AbortSignal) => {
    signal.throwIfAborted()
    if (!slowMethods.has(method)) return
    const slot = Math.max(Date.now(), next.get(method) ?? 0)
    next.set(method, slot + 1100)
    await waitForRequest(slot - Date.now(), signal)
  }
}
