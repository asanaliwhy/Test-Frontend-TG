import type { HistoryMessage, RemoteChat } from '../api/types'
import type { Chat, Delivery, Message } from './store'

export function normalizeChats(chats: RemoteChat[]): Omit<Chat, 'unread'>[] {
  if (!Array.isArray(chats)) throw new Error('Invalid chat list')
  return chats.filter((chat) => typeof chat.chatId === 'string' && chat.chatId).map((chat) => ({
    id: chat.chatId, name: chat.name || chat.username || (chat.phoneNumber ? `+${chat.phoneNumber}` : chat.chatId),
    ...(chat.phoneNumber ? { phone: String(chat.phoneNumber) } : {}),
  }))
}

export function normalizeHistory(messages: HistoryMessage[], chatId: string): Message[] {
  if (!Array.isArray(messages)) throw new Error('Invalid history')
  const statuses: Record<string, Delivery> = { read: 'read', delivered: 'delivered', sent: 'sent', failed: 'failed', pending: 'queued' }
  return messages.filter((message) => message.chatId === chatId && message.idMessage &&
    message.typeMessage === 'textMessage' && typeof message.textMessage === 'string' &&
    !message.isDeleted && Number.isFinite(message.timestamp) && ['incoming', 'outgoing'].includes(message.type))
    .map((message) => ({ id: message.idMessage, chatId, text: message.textMessage!, timestamp: message.timestamp * 1000,
      direction: message.type, status: message.type === 'incoming' ? 'delivered' : statuses[message.statusMessage ?? ''] ?? 'sent',
    }))
}
