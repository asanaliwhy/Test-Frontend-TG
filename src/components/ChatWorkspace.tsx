import { useState } from 'react'
import { ArrowLeft, Info, MessageCircle, Plus, RefreshCw } from 'lucide-react'
import type { ChatApi } from '../api/types'
import { useChat } from '../chat/useChat'
import { Sidebar } from './Sidebar'
import { NewChat } from './NewChat'
import { Avatar } from './Avatar'
import { Timeline } from './Timeline'
import { Composer } from './Composer'
import './chat.css'

export function ChatWorkspace({ api, demo, onExit }: { api: ChatApi; demo: boolean; onExit: () => void }) {
  const { state, dispatch, send, status, connectionError, reconnect } = useChat(api)
  const [creating, setCreating] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [help, setHelp] = useState(false)
  const active = state.chats.find((chat) => chat.id === state.activeId)
  const messages = active ? state.messages[active.id] ?? [] : []

  return <main className="chat-page">
    <div className={`workspace${active || creating ? ' show-conversation' : ''}`}>
      <Sidebar state={state} status={status} demo={demo} onSelect={(id) => { dispatch({ type: 'select', id }); setCreating(false) }} onNew={() => setCreating(true)} onExit={onExit} />
      <section className="chat-surface" aria-label="Переписка">
        {demo && <div className="demo-banner"><span>Деморежим · сообщения не отправляются в Telegram</span><button onClick={onExit}>Подключить аккаунт</button></div>}
        {connectionError && <div className="notice" role="status">{connectionError} <button className="text-button" onClick={reconnect}><RefreshCw size={13} /> Повторить подключение</button></div>}
        {creating ? <NewChat api={api} chats={state.chats} onCancel={() => setCreating(false)} onOpen={(chat) => { dispatch({ type: 'open', chat }); setCreating(false) }} /> : active ? <>
          <header className="conversation-header"><button className="icon-button mobile-back" onClick={() => dispatch({ type: 'select', id: null })} aria-label="Все чаты"><ArrowLeft size={21} /></button><Avatar name={active.name} large /><div className="contact-heading"><h2>{active.name}</h2><p>{active.phone ? `+${active.phone}` : 'Telegram'}<span>Текстовая переписка</span></p></div><button className="icon-button help-button" onClick={() => setHelp(!help)} aria-label="Информация о переписке" aria-expanded={help}><Info size={21} /></button></header>
          {help && <div className="notice">Сообщения и черновики доступны до выхода или обновления вкладки. Статусы доставки зависят от настроек уведомлений GREEN-API.</div>}
          <Timeline key={active.id} messages={messages} />
          <Composer key={active.id} draft={drafts[active.id] ?? ''} onDraft={(value) => setDrafts((previous) => ({ ...previous, [active.id]: value }))} onSend={(text) => send(active.id, text)} disabled={status === 'stopped'} />
        </> : <div className="chat-empty"><MessageCircle size={62} strokeWidth={1.15} /><h2>Ваш следующий разговор</h2><p>Выберите чат слева или начните новый по номеру телефона получателя.</p><button className="button primary" onClick={() => setCreating(true)}><Plus size={17} /> Новый чат</button></div>}
      </section>
    </div>
  </main>
}
