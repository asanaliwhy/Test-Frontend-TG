import { useState } from 'react'
import { LogOut, MessageCircle, Plus, Search } from 'lucide-react'
import type { ChatState } from '../chat/store'
import type { ConnectionStatus } from '../chat/polling'
import { Avatar } from './Avatar'
import { Brand } from './Brand'

export function Sidebar({ state, status, demo, onSelect, onNew, onExit }: {
  state: ChatState; status: ConnectionStatus; demo: boolean
  onSelect: (id: string) => void; onNew: () => void; onExit: () => void
}) {
  const [search, setSearch] = useState('')
  const chats = state.chats.filter((chat) => `${chat.name} ${chat.phone ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()))
  const statusText = demo ? 'Демонстрация' : { connecting: 'Подключаемся', connected: 'Подключено', reconnecting: 'Переподключение', stopped: 'Нужна настройка' }[status]

  return <aside className="sidebar" aria-label="Список чатов">
    <header className="sidebar-brand"><Brand /><button type="button" className="icon-button" onClick={onExit} aria-label="Выйти из чата" title="Выйти"><LogOut size={19} /></button></header>
    <div className="sidebar-heading"><h1>Сообщения <span>{state.chats.length}</span></h1><button className="icon-button new-chat-button" onClick={onNew} aria-label="Новый чат" title="Новый чат"><Plus size={22} /></button></div>
    <label className="search-field"><Search size={18} /><input type="search" placeholder="Поиск чатов" aria-label="Поиск чатов" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
    <nav className="chat-list" aria-label="Переписки">
      {chats.map((chat) => {
        const messages = state.messages[chat.id] ?? []
        const last = messages.at(-1)
        return <button key={chat.id} className={`chat-item${state.activeId === chat.id ? ' active' : ''}`} onClick={() => onSelect(chat.id)} aria-current={state.activeId === chat.id ? 'true' : undefined}>
          <Avatar name={chat.name} />
          <span className="chat-item-content"><span className="chat-item-top"><strong>{chat.name}</strong>{last && <time dateTime={new Date(last.timestamp).toISOString()}>{new Date(last.timestamp).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</time>}</span><span className="chat-item-bottom"><span>{last ? `${last.direction === 'outgoing' ? 'Вы: ' : ''}${last.text}` : 'Начните разговор'}</span>{chat.unread > 0 && <b aria-label={`${chat.unread} непрочитанных`}>{chat.unread}</b>}</span></span>
        </button>
      })}
      {chats.length === 0 && <div className="sidebar-empty"><MessageCircle size={29} /><strong>{search ? 'Чаты не найдены' : 'Здесь начнутся разговоры'}</strong><p>{search ? 'Попробуйте другое имя или номер.' : 'Создайте чат по номеру телефона.'}</p>{!search && <button className="button secondary" onClick={onNew}><Plus size={17} /> Новый чат</button>}</div>}
    </nav>
    <footer className="sidebar-footer"><span className={`connection-dot ${status}`} /><span role="status">{statusText}</span><span className="footer-api">GREEN-API</span></footer>
  </aside>
}
