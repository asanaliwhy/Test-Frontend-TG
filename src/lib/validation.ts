import type { Credentials } from '../api/types'

export function normalizePhone(value: string): string {
  const input = value.trim()
  if (!/^\+?[\d ()-]+$/.test(input)) throw new Error('Введите номер цифрами в международном формате, например +7 700 123 45 67.')
  const phone = input.replace(/\D/g, '')
  if (!/^[1-9]\d{6,14}$/.test(phone)) throw new Error('Номер должен содержать от 7 до 15 цифр и код страны.')
  return phone
}

export function validateCredentials(value: Credentials): Credentials {
  const idInstance = value.idInstance.trim()
  const apiTokenInstance = value.apiTokenInstance.trim()
  if (!/^\d{4,20}$/.test(idInstance)) throw new Error('ID инстанса должен содержать от 4 до 20 цифр.')
  if (!/^[a-zA-Z0-9_-]{8,256}$/.test(apiTokenInstance)) throw new Error('Проверьте API-токен: скопируйте его целиком из личного кабинета.')
  let url: URL
  try { url = new URL(value.apiUrl.trim()) }
  catch { throw new Error('Укажите корректный HTTPS-адрес API из личного кабинета.') }
  if (url.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*api\.green-api\.com$/.test(url.hostname) ||
      url.username || url.password || url.port || !['', '/'].includes(url.pathname) || url.search || url.hash) {
    throw new Error('Используйте HTTPS-адрес API на домене api.green-api.com из личного кабинета.')
  }
  return { idInstance, apiTokenInstance, apiUrl: url.origin }
}

export const MAX_MESSAGE_LENGTH = 4096

export function validateMessage(value: string): string {
  if (!value.trim()) throw new Error('Введите сообщение.')
  if (value.length > MAX_MESSAGE_LENGTH) throw new Error(`Максимум ${MAX_MESSAGE_LENGTH} символов в сообщении.`)
  return value
}
