import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { ChatApi, Notification } from '../api/types'
import { pollNotifications } from './polling'

const notification: Notification = { receiptId: 42, body: { typeWebhook: 'unknownEvent' } }
const mockApi = (): ChatApi => ({ getState: vi.fn(), getSettings: vi.fn(), getChats: vi.fn(), getChatHistory: vi.fn(), checkAccount: vi.fn(), sendMessage: vi.fn(), receive: vi.fn(), acknowledge: vi.fn() })
afterEach(() => vi.useRealTimers())

describe('sequential notification consumer', () => {
  it('processes before acknowledging, including unsupported events', async () => {
    vi.useFakeTimers()
    const api = mockApi()
    const controller = new AbortController()
    const order: string[] = []
    vi.mocked(api.receive).mockResolvedValue(notification)
    vi.mocked(api.acknowledge).mockImplementation(async () => { order.push('ack'); controller.abort(); return { result: true } })
    await pollNotifications({ api, signal: controller.signal, onBody: () => { order.push('process') }, onStatus: vi.fn() })
    expect(order).toEqual(['process', 'ack'])
    expect(api.receive).toHaveBeenCalledTimes(1)
  })
  it('does not acknowledge when processing fails and retries after backoff', async () => {
    vi.useFakeTimers()
    const api = mockApi()
    const controller = new AbortController()
    vi.mocked(api.receive).mockResolvedValue(notification)
    const onBody = vi.fn().mockImplementationOnce(() => { throw new Error('state unavailable') }).mockImplementation(() => { controller.abort() })
    const onStatus = vi.fn()
    const running = pollNotifications({ api, signal: controller.signal, onBody, onStatus })
    await vi.advanceTimersByTimeAsync(1000)
    await running
    expect(onStatus).toHaveBeenCalledWith('reconnecting', expect.any(Error))
    expect(onBody).toHaveBeenCalledTimes(2)
    expect(api.acknowledge).not.toHaveBeenCalled()
  })
  it('stops on invalid credentials instead of repeatedly hammering the API', async () => {
    const api = mockApi()
    vi.mocked(api.receive).mockRejectedValue(new ApiError(401, 'Invalid credentials'))
    const onStatus = vi.fn()
    await pollNotifications({ api, signal: new AbortController().signal, onBody: vi.fn(), onStatus })
    expect(onStatus).toHaveBeenCalledWith('stopped', expect.any(ApiError))
    expect(api.receive).toHaveBeenCalledTimes(1)
  })
  it('does not process or delete a late response after logout', async () => {
    const api = mockApi()
    const controller = new AbortController()
    vi.mocked(api.receive).mockImplementation(async () => { controller.abort(); return notification })
    const onBody = vi.fn()
    await pollNotifications({ api, signal: controller.signal, onBody, onStatus: vi.fn() })
    expect(onBody).not.toHaveBeenCalled()
    expect(api.acknowledge).not.toHaveBeenCalled()
  })
  it('backs off when acknowledgement returns false', async () => {
    const api = mockApi()
    const controller = new AbortController()
    vi.mocked(api.receive).mockResolvedValue(notification)
    vi.mocked(api.acknowledge).mockResolvedValue({ result: false })
    const onStatus = vi.fn().mockImplementation((status) => { if (status === 'reconnecting') controller.abort() })
    await pollNotifications({ api, signal: controller.signal, onBody: vi.fn(), onStatus })
    expect(onStatus).toHaveBeenCalledWith('reconnecting', expect.any(Error))
  })
})
