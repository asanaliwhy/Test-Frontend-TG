import { describe, expect, it } from 'vitest'
import type { HistoryMessage } from '../api/types'
import { normalizeChats, normalizeHistory } from './history'
import { chatReducer, initialState } from './store'

const remote: HistoryMessage = { chatId: '100', idMessage: 'old', type: 'incoming', timestamp: 10, typeMessage: 'textMessage', textMessage: 'Старое сообщение' }

describe('existing Telegram conversations', () => {
  it('loads users and groups with stable IDs and fallback names', () => {
    expect(normalizeChats([{ chatId: '100', name: 'Анна', phoneNumber: 77001234567 }, { chatId: '-200', name: 'Группа', phoneNumber: 0 }, { chatId: '300', username: '@contact' }]))
      .toEqual([{ id: '100', name: 'Анна', phone: '77001234567' }, { id: '-200', name: 'Группа' }, { id: '300', name: '@contact' }])
    expect(() => normalizeChats(null as never)).toThrow()
  })

  it('merges the remote list without discarding live chats or unread counts', () => {
    let state = chatReducer(initialState, { type: 'message', message: { id: 'live', chatId: '100', text: 'Новое', timestamp: 30_000, direction: 'incoming', status: 'delivered' } })
    state = chatReducer(state, { type: 'sync-chats', chats: [{ id: '100', name: 'Анна' }, { id: '200', name: 'Марк' }, { id: '200', name: 'Марк' }] })
    expect(state.chats).toHaveLength(2)
    expect(state.chats[0]).toMatchObject({ name: 'Анна', unread: 1 })
    expect(state.messages['100']).toHaveLength(1)
  })

  it('imports text and outgoing statuses while ignoring deleted media and other chats', () => {
    const messages = normalizeHistory([remote, { ...remote, idMessage: 'sent', type: 'outgoing', statusMessage: 'read' },
      { ...remote, idMessage: 'deleted', isDeleted: true }, { ...remote, idMessage: 'image', typeMessage: 'imageMessage' },
      { ...remote, idMessage: 'other', chatId: '200' }], '100')
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ text: 'Старое сообщение', timestamp: 10_000, direction: 'incoming' })
    expect(messages[1]).toMatchObject({ direction: 'outgoing', status: 'read' })
  })

  it('merges delayed history with live replies without duplicates or unread changes', () => {
    const live = { id: 'new', chatId: '100', text: 'Новый ответ', timestamp: 20_000, direction: 'incoming' as const, status: 'delivered' as const }
    let state = chatReducer(initialState, { type: 'message', message: live })
    state = chatReducer(state, { type: 'history', chatId: '100', messages: [...normalizeHistory([remote], '100'), live] })
    expect(state.messages['100'].map((m) => m.id)).toEqual(['old', 'new'])
    expect(state.chats[0].unread).toBe(1)
    const twice = chatReducer(state, { type: 'history', chatId: '100', messages: normalizeHistory([remote], '100') })
    expect(twice.messages['100']).toEqual(state.messages['100'])
  })

  it('does not regress delivery when history is older than a live status', () => {
    let state = chatReducer(initialState, { type: 'message', message: { id: 'old', chatId: '100', text: 'Текст', timestamp: 10_000, direction: 'outgoing', status: 'read' } })
    state = chatReducer(state, { type: 'history', chatId: '100', messages: normalizeHistory([{ ...remote, type: 'outgoing', statusMessage: 'delivered' }], '100') })
    expect(state.messages['100'][0].status).toBe('read')
  })
})
