export type Delivery = 'sending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export interface Message {
  id: string
  chatId: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
  status: Delivery
  error?: string
}
export interface Chat {
  id: string
  name: string
  phone?: string
  unread: number
}
export interface ChatState {
  chats: Chat[]
  messages: Record<string, Message[]>
  activeId: string | null
  earlyStatuses?: Record<string, { status?: Delivery; error?: string }>
}
export const initialState: ChatState = { chats: [], messages: {}, activeId: null }
export type ChatAction =
  | { type: 'open'; chat: Omit<Chat, 'unread'> }
  | { type: 'select'; id: string | null }
  | { type: 'message'; message: Message; name?: string; phone?: string }
  | { type: 'update'; chatId: string; id: string; patch: Partial<Pick<Message, 'id' | 'status' | 'error'>> }
  | { type: 'reset' }
  | { type: 'sync-chats'; chats: Omit<Chat, 'unread'>[] }
  | { type: 'history'; chatId: string; messages: Message[] }

const order: Record<Delivery, number> = { sending: 0, queued: 1, sent: 2, delivered: 3, read: 4, failed: 5 }
export function advanceStatus(current: Delivery, next: Delivery): Delivery {
  return order[next] >= order[current] ? next : current
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'reset': return initialState
    case 'sync-chats': {
      const chats = new Map(state.chats.map((chat) => [chat.id, chat]))
      for (const chat of action.chats) chats.set(chat.id, { ...chats.get(chat.id), ...chat, unread: chats.get(chat.id)?.unread ?? 0 })
      return { ...state, chats: [...chats.values()] }
    }
    case 'history': {
      const merged = new Map(action.messages.filter((message) => message.chatId === action.chatId).map((message) => [message.id, message]))
      for (const message of state.messages[action.chatId] ?? []) {
        const historical = merged.get(message.id)
        merged.set(message.id, historical ? { ...historical, ...message, status: advanceStatus(message.status, historical.status) } : message)
      }
      return { ...state, messages: { ...state.messages, [action.chatId]: [...merged.values()].sort((a, b) => a.timestamp - b.timestamp) } }
    }
    case 'open': {
      const exists = state.chats.some((chat) => chat.id === action.chat.id)
      return {
        ...state, activeId: action.chat.id,
        chats: exists ? state.chats.map((chat) => chat.id === action.chat.id ? { ...chat, ...action.chat, unread: 0 } : chat)
          : [{ ...action.chat, unread: 0 }, ...state.chats],
      }
    }
    case 'select': return {
      ...state, activeId: action.id,
      chats: state.chats.map((chat) => chat.id === action.id ? { ...chat, unread: 0 } : chat),
    }
    case 'message': {
      const key = `${action.message.chatId}:${action.message.id}`
      const early = state.earlyStatuses?.[key]
      const message = { ...action.message, ...early, status: early?.status ? advanceStatus(action.message.status, early.status) : action.message.status }
      const previous = state.messages[message.chatId] ?? []
      const existing = previous.find((item) => item.id === message.id)
      if (existing) {
        if (message.direction === 'outgoing' && existing.direction === 'outgoing' && advanceStatus(existing.status, message.status) !== existing.status) {
          return chatReducer(state, { type: 'update', chatId: message.chatId, id: message.id, patch: { status: message.status } })
        }
        return state
      }
      const earlyStatuses = { ...state.earlyStatuses }
      delete earlyStatuses[key]
      const chat = state.chats.find((item) => item.id === message.chatId) ?? {
        id: message.chatId, name: action.name || action.phone || message.chatId, phone: action.phone, unread: 0,
      }
      const unread = message.direction === 'incoming' && state.activeId !== chat.id ? chat.unread + 1 : chat.unread
      return {
        ...state, earlyStatuses,
        chats: [{ ...chat, unread }, ...state.chats.filter((item) => item.id !== chat.id)],
        messages: { ...state.messages, [chat.id]: [...previous, message].sort((a, b) => a.timestamp - b.timestamp) },
      }
    }
    case 'update': {
      const messages = state.messages[action.chatId] ?? []
      const key = `${action.chatId}:${action.patch.id ?? action.id}`
      if (!messages.some((message) => message.id === action.id)) {
        const earlyStatuses = { ...state.earlyStatuses }
        const previous = earlyStatuses[key]
        earlyStatuses[key] = {
          ...previous, ...action.patch,
          status: previous?.status && action.patch.status ? advanceStatus(previous.status, action.patch.status) : action.patch.status ?? previous?.status,
        }
        // Bound statuses for messages sent outside this session.
        const keys = Object.keys(earlyStatuses)
        if (keys.length > 500) delete earlyStatuses[keys[0]]
        return { ...state, earlyStatuses }
      }
      const earlyStatuses = { ...state.earlyStatuses }
      const early = earlyStatuses[key]
      delete earlyStatuses[key]
      const current = messages.find((message) => message.id === action.id)!
      const nextId = action.patch.id ?? current.id
      const echo = messages.find((message) => message.id === nextId && message.id !== current.id)
      const updated = {
        ...current, ...action.patch, ...early,
        status: [action.patch.status, early?.status, echo?.status].reduce<Delivery>(
          (status, next) => next ? advanceStatus(status, next) : status, current.status,
        ),
      }
      return {
        ...state, earlyStatuses,
        messages: {
          ...state.messages,
          [action.chatId]: [...messages.filter((message) => message.id !== action.id && message.id !== nextId), updated]
            .sort((a, b) => a.timestamp - b.timestamp),
        },
      }
    }
  }
}
