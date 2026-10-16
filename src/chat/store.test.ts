import { describe, expect, it } from 'vitest'
import { chatReducer, initialState } from './store'
import type { ChatState, Message } from './store'
import { notificationActions } from './events'

const message: Message = { id: 'one', chatId: '100', text: 'Привет', timestamp: 1000, direction: 'incoming', status: 'delivered' }

describe('conversation state', () => {
  it('deduplicates notification redelivery and unread counts', () => {
    const once = chatReducer(initialState, { type: 'message', message, name: 'Анна' })
    const twice = chatReducer(once, { type: 'message', message })
    expect(twice).toBe(once)
    expect(once.chats[0].unread).toBe(1)
    expect(chatReducer(once, { type: 'select', id: '100' }).chats[0].unread).toBe(0)
  })
  it('reuses an existing canonical chat and retains chronological order', () => {
    let state = chatReducer(initialState, { type: 'open', chat: { id: '100', name: 'Анна' } })
    state = chatReducer(state, { type: 'message', message: { ...message, timestamp: 3000 } })
    state = chatReducer(state, { type: 'message', message: { ...message, id: 'two', timestamp: 1000 } })
    state = chatReducer(state, { type: 'open', chat: { id: '100', name: 'Анна', phone: '77001234567' } })
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0].unread).toBe(0)
    expect(state.messages['100'].map((m) => m.id)).toEqual(['two', 'one'])
  })
  it('does not regress read status when a delayed sent event arrives', () => {
    const state = chatReducer(initialState, { type: 'message', message: { ...message, direction: 'outgoing', status: 'read' } })
    const next = chatReducer(state, { type: 'update', chatId: '100', id: 'one', patch: { status: 'sent' } })
    expect(next.messages['100'][0].status).toBe('read')
  })
  it('clears conversations and selection on reset', () => {
    const state = chatReducer(initialState, { type: 'message', message })
    expect(chatReducer(state, { type: 'reset' })).toEqual(initialState)
  })
})

describe('Telegram event routing', () => {
  it('routes text and link-bearing text by canonical chat ID', () => {
    const actions = notificationActions({ typeWebhook: 'incomingMessageReceived', idMessage: 'incoming', timestamp: 100,
      senderData: { chatId: '100', chatName: 'Анна' },
      messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'https://example.com' } },
    })
    const state = actions.reduce(chatReducer, initialState as ChatState)
    expect(state.messages['100'][0].text).toBe('https://example.com')
    expect(state.messages['100'][0].timestamp).toBe(100_000)
  })
  it('ignores unsupported events and incomplete messages without inventing content', () => {
    expect(notificationActions({ typeWebhook: 'incomingMessageReceived', senderData: { chatId: '100' }, messageData: { typeMessage: 'imageMessage' } })).toEqual([])
    expect(notificationActions({ typeWebhook: 'unknown' })).toEqual([])
  })
})
