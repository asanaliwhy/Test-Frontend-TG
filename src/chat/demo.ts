import type { ChatApi, Notification } from '../api/types'
import type { ChatState, Message } from './store'
import { delay } from './polling'

/** Synthetic fixtures; no requests or messages leave the browser. */
export function createDemo(): { api: ChatApi; state: ChatState } {
  const now = Date.now()
  const chatId = 'demo-anna'
  const makeMessage = (id: string, text: string, outgoing: boolean, minutes: number): Message => ({
    id, chatId, text, direction: outgoing ? 'outgoing' : 'incoming', timestamp: now - minutes * 60_000, status: outgoing ? 'read' : 'delivered',
  })
  const state: ChatState = {
    activeId: chatId,
    chats: [
      { id: chatId, name: 'Анна Смирнова', unread: 0 },
      { id: 'demo-mark', name: 'Марк Волков', unread: 1 },
      { id: 'demo-daria', name: 'Дарья Соколова', unread: 0 },
    ],
    messages: {
      [chatId]: [
        makeMessage('a1', 'Привет! Как продвигается работа над чатом?', false, 18),
        makeMessage('a2', 'Привет! Всё готово к проверке. Подключение, отправка и получение сообщений уже на месте.', true, 16),
        makeMessage('a3', 'Отлично! А можно посмотреть, как выглядит переписка без API-ключей?', false, 13),
        makeMessage('a4', 'Да, для этого и нужен деморежим. Можно переключаться между чатами и писать сообщения — они останутся только здесь.', true, 11),
        makeMessage('a5', 'Очень удобно. Давай попробуем 🙂', false, 9),
      ],
      'demo-mark': [{ id: 'm1', chatId: 'demo-mark', text: 'Спасибо, всё получил. Посмотрю чуть позже!', direction: 'incoming', timestamp: now - 30 * 60_000, status: 'delivered' }],
      'demo-daria': [{ id: 'd1', chatId: 'demo-daria', text: 'Договорились, до встречи!', direction: 'outgoing', timestamp: now - 60 * 60_000, status: 'read' }],
    },
  }
  const queue: Notification[] = []
  let receipt = 1
  const api: ChatApi = {
    getState: async () => ({ stateInstance: 'authorized' }),
    getSettings: async () => ({ incomingWebhook: 'yes', outgoingWebhook: 'yes', webhookUrl: '' }),
    checkAccount: async (phone) => ({ exist: true, chatId: `demo-${phone}`, phoneNumber: Number(phone) }),
    sendMessage: async (id, message) => {
      const idMessage = crypto.randomUUID()
      queue.push({ receiptId: receipt++, body: { typeWebhook: 'outgoingMessageStatus', idMessage, chatId: id, status: 'read' } })
      queue.push({ receiptId: receipt++, body: {
        typeWebhook: 'incomingMessageReceived', idMessage: crypto.randomUUID(), timestamp: Date.now() / 1000,
        senderData: { chatId: id, chatName: state.chats.find((chat) => chat.id === id)?.name ?? 'Демо-контакт' },
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: `Демоответ: сообщение «${message.slice(0, 80)}${message.length > 80 ? '…' : ''}» получено. В реальном чате здесь появится ответ собеседника.` } },
      } })
      return { idMessage }
    },
    receive: async (signal) => { await delay(800, signal ?? new AbortController().signal); return signal?.aborted ? null : queue[0] ?? null },
    acknowledge: async (id) => { if (queue[0]?.receiptId === id) queue.shift(); return { result: true } },
  }
  return { api, state }
}
