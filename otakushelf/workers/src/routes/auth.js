import { Hono } from 'hono'
import { authenticateToken, authorizeUser } from '../middleware/auth.js'
import { createDb } from '../db/client.js'
import { createUserDb } from '../db/user.js'
import {
  hashPassword, comparePassword, generateOtp, generateVerificationToken,
  hasLocalProvider, hasGoogleProvider, addProvider, sanitizeUser,
  issueTokens, generateAccessToken, generateRefreshToken, hashRefreshToken, verifyAccessToken,
} from '../services/auth.js'
import { sendMail, buildEmailHtml } from '../services/email.js'
import { success, error } from '../utils/response.js'

const router = new Hono()

function setup(c) {
  const db = createDb(c.env)
  return { db, users: createUserDb(db), env: c.env }
}

async function issueTokenPair(userId, users, env) {
  return issueTokens(userId, users, env)
}

// ── POST /auth/register ──────────────────────────────────────────────────────
router.post('/register', async (c) => {
  const { db, users, env } = setup(c)
  const { email, password } = await c.req.json()
  if (!email || !password) return error(c, 'Email and password are required', 400)

  const normalizedEmail = email.toLowerCase().trim()
  const existing = await users.findByEmail(normalizedEmail)
  if (existing) return error(c, 'An account with this email already exists', 409)

  if (password.length < 6) return error(c, 'Password must be at least 6 characters', 400)

  const hashedPw = await hashPassword(password)
  const verificationToken = generateVerificationToken()
  const refreshToken = generateRefreshToken()
  const refreshTokenHash = await hashRefreshToken(refreshToken)

  const { insertedId } = await db.insertOne('users', {
    email: normalizedEmail,
    providers: [{ type: 'local', hashedPassword: hashedPw }],
    emailVerified: false,
    emailVerificationToken: verificationToken,
    refreshTokenHash,
    profile: { badges: [] },
    settings: {
      notifications: { securityEmails: true, episodeAlerts: true, marketingEmails: false },
    },
    createdAt: new Date(),
  })

  const workerUrl = new URL(c.req.url).origin
  const verificationLink = `${workerUrl}/auth/verify-email?token=${verificationToken}&email=${normalizedEmail}`
  const html = buildEmailHtml('Welcome to OtakuShelf', `
    <p>Thank you for joining OtakuShelf!</p>
    <p style="margin:20px 0">Please verify your email address to unlock all features:</p>
    <a href="${verificationLink}" style="display:inline-block;background:#FFD700;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Verify Email</a>
    <p style="color:#888;font-size:13px;margin-top:20px">Or copy this link:<br><span style="color:#aaa;word-break:break-all">${verificationLink}</span></p>
  `, { icon: '🎉' })
  // Fire-and-forget: don't block registration on email delivery
  sendMail({ to: normalizedEmail, subject: '🎉 OtakuShelf -- Verify Your Email', html }, env).catch(() => { })

  const accessToken = await generateAccessToken(insertedId, env)
  return success(c, 'Registration successful', { user: sanitizeUser({ _id: insertedId, email: normalizedEmail }), accessToken, refreshToken }, 201)
})

// ── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', async (c) => {
  const { users, env } = setup(c)
  const { email, password, mfaCode } = await c.req.json()
  if (!email || !password) return error(c, 'Email and password are required', 400)

  const normalizedEmail = email.toLowerCase().trim()
  const user = await users.findByEmail(normalizedEmail)
  if (!user) return error(c, 'Invalid email or password', 401)

  const localProvider = user.providers?.find(p => p.type === 'local')
  if (!localProvider) return error(c, 'Invalid email or password', 401)

  const valid = await comparePassword(password, localProvider.hashedPassword)
  if (!valid) return error(c, 'Invalid email or password', 401)

  if (user.isMfaEnabled && !mfaCode) {
    return success(c, 'MFA required', { requiresMfa: true }, 200)
  }

  if (user.isMfaEnabled && mfaCode) {
    const speakeasy = await import('speakeasy')
    const verified = speakeasy.default.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: mfaCode,
      window: 1,
    })
    if (!verified) return error(c, 'Invalid MFA code', 401)
  }

  const tokens = await issueTokenPair(user._id, users, env)
  return success(c, 'Login successful', { user: sanitizeUser(user), ...tokens })
})

let jwksCache = { jwks: null, ts: 0 }
const JWKS_TTL = 6 * 60 * 60 * 1000
const JWKS_CACHE_KEY = 'google:jwks'

async function fetchGoogleJWKS() {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs')
  return res.json()
}

async function getGoogleJWKS(env) {
  // 1. In-memory cache (fast path within the same isolate)
  if (jwksCache.jwks && Date.now() - jwksCache.ts < JWKS_TTL) return jwksCache.jwks

  // 2. Shared KV cache (persists across isolates)
  if (env.CACHE) {
    try {
      const cached = await env.CACHE.get(JWKS_CACHE_KEY, { type: 'json' })
      if (cached && Array.isArray(cached.keys) && cached.keys.length) {
        jwksCache = { jwks: cached, ts: Date.now() }
        return cached
      }
    } catch { /* fall through to network fetch */ }
  }

  // 3. Fetch from Google and cache it
  const jwks = await fetchGoogleJWKS()
  jwksCache = { jwks, ts: Date.now() }
  if (env.CACHE && Array.isArray(jwks.keys) && jwks.keys.length) {
    try { await env.CACHE.put(JWKS_CACHE_KEY, JSON.stringify(jwks), { expirationTtl: 86400 }) } catch { /* ignore */ }
  }
  return jwks
}

async function verifyGoogleIdToken(idToken, clientId, env) {
  const { createLocalJWKSet, jwtVerify } = await import('jose')

  const verifyWith = async (jwks) => {
    const JWKS = createLocalJWKSet(jwks)
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    })
    return payload
  }

  try {
    const jwks = await getGoogleJWKS(env)
    return await verifyWith(jwks)
  } catch {
    // Key may have rotated — refresh the cache and retry once before giving up
    jwksCache = { jwks: null, ts: 0 }
    if (env.CACHE) { try { await env.CACHE.delete(JWKS_CACHE_KEY) } catch { /* ignore */ } }
    const fresh = await fetchGoogleJWKS()
    jwksCache = { jwks: fresh, ts: Date.now() }
    return await verifyWith(fresh)
  }
}

async function exchangeGoogleCode(code, clientId, clientSecret, redirectUri) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google token exchange failed: ${res.status} ${body}`)
  }
  return res.json()
}

// Find-or-create a Google user, issuing a token pair with a single DB write
// (refresh token hash is stored in the same insert/update instead of a second write)
async function upsertGoogleUser(db, users, env, { email, sub, picture, name }) {
  const refreshToken = generateRefreshToken()
  const refreshTokenHash = await hashRefreshToken(refreshToken)

  const existing = await users.findByEmail(email)
  if (existing) {
    addProvider(existing, 'google', { id: sub })
    existing.photo = picture || existing.photo
    existing.name = name || existing.name
    existing.emailVerified = true
    await db.updateOne('users', { _id: db.oid(existing._id) }, {
      $set: { providers: existing.providers, photo: existing.photo, name: existing.name, emailVerified: true, refreshTokenHash },
    })
    const accessToken = await generateAccessToken(existing._id, env)
    return { user: existing, accessToken, refreshToken }
  }

  const { insertedId } = await db.insertOne('users', {
    email,
    providers: [{ type: 'google', id: sub }],
    photo: picture,
    name,
    emailVerified: true,
    refreshTokenHash,
    profile: { badges: [] },
    settings: { notifications: { securityEmails: true, episodeAlerts: true, marketingEmails: false } },
    createdAt: new Date(),
  })
  const user = { _id: insertedId, email, providers: [{ type: 'google', id: sub }], photo: picture, name, emailVerified: true }
  const accessToken = await generateAccessToken(insertedId, env)
  return { user, accessToken, refreshToken }
}

// ── POST /auth/google (ID token) ─────────────────────────────────────────────
router.post('/google', async (c) => {
  const { db, users, env } = setup(c)
  const { idToken } = await c.req.json()
  if (!idToken) return error(c, 'ID token is required', 400)

  try {
    const payload = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID, env)
    const { email, sub, picture, name } = payload
    const { user, accessToken, refreshToken } = await upsertGoogleUser(db, users, env, { email, sub, picture, name })
    return success(c, 'Google login successful', { user: sanitizeUser(user), accessToken, refreshToken })
  } catch (err) {
    console.error('Google token auth error:', err.message)
    return error(c, 'Google authentication failed: ' + err.message, 401)
  }
})

// ── GET /auth/google (redirect) ──────────────────────────────────────────────
router.get('/google', (c) => {
  const workerUrl = new URL(c.req.url).origin
  const redirectUri = `${workerUrl}/auth/google/callback`
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${c.env.GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile`
  return c.redirect(url)
})

// ── GET /auth/google/callback ────────────────────────────────────────────────
router.get('/google/callback', async (c) => {
  const { db, users, env } = setup(c)
  const { code } = c.req.query()
  if (!code) return c.redirect(`${env.FRONTEND_URL}/auth/callback?error=missing_code`)

  const workerUrl = new URL(c.req.url).origin
  const redirectUri = `${workerUrl}/auth/google/callback`
  try {
    const tokens = await exchangeGoogleCode(code, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri)
    const payload = await verifyGoogleIdToken(tokens.id_token, env.GOOGLE_CLIENT_ID, env)
    const { email, sub, picture, name } = payload
    const { user, accessToken, refreshToken } = await upsertGoogleUser(db, users, env, { email, sub, picture, name })
    return c.redirect(`${env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`)
  } catch (err) {
    console.error('Google callback error:', err.message)
    return c.redirect(`${env.FRONTEND_URL}/auth/callback?error=google_auth_failed`)
  }
})

// ── POST /auth/google/callback (code exchange from frontend) ────────────────
router.post('/google/callback', async (c) => {
  const { db, users, env } = setup(c)
  const { code } = await c.req.json()
  if (!code) return error(c, 'Authorization code is required', 400)

  const redirectUri = `${env.FRONTEND_URL}/auth/callback`
  try {
    const tokenRes = await exchangeGoogleCode(code, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri)
    const payload = await verifyGoogleIdToken(tokenRes.id_token, env.GOOGLE_CLIENT_ID, env)
    const { email, sub, picture, name } = payload
    const { user, accessToken, refreshToken } = await upsertGoogleUser(db, users, env, { email, sub, picture, name })
    return success(c, 'Google login successful', { user: sanitizeUser(user), accessToken, refreshToken })
  } catch (err) {
    console.error('Google code exchange error:', err.message)
    return error(c, 'Google authentication failed: ' + err.message, 401)
  }
})

// ── POST /auth/refresh ───────────────────────────────────────────────────────
router.post('/refresh', async (c) => {
  const { db, users, env } = setup(c)
  const { refreshToken } = await c.req.json()
  if (!refreshToken) return error(c, 'Refresh token is required', 400)

  const hashed = await hashRefreshToken(refreshToken)
  const user = await users.findByRefreshToken(hashed)
  if (!user) return error(c, 'Invalid refresh token', 401)

  const tokens = await issueTokenPair(user._id, users, env)
  return success(c, 'Token refreshed', tokens)
})

// ── GET /auth/me ─────────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (c) => {
  const { users, env } = setup(c)
  const userId = c.get('userId')
  const user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)
  return success(c, 'User fetched', { user: sanitizeUser(user) })
})

// ── GET /auth/logout ─────────────────────────────────────────────────────────
router.get('/logout', authenticateToken, async (c) => {
  const { users } = setup(c)
  const userId = c.get('userId')
  await users.setField(userId, 'refreshTokenHash', null)
  return success(c, 'Logged out')
})

// ── POST /auth/verify-email ──────────────────────────────────────────────────
router.post('/verify-email', async (c) => {
  const { db, users } = setup(c)
  const { token } = await c.req.json()
  if (!token) return error(c, 'Token is required', 400)

  const user = await users.findByEmailVerificationToken(token)
  if (!user) return error(c, 'Invalid or expired verification token', 400)

  await db.updateOne('users', { _id: db.oid(user._id) }, { $set: { emailVerified: true, emailVerificationToken: null } })
  return success(c, 'Email verified successfully')
})

// ── GET /auth/verify-email ───────────────────────────────────────────────────
router.get('/verify-email', async (c) => {
  const { db, users, env } = setup(c)
  const token = c.req.query('token')
  const email = c.req.query('email')
  if (!token || !email) return error(c, 'Token and email are required', 400)

  const user = await users.findByEmailAndVerificationToken(email, token)
  if (!user) return c.redirect(`${env.FRONTEND_URL}/login?error=invalid_verification`)

  await db.updateOne('users', { _id: db.oid(user._id) }, { $set: { emailVerified: true, emailVerificationToken: null } })
  return c.redirect(`${env.FRONTEND_URL}/login?verified=true`)
})

// ── POST /auth/forgot-password ───────────────────────────────────────────────
router.post('/forgot-password', async (c) => {
  const { db, users, env } = setup(c)
  const { email } = await c.req.json()
  if (!email) return error(c, 'Email is required', 400)

  const normalizedEmail = email.toLowerCase().trim()
  const user = await users.findByEmail(normalizedEmail)
  if (!user) return error(c, 'If that email exists, a reset code has been sent', 200)

  const otp = generateOtp()
  await db.updateOne('users', { _id: db.oid(user._id) }, {
    $set: { passwordResetToken: otp, passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000) },
  })

  const html = buildEmailHtml('Your Verification Code', `
    <p>We received a request to reset your password.</p>
    <p>Use the code below to reset your password. It expires in 10 minutes.</p>
  `, { isOtp: true, otpCode: otp })

  // Fire-and-forget: return immediately instead of blocking on email delivery
  sendMail({ to: normalizedEmail, subject: '🔑 OtakuShelf -- Your Verification Code', html }, env).catch(() => { })

  return success(c, 'Verification code sent')
})

// ── POST /auth/reset-password ────────────────────────────────────────────────
router.post('/reset-password', async (c) => {
  const { db, users } = setup(c)
  const { email, otp, password } = await c.req.json()

  if (!email || !otp || !password) return error(c, 'Email, OTP, and new password are required', 400)
  if (password.length < 6) return error(c, 'Password must be at least 6 characters', 400)

  const user = await users.findByEmailAndOtp(email, otp)
  if (!user) return error(c, 'Invalid or expired OTP', 400)

  const hashedPw = await hashPassword(password)
  const localProvider = user.providers?.find(p => p.type === 'local')
  if (localProvider) {
    localProvider.hashedPassword = hashedPw
  } else {
    user.providers.push({ type: 'local', hashedPassword: hashedPw })
  }

  await db.updateOne('users', { _id: db.oid(user._id) }, {
    $set: { providers: user.providers, passwordResetToken: null, passwordResetExpires: null },
  })

  return success(c, 'Password reset successfully')
})

// ── POST /auth/link-google ──────────────────────────────────────────────────
router.post('/link-google', authenticateToken, async (c) => {
  const { db, users, env } = setup(c)
  const { idToken } = await c.req.json()
  const userId = c.get('userId')

  const payload = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID, env)
  const { sub, email, picture, name } = payload

  let user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)

  addProvider(user, 'google', { id: sub })
  user.photo = picture || user.photo
  user.name = name || user.name
  user.emailVerified = true

  await db.updateOne('users', { _id: db.oid(userId) }, {
    $set: { providers: user.providers, photo: user.photo, name: user.name, emailVerified: true },
  })

  return success(c, 'Google account linked')
})

// ── POST /auth/set-password ─────────────────────────────────────────────────
router.post('/set-password', authenticateToken, async (c) => {
  const { db, users } = setup(c)
  const { password } = await c.req.json()
  const userId = c.get('userId')

  if (!password || password.length < 6) return error(c, 'Password must be at least 6 characters', 400)

  let user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)

  const hashedPw = await hashPassword(password)
  addProvider(user, 'local', { hashedPassword: hashedPw })

  await db.updateOne('users', { _id: db.oid(userId) }, {
    $set: { providers: user.providers },
  })

  return success(c, 'Password set successfully')
})

// ── PUT /auth/change-password ────────────────────────────────────────────────
router.put('/change-password', authenticateToken, async (c) => {
  const { db, users, env } = setup(c)
  const { currentPassword, newPassword } = await c.req.json()
  const userId = c.get('userId')

  const user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)

  const localProvider = user.providers?.find(p => p.type === 'local')
  if (!localProvider) return error(c, 'No local password set', 400)

  const valid = await comparePassword(currentPassword, localProvider.hashedPassword)
  if (!valid) return error(c, 'Current password is incorrect', 401)

  if (newPassword.length < 6) return error(c, 'New password must be at least 6 characters', 400)

  const hashedPw = await hashPassword(newPassword)
  localProvider.hashedPassword = hashedPw
  await db.updateOne('users', { _id: db.oid(userId) }, {
    $set: { providers: user.providers },
  })

  if (user.settings?.notifications?.securityEmails !== false) {
    const html = buildEmailHtml('Password Changed Successfully', `
      <p>Your password has been changed successfully.</p>
      <p>If you did not make this change, please reset your password immediately.</p>
    `)
    await sendMail({ to: user.email, subject: 'Password Changed Successfully', html }, env)
  }

  return success(c, 'Password changed successfully')
})

// ── DELETE /auth/delete-account ──────────────────────────────────────────────
router.delete('/delete-account', authenticateToken, async (c) => {
  const { db, users, env } = setup(c)
  const userId = c.get('userId')

  const user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)

  const localProvider = user.providers?.find(p => p.type === 'local')
  if (localProvider) {
    const { password } = await c.req.json()
    if (!password) return error(c, 'Password is required to delete account', 400)
    const valid = await comparePassword(password, localProvider.hashedPassword)
    if (!valid) return error(c, 'Password is incorrect', 401)
  }

  await db.deleteOne('animerists', { userId: { $oid: userId } })
  await users.deleteById(userId)

  if (user.settings?.notifications?.securityEmails !== false) {
    const html = buildEmailHtml('Account Deleted', `
      <p>Your OtakuShelf account has been permanently deleted.</p>
      <p>All your data has been removed from our systems.</p>
      <p>We're sorry to see you go!</p>
    `)
    await sendMail({ to: user.email, subject: 'Account Deleted', html }, env)
  }

  return success(c, 'Account deleted')
})

// ── POST /auth/request-security-otp/:userId ──────────────────────────────────
router.post('/request-security-otp/:userId', authenticateToken, authorizeUser, async (c) => {
  const { db, users, env } = setup(c)
  const userId = c.get('userId')
  const { action, password } = await c.req.json()

  if (!['mfa_disable', 'delete_account'].includes(action)) return error(c, 'Invalid action', 400)

  const user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)

  const localProvider = user.providers?.find(p => p.type === 'local')
  if (localProvider) {
    if (!password) return error(c, 'Password is required', 400)
    const { comparePassword } = await import('../services/password.js')
    const valid = await comparePassword(password, localProvider.hashedPassword)
    if (!valid) return error(c, 'Password is incorrect', 401)
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  await db.updateOne('users', { _id: db.oid(userId) }, {
    $set: {
      securityOtp: otp,
      securityOtpExpires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      securityAction: action,
    },
  })

  const actionLabel = action === 'mfa_disable' ? 'Disable 2FA' : 'Delete Account'
  const html = buildEmailHtml(`${actionLabel} Verification Code`, `
    <p>We received a request to ${actionLabel.toLowerCase()}.</p>
    <p>Use the code below to confirm this action. It expires in 10 minutes.</p>
  `, { isOtp: true, otpCode: otp })

  const sent = await sendMail({ to: user.email, subject: `${actionLabel} Verification Code`, html }, env)
  if (!sent) return error(c, 'Failed to send verification code', 500)

  return success(c, 'Verification code sent')
})

// ── POST /auth/revoke-tokens ─────────────────────────────────────────────────
router.post('/revoke-tokens', authenticateToken, async (c) => {
  const { users } = setup(c)
  const userId = c.get('userId')
  await users.setField(userId, 'refreshTokenHash', null)
  return success(c, 'All tokens revoked')
})

export default router
