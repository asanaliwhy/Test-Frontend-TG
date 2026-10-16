import { useState } from 'react'
import type { ChatApi } from './api/types'
import { ConnectScreen } from './components/ConnectScreen'
import { ChatWorkspace } from './components/ChatWorkspace'
import { createDemo } from './chat/demo'
import type { ChatState } from './chat/store'

export default function App() {
  const [session, setSession] = useState<{ api: ChatApi; demo: boolean; seed?: ChatState } | null>(null)
  return session
    ? <ChatWorkspace api={session.api} demo={session.demo} seed={session.seed} onExit={() => setSession(null)} />
    : <ConnectScreen onConnect={(api) => setSession({ api, demo: false })} onDemo={() => { const demo = createDemo(); setSession({ api: demo.api, demo: true, seed: demo.state }) }} />
}
