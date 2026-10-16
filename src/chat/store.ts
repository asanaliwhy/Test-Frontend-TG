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
}
export const initialState: ChatState = { chats: [], messages: {}, activeId: null }
export type ChatAction =
  | { type: 'open'; chat: Omit<Chat, 'unread'> }
  | { type: 'select'; id: string | null }
  | { type: 'message'; message: Message; name?: string; phone?: string }
  | { type: 'update'; chatId: string; id: string; patch: Partial<Pick<Message, 'id' | 'status' | 'error'>> }
  | { type: 'reset' }

const order: Record<Delivery, number> = { sending: 0, queued: 1, sent: 2, delivered: 3, read: 4, failed: 5 }
export function advanceStatus(current: Delivery, next: Delivery): Delivery {
  return order[next] >= order[current] ? next : current
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'reset': return initialState
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
      const message = action.message
      const previous = state.messages[message.chatId] ?? []
      if (previous.some((item) => item.id === message.id)) return state
      const chat = state.chats.find((item) => item.id === message.chatId) ?? {
        id: message.chatId, name: action.name || action.phone || message.chatId, phone: action.phone, unread: 0,
      }
      const unread = message.direction === 'incoming' && state.activeId !== chat.id ? chat.unread + 1 : chat.unread
      return {
        ...state,
        chats: [{ ...chat, unread }, ...state.chats.filter((item) => item.id !== chat.id)],
        messages: { ...state.messages, [chat.id]: [...previous, message].sort((a, b) => a.timestamp - b.timestamp) },
      }
    }
    case 'update': {
      const messages = state.messages[action.chatId] ?? []
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.chatId]: messages.map((message) => message.id === action.id ? {
            ...message, ...action.patch,
            status: action.patch.status ? advanceStatus(message.status, action.patch.status) : message.status,
          } : message),
        },
      }
    }
  }
}
