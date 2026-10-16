import { afterEach, expect, it, vi } from 'vitest'
import { createRequestGate } from './rateLimit'
import { createApi } from './client'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('spaces requests to the same limited method while allowing other methods', async () => {
  vi.useFakeTimers()
  const gate = createRequestGate()
  const signal = new AbortController().signal
  await gate('getSettings', signal)
  const ready = vi.fn()
  const waiting = gate('getSettings', signal).then(ready)
  await gate('getChats', signal)
  await vi.advanceTimersByTimeAsync(1099)
  expect(ready).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  await waiting
  expect(ready).toHaveBeenCalledOnce()
})

it('cancels queued requests when the session ends', async () => {
  vi.useFakeTimers()
  const gate = createRequestGate()
  const controller = new AbortController()
  await gate('getChats', controller.signal)
  const result = gate('getChats', controller.signal).catch((error: unknown) => error)
  controller.abort()
  expect(await result).toBeInstanceOf(DOMException)
})

it('retries a rate-limited settings read after Retry-After', async () => {
  vi.useFakeTimers()
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '2' } }))
    .mockResolvedValueOnce(new Response('{"incomingWebhook":"yes"}'))
  vi.stubGlobal('fetch', fetcher)
  const api = createApi({ idInstance: '4100000000', apiTokenInstance: 'test_token', apiUrl: 'https://4100.api.green-api.com' })
  const result = api.getSettings()
  await vi.advanceTimersByTimeAsync(1999)
  expect(fetcher).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  await expect(result).resolves.toEqual({ incomingWebhook: 'yes' })
  expect(fetcher).toHaveBeenCalledTimes(2)
})

it('does not retry rate-limited sends', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 429 }))
  vi.stubGlobal('fetch', fetcher)
  const api = createApi({ idInstance: '4100000000', apiTokenInstance: 'test_token', apiUrl: 'https://4100.api.green-api.com' })
  await expect(api.sendMessage('123', 'Текст')).rejects.toThrow('лимит')
  expect(fetcher).toHaveBeenCalledTimes(1)
})
