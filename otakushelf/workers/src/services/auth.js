import { SignJWT, jwtVerify, importJWK } from 'jose'

const ALG = 'HS256'

async function getSecret(env) {
  return new TextEncoder().encode(env.JWT_SECRET)
}

export async function generateAccessToken(userId, env) {
  const secret = await getSecret(env)
  return new SignJWT({ id: userId })
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime('15m')
    .setIssuedAt()
    .sign(secret)
}

export async function verifyAccessToken(token, env) {
  try {
    const secret = await getSecret(env)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

export function generateRefreshToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(64))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashRefreshToken(token) {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export { hashPassword, comparePassword } from './password.js'

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function generateVerificationToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hasLocalProvider(user) {
  return user.providers?.some(p => p.type === 'local')
}

export function hasGoogleProvider(user) {
  return user.providers?.some(p => p.type === 'google')
}

export function getProvider(user, type) {
  return user.providers?.find(p => p.type === type) || null
}

export function addProvider(user, type, data = {}) {
  if (!user.providers) user.providers = []
  const existing = user.providers.find(p => p.type === type)
  if (existing) {
    if (data.hashedPassword) existing.hashedPassword = data.hashedPassword
    if (data.id) existing.id = data.id
    return user
  }
  const provider = { type }
  if (data.hashedPassword) provider.hashedPassword = data.hashedPassword
  if (data.id) provider.id = data.id
  user.providers.push(provider)
  return user
}

export function sanitizeUser(user) {
  const providers = user.providers?.map(p => ({ type: p.type })) || []
  const authType = providers.some(p => p.type === 'google') ? 'google' : 'local'
  return {
    _id: user._id,
    email: user.email,
    username: user.username || user.profile?.username || null,
    photo: user.photo || null,
    name: user.name || null,
    providers,
    authType,
    isMfaEnabled: user.isMfaEnabled || false,
    emailVerified: user.emailVerified || false,
  }
}

export async function issueTokens(userId, userDb, env) {
  const accessToken = await generateAccessToken(userId, env)
  const refreshToken = generateRefreshToken()
  const hashed = await hashRefreshToken(refreshToken)
  await userDb.setField(userId, 'refreshTokenHash', hashed)
  return { accessToken, refreshToken }
}
