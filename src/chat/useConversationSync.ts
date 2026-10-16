import { useEffect, useRef, useState } from 'react'
import type { Dispatch } from 'react'
import type { ChatApi } from '../api/types'
import { errorMessage } from '../api/client'
import type { ChatAction } from './store'
import { normalizeChats, normalizeHistory } from './history'

export function useConversationSync(api: ChatApi, activeId: string | null, dispatch: Dispatch<ChatAction>, enabled: boolean) {
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>(enabled ? 'loading' : 'ready')
  const [listError, setListError] = useState('')
  const [listRevision, setListRevision] = useState(0)
  const [historyRevision, setHistoryRevision] = useState(0)
  const [historyState, setHistoryState] = useState<Record<string, { loading: boolean; error: string }>>({})
  const loaded = useRef(new Set<string>())

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    setListStatus('loading')
    setListError('')
    void api.getChats(controller.signal).then((chats) => {
      if (controller.signal.aborted) return
      dispatch({ type: 'sync-chats', chats: normalizeChats(chats) })
      setListStatus('ready')
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      setListError(errorMessage(error))
      setListStatus('error')
    })
    return () => controller.abort()
  }, [api, enabled, dispatch, listRevision])

  useEffect(() => {
    if (!enabled || !activeId || loaded.current.has(activeId)) return
    const id = activeId
    const controller = new AbortController()
    setHistoryState((previous) => ({ ...previous, [id]: { loading: true, error: '' } }))
    void api.getChatHistory(id, controller.signal).then((messages) => {
      if (controller.signal.aborted) return
      dispatch({ type: 'history', chatId: id, messages: normalizeHistory(messages, id) })
      loaded.current.add(id)
      setHistoryState((previous) => ({ ...previous, [id]: { loading: false, error: '' } }))
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      setHistoryState((previous) => ({ ...previous, [id]: { loading: false, error: errorMessage(error) } }))
    })
    return () => controller.abort()
  }, [api, activeId, enabled, dispatch, historyRevision])

  return { listStatus, listError, reloadChats: () => setListRevision((value) => value + 1),
    history: activeId ? historyState[activeId] : undefined,
    retryHistory: () => setHistoryRevision((value) => value + 1),
  }
}
