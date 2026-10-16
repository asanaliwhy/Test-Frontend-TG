import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createApi, errorMessage } from './client'

const credentials = { idInstance: '4100000000', apiTokenInstance: 'test_runtime_token', apiUrl: 'https://4100.api.green-api.com' }
afterEach(() => vi.unstubAllGlobals())

describe('GREEN-API Telegram transport', () => {
  it('uses the documented instance path and sends canonical chat ID', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ idMessage: 'server-id' })))
    vi.stubGlobal('fetch', fetcher)
    await expect(createApi(credentials).sendMessage('12345', 'Привет')).resolves.toEqual({ idMessage: 'server-id' })
    const [url, options] = fetcher.mock.calls[0]
    expect(url).toBe('https://4100.api.green-api.com/waInstance4100000000/sendMessage/test_runtime_token')
    expect(JSON.parse(options.body)).toEqual({ chatId: '12345', message: 'Привет' })
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('omit')
  })
  it('supports long-poll null responses and DELETE acknowledgement', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('')).mockResolvedValueOnce(new Response('{"result":true}'))
    vi.stubGlobal('fetch', fetcher)
    const api = createApi(credentials)
    await expect(api.receive()).resolves.toBeNull()
    expect(fetcher.mock.calls[0][0]).toContain('?receiveTimeout=25')
    await expect(api.acknowledge(42)).resolves.toEqual({ result: true })
    expect(fetcher.mock.calls[1][0]).toContain('/deleteNotification/test_runtime_token/42')
    expect(fetcher.mock.calls[1][1].method).toBe('DELETE')
  })
  it('does not leak a token-bearing provider response into UI errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`error: ${credentials.apiTokenInstance}`, { status: 403 })))
    const error = await createApi(credentials).getState().catch((error: unknown) => error)
    expect(error).toBeInstanceOf(ApiError)
    expect(errorMessage(error)).not.toContain(credentials.apiTokenInstance)
    expect(errorMessage(error)).toContain('Нет доступа')
  })
  it('rejects invalid JSON and never automatically retries sends', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('invalid JSON'))
    vi.stubGlobal('fetch', fetcher)
    await expect(createApi(credentials).sendMessage('123', 'Текст')).rejects.toThrow('некорректный ответ')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
