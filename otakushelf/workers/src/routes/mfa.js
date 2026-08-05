import { Hono } from 'hono'
import { authenticateToken, authorizeUser } from '../middleware/auth.js'
import { createDb } from '../db/client.js'
import { createUserDb } from '../db/user.js'

import { success, error } from '../utils/response.js'

const router = new Hono()

function setup(c) {
  const db = createDb(c.env)
  return { db, users: createUserDb(db), env: c.env }
}

// ── GET /api/mfa/setup/:userId ──────────────────────────────────────────────
router.get('/setup/:userId', authenticateToken, authorizeUser, async (c) => {
  const { db, users } = setup(c)
  const userId = c.get('userId')

  const user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)

  const speakeasy = await import('speakeasy')
  const qrcode = await import('qrcode')

  const secret = speakeasy.default.generateSecret({
    name: `AnimeRegistry (${user.email})`,
  })

  await db.updateOne('users', { _id: db.oid(userId) }, {
    $set: { tempMfaSecret: secret.base32 },
  })

  const qrCodeUrl = await qrcode.default.toDataURL(secret.otpauth_url)
  return success(c, 'MFA setup generated', {
    secret: secret.base32,
    qrCode: qrCodeUrl,
  })
})

// ── POST /api/mfa/verify/:userId ─────────────────────────────────────────────
router.post('/verify/:userId', authenticateToken, authorizeUser, async (c) => {
  const { db, users, env } = setup(c)
  const userId = c.get('userId')
  const { token } = await c.req.json()

  const user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)
  if (!user.tempMfaSecret) return error(c, 'MFA setup not initiated', 400)

  const speakeasy = await import('speakeasy')
  const verified = speakeasy.default.totp.verify({
    secret: user.tempMfaSecret,
    encoding: 'base32',
    token,
    window: 1,
  })

  if (!verified) return error(c, 'Invalid MFA code', 400)

  await db.updateOne('users', { _id: db.oid(userId) }, {
    $set: { mfaSecret: user.tempMfaSecret, isMfaEnabled: true, tempMfaSecret: null },
  })

  if (user.settings?.notifications?.securityEmails !== false) {
    const html = buildEmailHtml('2FA Successfully Enabled', `
      <p>Two-factor authentication has been enabled on your account.</p>
      <p>If you did not enable this, please secure your account immediately.</p>
    `)
    await sendMail({ to: user.email, subject: '2FA Successfully Enabled', html }, env)
  }

  return success(c, 'MFA enabled successfully')
})

// ── POST /api/mfa/disable/:userId ────────────────────────────────────────────
router.post('/disable/:userId', authenticateToken, authorizeUser, async (c) => {
  const { db, users, env } = setup(c)
  const userId = c.get('userId')
  const { otp } = await c.req.json()

  const user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)

  if (!user.securityOtp || user.securityOtp !== otp) return error(c, 'Invalid OTP', 400)
  if (user.securityAction !== 'mfa_disable') return error(c, 'Invalid security action', 400)
  if (!user.securityOtpExpires || new Date(user.securityOtpExpires) < new Date()) return error(c, 'OTP expired', 400)

  await db.updateOne('users', { _id: db.oid(userId) }, {
    $set: { mfaSecret: null, isMfaEnabled: false, tempMfaSecret: null, securityOtp: null, securityOtpExpires: null, securityAction: null },
  })

  if (user.settings?.notifications?.securityEmails !== false) {
    const html = buildEmailHtml('2FA Successfully Disabled', `
      <p>Two-factor authentication has been disabled on your account.</p>
      <p>If you did not disable this, please secure your account immediately.</p>
    `)
    await sendMail({ to: user.email, subject: '2FA Successfully Disabled', html }, env)
  }

  return success(c, 'MFA disabled successfully')
})

export default router
