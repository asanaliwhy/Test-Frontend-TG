import type { WebhookBody } from '../api/types'
import type { ChatAction, Delivery } from './store'

export function notificationActions(body: WebhookBody): ChatAction[] {
  if (body.typeWebhook === 'outgoingMessageStatus') {
    const statuses: Record<string, Delivery> = { sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed', pending: 'queued' }
    if (!body.chatId || !body.idMessage || !body.status || !statuses[body.status]) return []
    return [{ type: 'update', chatId: body.chatId, id: body.idMessage, patch: {
      status: statuses[body.status], ...(body.status === 'failed' ? { error: 'Telegram не доставил сообщение. Проверьте контакт и ограничения аккаунта.' } : {}),
    } }]
  }
  if (body.typeWebhook !== 'incomingMessageReceived') return []
  const chatId = body.senderData?.chatId
  const data = body.messageData
  const text = data?.typeMessage === 'textMessage' ? data.textMessageData?.textMessage
    : data?.typeMessage === 'extendedTextMessage' ? data.extendedTextMessageData?.text : undefined
  if (!chatId || !body.idMessage || typeof text !== 'string' || !Number.isFinite(body.timestamp)) return []
  return [{ type: 'message', name: body.senderData?.chatName || body.senderData?.senderName,
    phone: body.senderData?.senderPhoneNumber ? String(body.senderData.senderPhoneNumber) : undefined,
    message: { id: body.idMessage, chatId, text, timestamp: body.timestamp! * 1000, direction: 'incoming', status: 'delivered' },
  }]
}
