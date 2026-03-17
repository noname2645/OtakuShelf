import jwt from 'jsonwebtoken';
import { error } from './responseHandler.js';
import User from '../models/User.js';

/**
 * Middleware to verify JWT token
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return error(res, 'Access denied. No token provided.', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Optional: Attach full user object to request
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return error(res, 'User no longer exists.', 401);
    }
    req.fullUser = user;
    
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expired. Please log in again.', 401);
    }
    return error(res, 'Invalid token.', 401);
  }
};

/**
 * Middleware to ensure the authenticated user is accessing their own resource
 */
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
