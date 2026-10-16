import { useEffect, useRef, useState } from 'react'
import { ArrowDown, Check, CheckCheck, Clock3, TriangleAlert } from 'lucide-react'
import type { Delivery, Message } from '../chat/store'

const labels: Record<Delivery, string> = { sending: 'Отправляется', queued: 'В очереди GREEN-API', sent: 'Отправлено', delivered: 'Доставлено', read: 'Прочитано', failed: 'Не удалось подтвердить отправку' }

function DeliveryIcon({ status }: { status: Delivery }) {
  const Icon = status === 'failed' ? TriangleAlert : status === 'sending' || status === 'queued' ? Clock3 : status === 'delivered' || status === 'read' ? CheckCheck : Check
  return <span className={`delivery ${status}`} title={labels[status]} aria-label={labels[status]}><Icon size={14} strokeWidth={1.8} /></span>
}

export function Timeline({ messages, loading = false }: { messages: Message[]; loading?: boolean }) {
  const viewport = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const [below, setBelow] = useState(false)
  useEffect(() => {
    if (stick.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight
    else setBelow(true)
  }, [messages])

  function bottom() {
    if (viewport.current) viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' })
    stick.current = true
    setBelow(false)
  }

  return <div className="timeline-wrap"><div className="timeline" ref={viewport} role="log" aria-label="Сообщения" aria-live="polite" aria-relevant="additions" onScroll={() => {
    const node = viewport.current!
    stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100
    if (stick.current) setBelow(false)
  }}>
    {messages.length === 0 && !loading && <div className="first-message"><span>Нет загруженных текстовых сообщений</span><p>Напишите сообщение, чтобы продолжить разговор.</p></div>}
    {messages.map((message, index) => {
      const date = new Date(message.timestamp).toLocaleDateString('ru', { day: 'numeric', month: 'long' })
      const previous = messages[index - 1]
      const separator = !previous || new Date(previous.timestamp).toDateString() !== new Date(message.timestamp).toDateString()
      return <div className="message-group" key={message.id}>
        {separator && <div className="date-separator"><span>{date}</span></div>}
        <article className={`message ${message.direction}${message.status === 'failed' ? ' message-failed' : ''}`} aria-label={message.direction === 'outgoing' ? 'Ваше сообщение' : 'Входящее сообщение'}>
          <p>{message.text}</p><div className="message-meta"><time dateTime={new Date(message.timestamp).toISOString()}>{new Date(message.timestamp).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</time>{message.direction === 'outgoing' && <DeliveryIcon status={message.status} />}</div>
          {message.error && <p className="message-error">{message.error}</p>}
        </article>
      </div>
    })}
  </div>{below && <button className="scroll-bottom" onClick={bottom} aria-label="К новым сообщениям"><ArrowDown size={18} /> Новые сообщения</button>}</div>
}
