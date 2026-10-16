import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Eye, EyeOff, KeyRound, LoaderCircle, MessageCircle, ShieldCheck } from 'lucide-react'
import { createApi, errorMessage } from '../api/client'
import type { ChatApi } from '../api/types'
import { validateCredentials } from '../lib/validation'
import { Brand } from './Brand'
import './connect.css'

export function ConnectScreen({ onConnect, onDemo }: { onConnect: (api: ChatApi) => void; onDemo: () => void }) {
  const [idInstance, setId] = useState('')
  const [apiTokenInstance, setToken] = useState('')
  const [apiUrl, setUrl] = useState('https://4100.api.green-api.com')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  async function connect(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    let api: ChatApi
    try { api = createApi(validateCredentials({ idInstance, apiTokenInstance, apiUrl })) }
    catch (error) { setError((error as Error).message); return }
    const current = new AbortController()
    controller.current = current
    setBusy(true)
    try {
      const result = await api.getState(current.signal)
      if (current.signal.aborted) return
      if (result?.stateInstance !== 'authorized') {
        setError('Инстанс не авторизован. Подключите Telegram в личном кабинете GREEN-API и попробуйте снова.')
        return
      }
      setToken('')
      onConnect(api)
    } catch (error) { if (!current.signal.aborted) setError(errorMessage(error)) }
    finally { if (!current.signal.aborted) setBusy(false) }
  }

  return <main className="connect-page">
    <header className="connect-header"><Brand /><a href="https://green-api.com/telegram/docs/" target="_blank" rel="noreferrer">Документация <ArrowRight size={15} /></a></header>
    <div className="connect-layout">
      <section className="connect-intro">
        <div className="intro-symbol"><MessageCircle size={44} strokeWidth={1.4} /><span /></div>
        <h1>Ближе к людям.<br /><span>В одном чате.</span></h1>
        <p>Ваш Telegram в простом интерфейсе. Подключите аккаунт, начните разговор и получайте ответы здесь.</p>
        <div className="intro-steps"><span><i>1</i> Подключитесь</span><span><i>2</i> Выберите контакт</span><span><i>3</i> Общайтесь</span></div>
        <div className="intro-note"><ShieldCheck size={20} /><span>Ключ доступа хранится только в памяти вкладки.<br />После выхода потребуется подключиться снова.</span></div>
      </section>
      <section className="connect-form-panel" aria-labelledby="connect-title">
        <div className="form-symbol"><KeyRound size={23} /></div>
        <h2 id="connect-title">Подключить Telegram</h2>
        <p className="muted">Введите данные Telegram-инстанса из <a href="https://console.green-api.com/" target="_blank" rel="noreferrer">личного кабинета GREEN-API</a>.</p>
        <form onSubmit={connect} aria-busy={busy}>
          <label className="field">ID инстанса<input value={idInstance} onChange={(e) => setId(e.target.value)} placeholder="Например, 4100000000" inputMode="numeric" autoComplete="off" required disabled={busy} /></label>
          <label className="field">API-токен<span className="password-field"><input aria-label="API-токен" type={visible ? 'text' : 'password'} value={apiTokenInstance} onChange={(e) => setToken(e.target.value)} placeholder="apiTokenInstance" autoComplete="off" spellCheck={false} required disabled={busy} /><button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Скрыть API-токен' : 'Показать API-токен'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          <details><summary>Адрес API</summary><label className="field"><span className="sr-only">Адрес API</span><input type="url" value={apiUrl} onChange={(e) => setUrl(e.target.value)} required disabled={busy} /><small>Скопируйте apiUrl вашего инстанса из личного кабинета.</small></label></details>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="button primary" disabled={busy} type="submit">{busy ? <><LoaderCircle size={18} className="spin" /> Подключаемся…</> : <>Подключиться <ArrowRight size={18} /></>}</button>
        </form>
        <div className="demo-divider"><span>Сначала посмотреть интерфейс</span></div>
        <button className="button secondary" type="button" onClick={onDemo} disabled={busy}>Открыть демо</button>
        <p className="demo-hint">Тестовая переписка без подключения к Telegram</p>
      </section>
    </div>
    <footer className="connect-footer"><span>Только текст. Всё для разговора.</span><span>React · TypeScript · GREEN-API</span></footer>
  </main>
}
