import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getMasterKey(): Buffer {
  const b64 = process.env.SECRETS_ENCRYPTION_KEY
  if (!b64) {
    throw new Error('SECRETS_ENCRYPTION_KEY is not set (32-byte key, base64-encoded)')
  }
  const key = Buffer.from(b64, 'base64')
  if (key.length !== KEY_LENGTH) {
    throw new Error('SECRETS_ENCRYPTION_KEY must decode to exactly 32 bytes')
  }
  return key
}

export function encryptSecret(plaintext: string): { ciphertext: string; iv: string } {
  const key = getMasterKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const combined = Buffer.concat([encrypted, tag])
  return {
    ciphertext: combined.toString('base64'),
    iv: iv.toString('base64'),
  }
}

export function decryptSecret(ciphertextB64: string, ivB64: string): string {
  const key = getMasterKey()
  const iv = Buffer.from(ivB64, 'base64')
  const combined = Buffer.from(ciphertextB64, 'base64')
  if (combined.length < TAG_LENGTH) {
    throw new Error('Invalid ciphertext')
  }
  const tag = combined.subarray(combined.length - TAG_LENGTH)
  const enc = combined.subarray(0, combined.length - TAG_LENGTH)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
