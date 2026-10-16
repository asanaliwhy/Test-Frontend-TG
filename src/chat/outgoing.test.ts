import { expect, it } from 'vitest'
import type { WebhookBody } from '../api/types'
import { notificationActions } from './events'
import { chatReducer, initialState } from './store'
import type { ChatState } from './store'

const phone: WebhookBody = {
  typeWebhook: 'outgoingMessageReceived', timestamp: 100, idMessage: 'remote',
  senderData: { chatId: '100', chatName: 'Контакт' },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Написано с телефона' } },
}
const reduceEvent = (state: ChatState, body: WebhookBody) => notificationActions(body).reduce(chatReducer, state)

it('shows a phone message as outgoing without increasing unread', () => {
  const state = reduceEvent(initialState, phone)
  expect(state.messages['100'][0]).toMatchObject({ text: 'Написано с телефона', direction: 'outgoing', status: 'sent' })
  expect(state.chats[0].unread).toBe(0)
  expect(reduceEvent(state, phone).messages['100']).toHaveLength(1)
})

it('routes phone messages with links in a group', () => {
  const state = reduceEvent(initialState, { ...phone, senderData: { chatId: '-200' },
    messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'https://example.com' } } })
  expect(state.messages['-200'][0]).toMatchObject({ text: 'https://example.com', direction: 'outgoing' })
})

it('deduplicates API echoes received after the send response', () => {
  let state = chatReducer(initialState, { type: 'message', message: { id: 'local', chatId: '100', text: 'Текст', timestamp: 100_000, direction: 'outgoing', status: 'sending' } })
  state = chatReducer(state, { type: 'update', chatId: '100', id: 'local', patch: { id: 'remote', status: 'queued' } })
  state = reduceEvent(state, { ...phone, typeWebhook: 'outgoingAPIMessageReceived' })
  expect(state.messages['100']).toHaveLength(1)
  expect(state.messages['100'][0].status).toBe('sent')
})

it('merges API echoes received before the send response without losing read status', () => {
  let state = chatReducer(initialState, { type: 'message', message: { id: 'local', chatId: '100', text: 'Текст', timestamp: 100_000, direction: 'outgoing', status: 'sending' } })
  state = reduceEvent(state, { ...phone, typeWebhook: 'outgoingAPIMessageReceived' })
  state = chatReducer(state, { type: 'update', chatId: '100', id: 'remote', patch: { status: 'read' } })
  state = chatReducer(state, { type: 'update', chatId: '100', id: 'local', patch: { id: 'remote', status: 'queued' } })
  expect(state.messages['100']).toHaveLength(1)
  expect(state.messages['100'][0]).toMatchObject({ id: 'remote', text: 'Текст', status: 'read' })
})

it('applies a delivery status that precedes the phone message', () => {
  let state = chatReducer(initialState, { type: 'update', chatId: '100', id: 'remote', patch: { status: 'read' } })
  state = reduceEvent(state, phone)
  expect(state.messages['100'][0].status).toBe('read')
  expect(state.earlyStatuses).toEqual({})
})

it('keeps genuine incoming replies marked as incoming', () => {
  const state = reduceEvent(initialState, { ...phone, typeWebhook: 'incomingMessageReceived' })
  expect(state.messages['100'][0].direction).toBe('incoming')
  expect(state.chats[0].unread).toBe(1)
})
