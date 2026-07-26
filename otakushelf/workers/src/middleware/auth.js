import { verifyAccessToken } from '../services/auth.js'

export const authenticateToken = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return c.json({ status: 'error', message: 'Access denied. No token provided.' }, 401)
  }

  const decoded = await verifyAccessToken(token, c.env)
  if (!decoded) {
    return c.json({ status: 'error', message: 'Token expired. Please refresh.' }, 401)
  }

  c.set('userId', decoded.id)
  await next()
}

export const authorizeUser = async (c, next) => {
  const userId = c.req.param('userId') || c.req.query('userId')
  const authUserId = c.get('userId')

  if (!authUserId) {
    return c.json({ status: 'error', message: 'Unauthorized.' }, 401)
  }

  if (userId && userId !== authUserId) {
    return c.json({ status: 'error', message: 'Forbidden. You cannot access another user\'s data.' }, 403)
  }

  await next()
}

export const requireUser = async (c, next) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ status: 'error', message: 'Unauthorized.' }, 401)
  }
  await next()
}
