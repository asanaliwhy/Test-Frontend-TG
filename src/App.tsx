import { useState } from 'react'
import type { ChatApi } from './api/types'
import { ConnectScreen } from './components/ConnectScreen'
import { ChatWorkspace } from './components/ChatWorkspace'

export default function App() {
  const [session, setSession] = useState<{ api: ChatApi; demo: boolean } | null>(null)
  return session
    ? <ChatWorkspace api={session.api} demo={session.demo} onExit={() => setSession(null)} />
    : <ConnectScreen onConnect={(api) => setSession({ api, demo: false })} onDemo={() => {}} />
}
