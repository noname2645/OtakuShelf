import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_BYTES = 64;

export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
};

export const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

export const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password, hashed) => {
  return bcrypt.compare(password, hashed);
};

export const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const hasLocalProvider = (user) => {
  return user.providers?.some(p => p.type === 'local');
};

export const hasGoogleProvider = (user) => {
  return user.providers?.some(p => p.type === 'google');
};

export const getProvider = (user, type) => {
  return user.providers?.find(p => p.type === type) || null;
};

export const addProvider = (user, type, data = {}) => {
  const existing = user.providers?.find(p => p.type === type);
  if (existing) {
    if (data.hashedPassword) existing.hashedPassword = data.hashedPassword;
    if (data.id) existing.id = data.id;
    return user;
  }
  const provider = { type };
  if (data.hashedPassword) provider.hashedPassword = data.hashedPassword;
  if (data.id) provider.id = data.id;
  user.providers.push(provider);
  return user;
};

export const sanitizeUser = (user) => {
  return {
    _id: user._id,
    email: user.email,
    photo: user.photo || null,
    name: user.name || null,
    authType: user.authType,
    providers: user.providers?.map(p => ({ type: p.type })) || [],
    isMfaEnabled: user.isMfaEnabled || false,
    emailVerified: user.emailVerified || false,
  };
};
