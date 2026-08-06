const ITERATIONS = 600000
const LEGACY_ITERATIONS = 100000
const KEY_LENGTH = 256
const SALT_BYTES = 16

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

async function deriveBits(password, salt, iterations) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH
  )
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await deriveBits(password, salt, ITERATIONS)
  return `${ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(hash)}`
}

export async function comparePassword(password, stored) {
  if (!stored || !stored.includes(':')) return false

  const parts = stored.split(':')
  let iterations
  let saltHex
  let hashHex

  if (parts.length === 3) {
    // New format: iterations:salt:hash
    iterations = parseInt(parts[0], 10)
    saltHex = parts[1]
    hashHex = parts[2]
  } else if (parts.length === 2) {
    // Legacy format: salt:hash (100,000 iterations)
    iterations = LEGACY_ITERATIONS
    saltHex = parts[0]
    hashHex = parts[1]
  } else {
    return false
  }

  if (!iterations || iterations < 1) return false

  const salt = hexToBytes(saltHex)
  const hash = await deriveBits(password, salt, iterations)
  return bytesToHex(hash) === hashHex
}
