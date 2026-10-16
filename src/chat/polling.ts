import { ApiError } from '../api/client'
import type { ChatApi, WebhookBody } from '../api/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'stopped'

export function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve(); return }
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve() }
    const timer = setTimeout(finish, ms)
    signal.addEventListener('abort', finish, { once: true })
  })
}

/** One sequential consumer. Acknowledge only after successful local processing. */
export async function pollNotifications(options: {
  api: ChatApi
  signal: AbortSignal
  onBody: (body: WebhookBody) => void
  onStatus: (status: ConnectionStatus, error?: unknown) => void
}): Promise<void> {
  const { api, signal, onBody, onStatus } = options
  let failures = 0
  while (!signal.aborted) {
    try {
      const notification = await api.receive(signal)
      if (signal.aborted) return
      if (notification) {
        if (!Number.isSafeInteger(notification.receiptId) || !notification.body) throw new Error('Invalid notification')
        onBody(notification.body)
        if (signal.aborted) return
        const result = await api.acknowledge(notification.receiptId, signal)
        if (!result?.result) throw new Error('Notification was not acknowledged')
      }
      failures = 0
      onStatus('connected')
      // Prevent a tight loop if a proxy unexpectedly returns empty responses immediately.
      await delay(250, signal)
    } catch (error) {
      if (signal.aborted) return
      if (error instanceof ApiError && [400, 401, 403, 404].includes(error.status)) {
        onStatus('stopped', error)
        return
      }
      onStatus('reconnecting', error)
      failures++
      await delay(Math.min(1000 * 2 ** Math.min(failures - 1, 5), 30_000), signal)
    }
  }
}
