import { useRef, useState } from 'react'
import { LoaderCircle, Send } from 'lucide-react'
import { MAX_MESSAGE_LENGTH, validateMessage } from '../lib/validation'

export function Composer({ draft, onDraft, onSend, disabled }: {
  draft: string; onDraft: (value: string) => void; onSend: (text: string) => Promise<void>; disabled: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sending = useRef(false)
  const input = useRef<HTMLTextAreaElement>(null)

  async function send() {
    if (sending.current || disabled) return
    let text: string
    try { text = validateMessage(draft) }
    catch (error) { setError((error as Error).message); return }
    sending.current = true
    setBusy(true)
    setError('')
    // The outgoing bubble owns this text immediately; never discard later typing.
    onDraft('')
    try { await onSend(text) }
    finally { sending.current = false; setBusy(false); input.current?.focus() }
  }

  return <div className="composer-area">
    <form className="composer" onSubmit={(event) => { event.preventDefault(); void send() }}>
      <label className="sr-only" htmlFor="message-input">Сообщение</label>
      <textarea id="message-input" ref={input} rows={1} placeholder="Написать сообщение…" value={draft} disabled={disabled} onChange={(event) => { onDraft(event.target.value); setError('') }} onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() }
      }} aria-describedby="composer-help" />
      <button className="send-button" type="submit" disabled={disabled || busy || !draft.trim() || draft.length > MAX_MESSAGE_LENGTH} aria-label="Отправить сообщение" title="Отправить сообщение">{busy ? <LoaderCircle size={20} className="spin" /> : <Send size={20} />}</button>
    </form>
    <div className="composer-help" id="composer-help"><span>{error ? <span className="error" role="alert">{error}</span> : 'Enter — отправить · Shift + Enter — новая строка'}</span><span className={draft.length > MAX_MESSAGE_LENGTH ? 'error' : ''}>{draft.length > 0 && `${draft.length} / ${MAX_MESSAGE_LENGTH}`}</span></div>
  </div>
}
