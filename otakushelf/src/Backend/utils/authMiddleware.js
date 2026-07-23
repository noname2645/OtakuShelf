import { error } from './responseHandler.js';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return error(res, 'Access denied. No token provided.', 401);
  }

  try {
    const { verifyAccessToken } = await import('../services/authService.js');
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return error(res, 'Token expired. Please refresh.', 401);
    }

    req.user = decoded;

    const user = await User.findById(decoded.id);
    if (!user) {
      return error(res, 'User no longer exists.', 401);
    }
    req.fullUser = user;

    next();
  } catch (err) {
    console.error('Auth Error:', err.message);
    return error(res, 'Invalid token.', 401);
  }
};

export const authorizeUser = (req, res, next) => {
  const requestedUserId = req.params.userId || req.body.userId;

  if (!req.user || !req.user.id) {
    return error(res, 'Unauthorized.', 401);
  }

  if (requestedUserId && requestedUserId !== req.user.id) {
    return error(res, 'Forbidden. You cannot access another user\'s data.', 403);
  }

  next();
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    req.fullUser = null;
    return next();
  }

  try {
    const { verifyAccessToken } = await import('../services/authService.js');
    const decoded = verifyAccessToken(token);
    if (decoded) {
      req.user = decoded;
      req.fullUser = await User.findById(decoded.id);
    } else {
      req.user = null;
      req.fullUser = null;
    }
  } catch {
    req.user = null;
    req.fullUser = null;
  }

  next();
};
