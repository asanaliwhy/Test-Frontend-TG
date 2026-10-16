import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { ChatApi } from '../api/types'
import { errorMessage } from '../api/client'

export function SettingsNotice({ api }: { api: ChatApi }) {
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void api.getSettings(controller.signal).then((settings) => {
      if (controller.signal.aborted) return
      if (settings.webhookUrl) setNotice('Для получения ответов очистите webhookUrl в настройках инстанса. Внешний webhook сейчас занимает очередь уведомлений.')
      else if (settings.incomingWebhook !== 'yes') setNotice('Включите incomingWebhook в настройках инстанса, чтобы видеть входящие сообщения.')
      else if (settings.outgoingWebhook !== 'yes') setNotice('Включите outgoingWebhook в настройках инстанса, чтобы видеть статусы доставки.')
    }).catch((error: unknown) => { if (!controller.signal.aborted) setNotice(`Не удалось проверить настройки уведомлений. ${errorMessage(error)}`) })
    return () => controller.abort()
  }, [api])
  if (!notice) return null
  return <div className="notice" role="status">{notice} <a href="https://console.green-api.com/" target="_blank" rel="noreferrer">Настроить инстанс <ExternalLink size={11} /></a></div>
}
