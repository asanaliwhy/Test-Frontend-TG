import { describe, expect, it } from 'vitest'
import { MAX_MESSAGE_LENGTH, normalizePhone, validateCredentials, validateMessage } from './validation'

describe('international phone numbers', () => {
  it('normalizes human formatting without inventing a country code', () => {
    expect(normalizePhone(' +7 (700) 123-45-67 ')).toBe('77001234567')
    expect(normalizePhone('+44 20 7946 0958')).toBe('442079460958')
  })
  it.each(['123', '00012345678', '+7700abc12345', '@someone', '7+7001234567', '9999999999999999'])('rejects malformed number %s', (value) => {
    expect(() => normalizePhone(value)).toThrow()
  })
})

describe('runtime credentials', () => {
  const valid = { idInstance: '4100000000', apiTokenInstance: 'runtime_token_12345', apiUrl: 'https://4100.api.green-api.com/' }
  it('normalizes whitespace and trailing slash', () => {
    expect(validateCredentials({ ...valid, idInstance: ` ${valid.idInstance} ` })).toEqual({ ...valid, apiUrl: 'https://4100.api.green-api.com' })
  })
  it.each(['http://4100.api.green-api.com', 'https://api.green-api.com.attacker.test', 'https://example.com', 'https://x@api.green-api.com', 'https://api.green-api.com/path', 'https://api.green-api.com?token=secret', 'https://api.green-api.com:8443'])('rejects credentials being sent to %s', (apiUrl) => {
    expect(() => validateCredentials({ ...valid, apiUrl })).toThrow()
  })
  it('rejects invalid instance IDs and empty tokens', () => {
    expect(() => validateCredentials({ ...valid, idInstance: 'abc' })).toThrow()
    expect(() => validateCredentials({ ...valid, apiTokenInstance: '' })).toThrow()
  })
})

describe('Telegram text limits', () => {
  it('preserves intentional spacing and line breaks', () => expect(validateMessage('  Привет\n🙂  ')).toBe('  Привет\n🙂  '))
  it('accepts exactly the limit and rejects larger or blank text', () => {
    expect(validateMessage('a'.repeat(MAX_MESSAGE_LENGTH))).toHaveLength(MAX_MESSAGE_LENGTH)
    expect(() => validateMessage('a'.repeat(MAX_MESSAGE_LENGTH + 1))).toThrow()
    expect(() => validateMessage(' \n ')).toThrow()
  })
})
