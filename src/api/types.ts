export interface Credentials {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
}

export interface AccountResult {
  exist?: boolean
  chatId?: string
  username?: string
  phoneNumber?: number
  status?: boolean
  reason?: string
}

export interface WebhookBody {
  typeWebhook: string
  timestamp?: number
  idMessage?: string
  chatId?: string
  status?: string
  stateInstance?: string
  senderData?: {
    chatId: string
    chatName?: string
    senderName?: string
    senderPhoneNumber?: number
  }
  messageData?: {
    typeMessage: string
    textMessageData?: { textMessage: string }
    extendedTextMessageData?: { text: string }
  }
}

export interface Notification {
  receiptId: number
  body: WebhookBody
}

export interface InstanceSettings {
  webhookUrl?: string
  incomingWebhook?: string
  outgoingWebhook?: string
  outgoingMessageWebhook?: string
  outgoingAPIMessageWebhook?: string
}

export interface ChatApi {
  getState(signal?: AbortSignal): Promise<{ stateInstance: string }>
  getSettings(signal?: AbortSignal): Promise<InstanceSettings>
  checkAccount(phone: string, signal?: AbortSignal): Promise<AccountResult>
  sendMessage(chatId: string, message: string, signal?: AbortSignal): Promise<{ idMessage: string }>
  receive(signal?: AbortSignal): Promise<Notification | null>
  acknowledge(receiptId: number, signal?: AbortSignal): Promise<{ result: boolean }>
}
