import type { AccountResult, ChatApi, Credentials, HistoryMessage, InstanceSettings, Notification, RemoteChat } from './types'
import { createRequestGate, waitForRequest } from './rateLimit'

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export function createApi(credentials: Credentials): ChatApi {
  const base = `${credentials.apiUrl}/waInstance${credentials.idInstance}`
  const gate = createRequestGate()

  async function request<T>(method: string, options: {
    verb?: string; body?: unknown; suffix?: string; query?: string; signal?: AbortSignal
  } = {}): Promise<T> {
    const lifetime = options.signal ?? new AbortController().signal
    // Only reads may be retried. A send with a lost response must never be duplicated.
    const retryable = ['getStateInstance', 'getSettings', 'getChats', 'getChatHistory'].includes(method)
    for (let attempt = 0; ; attempt++) {
      await gate(method, lifetime)
      const timeout = AbortSignal.timeout(method === 'receiveNotification' ? 40_000 : 20_000)
      const signal = AbortSignal.any([lifetime, timeout])
      const response = await fetch(
      `${base}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}${options.suffix ?? ''}${options.query ?? ''}`,
      {
        method: options.verb ?? 'GET', signal,
        headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: 'omit', referrerPolicy: 'no-referrer',
      },
    )
      if (response.status === 429 && retryable && attempt < 2) {
        const header = response.headers.get('Retry-After')
        const seconds = header ? Number(header) : NaN
        const retryMs = header ? (Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now()) : 0
        if (!Number.isFinite(retryMs) || retryMs <= 60_000) {
          await waitForRequest(Math.max(1500 * 2 ** attempt, Number.isFinite(retryMs) ? retryMs : 0), lifetime)
          continue
        }
      }
      if (!response.ok) {
      // Do not expose provider responses: they can contain URLs with credentials.
      throw new ApiError(response.status, apiErrorMessage(response.status))
      }
      const text = await response.text()
      try { return (text.trim() ? JSON.parse(text) : null) as T }
      catch { throw new ApiError(502, 'Сервис вернул некорректный ответ. Попробуйте позже.') }
    }
  }

  return {
    getState: (signal) => request<{ stateInstance: string }>('getStateInstance', { signal }),
    getSettings: (signal) => request<InstanceSettings>('getSettings', { signal }),
    getChats: (signal) => request<RemoteChat[]>('getChats', { signal }),
    getChatHistory: (chatId, signal) => request<HistoryMessage[]>('getChatHistory', {
      verb: 'POST', body: { chatId, count: 100 }, signal,
    }),
    checkAccount: (phone, signal) => request<AccountResult>('checkAccount', {
      verb: 'POST', body: { phoneNumber: Number(phone) }, signal,
    }),
    sendMessage: (chatId, message, signal) => request<{ idMessage: string }>('sendMessage', {
      verb: 'POST', body: { chatId, message }, signal,
    }),
    receive: (signal) => request<Notification | null>('receiveNotification', {
      query: '?receiveTimeout=25', signal,
    }),
    acknowledge: (receiptId, signal) => request<{ result: boolean }>('deleteNotification', {
      verb: 'DELETE', suffix: `/${receiptId}`, signal,
    }),
  }
}

export function apiErrorMessage(status: number): string {
  if (status === 401 || status === 403) return 'Нет доступа. Проверьте ID инстанса и API-токен в GREEN-API.'
  if (status === 429 || status === 469) return 'Достигнут лимит запросов. Подождите перед следующей попыткой.'
  if (status === 400) return 'Запрос отклонён. Проверьте данные и настройки инстанса в GREEN-API.'
  if (status === 404) return 'Инстанс не найден. Проверьте ID и адрес API.'
  return 'GREEN-API временно недоступен. Попробуйте позже.'
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof DOMException && error.name === 'TimeoutError') return 'Сервис не ответил вовремя. Проверьте соединение и повторите попытку.'
  return 'Не удалось связаться с GREEN-API. Проверьте интернет и адрес API.'
}
