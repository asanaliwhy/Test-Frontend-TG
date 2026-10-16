import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, UserRoundPlus } from 'lucide-react'
import type { ChatApi } from '../api/types'
import type { Chat } from '../chat/store'
import { normalizePhone } from '../lib/validation'
import { errorMessage } from '../api/client'

export function NewChat({ api, chats, onOpen, onCancel }: {
  api: ChatApi; chats: Chat[]; onOpen: (chat: Omit<Chat, 'unread'>) => void; onCancel: () => void
}) {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    let normalized: string
    try { normalized = normalizePhone(phone) }
    catch (error) { setError((error as Error).message); return }
    const existing = chats.find((chat) => chat.phone === normalized)
    if (existing) { onOpen(existing); return }
    const current = new AbortController()
    controller.current = current
    setBusy(true)
    try {
      const result = await api.checkAccount(normalized, current.signal)
      if (current.signal.aborted) return
      if (result.status === false) { setError('Поиск временно недоступен. Проверьте авторизацию и лимиты инстанса.'); return }
      if (!result.exist || !result.chatId) { setError('Аккаунт не найден или номер скрыт настройками приватности Telegram. Проверьте номер.'); return }
      const known = chats.find((chat) => chat.id === result.chatId)
      onOpen({ id: result.chatId, name: known?.name ?? result.username ?? `+${normalized}`, phone: normalized })
    } catch (error) { if (!current.signal.aborted) setError(errorMessage(error)) }
    finally { if (!current.signal.aborted) setBusy(false) }
  }

  return <section className="new-chat-panel" aria-labelledby="new-chat-title">
    <header className="conversation-header"><button className="icon-button" onClick={onCancel} aria-label="Вернуться к чатам"><ArrowLeft size={21} /></button><strong>Новый разговор</strong></header>
    <div className="new-chat-body"><UserRoundPlus size={42} strokeWidth={1.5} /><h2 id="new-chat-title">Кому напишем?</h2><p>Введите номер телефона получателя.<br />Он должен пользоваться Telegram.</p>
      <form onSubmit={submit} aria-busy={busy}>
        <label className="field">Номер телефона<input type="tel" aria-label="Номер телефона" autoFocus autoComplete="tel" placeholder="+7 700 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={busy} required aria-describedby="phone-help" /><small id="phone-help">В международном формате, с кодом страны</small></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="button primary" disabled={busy}>{busy ? <><LoaderCircle size={18} className="spin" /> Ищем контакт…</> : <>Начать разговор <ArrowRight size={18} /></>}</button>
      </form>
    </div>
  </section>
}
