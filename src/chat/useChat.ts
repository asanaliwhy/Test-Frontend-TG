import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { ChatApi } from '../api/types'
import { errorMessage } from '../api/client'
import { chatReducer, initialState } from './store'
import type { ChatState } from './store'
import { notificationActions } from './events'
import { pollNotifications } from './polling'
import type { ConnectionStatus } from './polling'

export function useChat(api: ChatApi, seed: ChatState = initialState) {
  const [state, dispatch] = useReducer(chatReducer, seed)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [connectionError, setConnectionError] = useState('')
  const [restart, setRestart] = useState(0)
  const session = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    session.current = controller
    return () => controller.abort()
  }, [api])

  useEffect(() => {
    const controller = new AbortController()
    setStatus('connecting')
    setConnectionError('')
    void pollNotifications({ api, signal: controller.signal,
      onBody: (body) => {
        if (body.typeWebhook === 'stateInstanceChanged' && body.stateInstance !== 'authorized') {
          setStatus('stopped')
          setConnectionError('Telegram отключён от инстанса. Авторизуйте его в GREEN-API и подключитесь заново.')
          controller.abort()
          return
        }
        notificationActions(body).forEach(dispatch)
      },
      onStatus: (next, error) => {
        setStatus(next)
        setConnectionError(error ? errorMessage(error) : '')
      },
    })
    return () => controller.abort()
  }, [api, restart])

  const send = useCallback(async (chatId: string, text: string) => {
    const controller = session.current
    if (!controller || controller.signal.aborted) return
    const id = crypto.randomUUID()
    dispatch({ type: 'message', message: { id, chatId, text, timestamp: Date.now(), direction: 'outgoing', status: 'sending' } })
    try {
      const result = await api.sendMessage(chatId, text, controller.signal)
      if (controller.signal.aborted) return
      if (!result?.idMessage) throw new Error('Missing message id')
      dispatch({ type: 'update', chatId, id, patch: { id: result.idMessage, status: 'queued' } })
    } catch (error) {
      if (!controller.signal.aborted) dispatch({ type: 'update', chatId, id, patch: {
        status: 'failed', error: `${errorMessage(error)} Если ответ потерян, сообщение могло уйти. Проверьте Telegram перед повторной отправкой.`,
      } })
    }
  }, [api])

  return { state, dispatch, send, status, connectionError, reconnect: () => setRestart((value) => value + 1) }
}
