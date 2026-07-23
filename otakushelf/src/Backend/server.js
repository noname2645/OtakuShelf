import express from 'express';
import cors from 'cors';
import compression from 'compression';
import http from 'http';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import animeRoutes from './routes/animeRoutes.js';
import anilistRoutes from './routes/anilistRoute.js';
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import MongoStore from 'connect-mongo';
import dotenv from "dotenv";
import xml2js from 'xml2js';
import fileUpload from 'express-fileupload';
import axios from 'axios';
import { WebSocketServer } from 'ws';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import aiChat from "./aiChat.js";
import nodemailer from 'nodemailer';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { OAuth2Client } from 'google-auth-library';
import { success, error } from './utils/responseHandler.js';
import { authenticateToken, authorizeUser } from './utils/authMiddleware.js';
import evaluateBadges from './utils/badgeEngine.js';
import BADGES from './utils/badgeDefinitions.js';
import badgeEvents from './utils/badgeEvents.js';

// Security packages
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';


const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: envFile });

console.log("Loaded env file:", envFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Validate critical environment variables
function validateEnvVars() {
  const required = ['JWT_SECRET', 'SESSION_SECRET', 'MONGO_URI'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 16) {
    console.error('❌ JWT_SECRET must be at least 16 characters');
    process.exit(1);
  }

  if (process.env.SESSION_SECRET.length < 16) {
    console.error('❌ SESSION_SECRET must be at least 16 characters');
    process.exit(1);
  }

  // Warn about short secrets in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET.length < 32) {
      console.warn('⚠️  JWT_SECRET is shorter than 32 characters — consider a longer secret in production');
    }
    if (process.env.SESSION_SECRET.length < 32) {
      console.warn('⚠️  SESSION_SECRET is shorter than 32 characters — consider a longer secret in production');
    }
  }

  // Warn about missing SMTP config (emails will fail but server can still run for core features)
  const smtpVars = ['SMTP_HOST', 'SMTP_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
  const missingSmtp = smtpVars.filter(key => !process.env[key]);
  if (missingSmtp.length > 0) {
    console.warn('⚠️  Missing SMTP environment variables (password reset / security emails will fail):', missingSmtp);
  }

  console.log('✅ Environment variables validated');
}

validateEnvVars();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET; // No fallback!
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// Standardized Response Middleware
app.use((req, res, next) => {
  res.sendSuccess = (message, data = null, statusCode = 200) => success(res, message, data, statusCode);
  res.sendError = (message, statusCode = 500, data = null) => error(res, message, statusCode, data);
  next();
});

// ─── Email Transporter (Reusable Singleton) ──────────────────────────────────
let emailTransporterPromise = null;

const getEmailTransporter = async () => {
  if (!emailTransporterPromise) {
    emailTransporterPromise = (async () => {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false, // false for 587 (STARTTLS), true for 465
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      try {
        await transporter.verify();
        console.log('✅ SMTP transporter verified — ready to send emails');
      } catch (verifyErr) {
        console.error('❌ SMTP transporter verification failed:', verifyErr.message);
        // Don't reset — createTransport itself might be fine; let sendMail attempt
      }
      return transporter;
    })();
  }
  try {
    return await emailTransporterPromise;
  } catch (err) {
    emailTransporterPromise = null;
    throw err;
  }
};

// ─── Security Email Helper ───────────────────────────────────────────────────
const sendSecurityEmail = async (email, type, data = {}) => {
  try {
    let subject = '🛡️ OtakuShelf — Security Alert';
    let title = 'Security Alert';
    let message = '';

    if (type === 'otp') {
      subject = `${data.action} Verification Code`;
      title = `${data.action} Verification`;
      message = `Your verification code is: <h2 style="letter-spacing:4px;color:#ec4899;font-size:32px;margin:16px 0">${data.otp}</h2> This code will expire in 10 minutes.`;
    } else if (type === 'mfa_enabled') {
      subject = '2FA Successfully Enabled';
      title = '2FA Enabled';
      message = 'Two-Factor Authentication has been successfully enabled on your account.';
    } else if (type === 'mfa_disabled') {
      subject = '2FA Successfully Disabled';
      title = '2FA Disabled';
      message = 'Two-Factor Authentication has been successfully disabled on your account. If you did not make this change, please contact support immediately.';
    } else if (type === 'password_changed') {
      subject = 'Password Changed';
      title = 'Password Changed';
      message = 'The password for your OtakuShelf account was recently changed. If you did not make this change, please contact support immediately.';
    } else if (type === 'account_deleted') {
      subject = 'Account Deleted';
      title = 'Account Deleted';
      message = 'Your account and all associated data have been permanently removed. We\'re sad to see you go!';
    }

    await (await getEmailTransporter()).sendMail({
      from: `"OtakuShelf" <${process.env.EMAIL_FROM || 'noreply@otakushelf.com'}>`,
      to: email,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d1a;color:#fff;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#ef4444,#ec4899);padding:32px;text-align:center">
            <h1 style="margin:0;font-size:28px">OtakuShelf</h1>
            <p style="margin:8px 0 0;opacity:0.85">${title}</p>
          </div>
          <div style="padding:32px">
            <p>Hey there, Otaku! 👋</p>
            <p>${message}</p>
            <p style="font-size:13px;opacity:0.6">If you didn't expect this alert, please check your account security immediately!</p>
            <hr style="border-color:rgba(255,255,255,0.1);margin:24px 0">
            <p style="font-size:12px;opacity:0.4;text-align:center">OtakuShelf · Your Anime Universe</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Email sending failed:', err);
    return false;
  }
};

// Security Headers (Helmet)
// CSP is always set — permissive in dev (allows Vite HMR), strict in production.
// This resolves ZAP alerts: CSP Not Set, Anti-clickjacking, X-Content-Type-Options.
app.use(helmet({
  contentSecurityPolicy: {
    directives: isProduction
      ? {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://graphql.anilist.co", "https://api.jikan.moe"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        }
      : {
          // Dev: allow everything needed for Vite HMR + local APIs
          defaultSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "ws:", "wss:", "http:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          imgSrc: ["'self'", "data:", "https:", "blob:", "http:"],
          connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
          fontSrc: ["'self'", "data:", "https:"],
        },
  },
  // X-Frame-Options: DENY — prevents clickjacking (always on)
  frameguard: { action: 'deny' },
  // X-Content-Type-Options: nosniff (always on)
  noSniff: true,
  // Referrer-Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Permissions-Policy: restrict sensitive browser features
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  hsts: isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false, // HSTS only in production (HTTPS required)
}));


// Request Size Limits (DoS Protection)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data Sanitization (Disabled due to middleware bugs with current Express version)
// app.use(mongoSanitize());
// app.use(xss());

// Compression
app.use(compression());

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.'
});



app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
  useTempFiles: false,
  createParentPath: true
}));

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://yesotakushelf.onrender.com",
  "https://otakushelf-uuvw.onrender.com"
];

// CORS Configuration (Stricter in production)
app.use(cors({
  origin: function (origin, callback) {
    // Allow no-origin (server-to-server or same origin) always
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
  optionsSuccessStatus: 200
}));

// Static files AFTER CORS - with explicit CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));


// MongoDB Connection with Pooling
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

app.use(session({
  secret: process.env.SESSION_SECRET, // No fallback!
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: isProduction ? 'none' : 'lax'
  },
  name: 'sessionId'
}));

app.use(passport.initialize());
app.use(passport.session());

// GeoIP lookup helper
async function getAreaFromIp(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return 'Localhost / Dev';
  }
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
    if (response.data && response.data.status === 'success') {
      return `${response.data.city}, ${response.data.country}`;
    }
  } catch (err) {
    console.error('GeoIP lookup failed:', err.message);
  }
  return 'Unknown Location';
}

// Log IP and Area inside session object automatically
app.use((req, res, next) => {
  if (req.session) {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (Array.isArray(ip)) ip = ip[0];
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    
    if (req.session.ip !== ip) {
      req.session.ip = ip;
      req.session.area = 'Locating...';
      
      getAreaFromIp(ip).then(area => {
        req.session.area = area;
        req.session.save((err) => {
          if (err) console.error('Session save error:', err);
        });
      }).catch(() => {
        req.session.area = 'Unknown Location';
        req.session.save();
      });
    }
  }
  next();
});

import User from './models/User.js';
import AnimeList from './models/AnimeList.js';


passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ email: profile.emails[0].value });
      if (!user) {
        user = new User({
          email: profile.emails[0].value,
          authType: "google",
          photo: profile.photos?.[0]?.value || null,
          name: profile.displayName || null
        });
        await user.save();
      } else {
        if (!user.photo && profile.photos?.[0]?.value) {
          user.photo = profile.photos[0].value;
          await user.save();
        }
        if (!user.name && profile.displayName) {
          user.name = profile.displayName;
          await user.save();
        }
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Route 1: GET /healthz — Health check
app.get('/healthz', (req, res) => res.sendSuccess('System is healthy', 'ok'));

// Wake-up / keep-alive ping endpoint (used by frontend for cold-start)
// Route 2: GET /api/ping — Connectivity test
app.get('/api/ping', (req, res) => {
  res.sendSuccess('Server is awake', { status: 'awake', timestamp: Date.now(), uptime: process.uptime() });
});

// Route 3: POST /auth/register — User registration
app.post("/auth/register", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const newUser = new User({
      email: normalizedEmail,
      password: hashed,
      authType: "local",
    });
    await newUser.save();
    res.sendSuccess("Registration successful!");
  } catch (err) {
    console.error('Registration error:', err);
    res.sendError("Server error", 500, err.message);
  }
});

// Route 4: POST /auth/login — User login
app.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.authType !== "local") {
      return res.status(400).json({ message: "This account uses Google login only" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Handle MFA Flow
    if (user.isMfaEnabled) {
      if (!req.body.mfaCode) {
        // Return 200 with requiresMfa flag so frontend can show input
        return res.status(200).json({
          success: true,
          message: "MFA code required",
          requiresMfa: true
        });
      }

      // Verify the code
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: req.body.mfaCode
      });

      if (!verified) {
        return res.status(400).json({ message: "Invalid or expired MFA code" });
      }
    }

    req.login(user, (err) => {
      if (err) {
        console.error("Session login error:", err);
        return res.sendError("Session error", 500);
      }

      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "24h" });

      res.sendSuccess("Login successful!", {
        user: {
          _id: user._id,
          email: user.email,
          authType: user.authType,
          photo: user.photo || null,
          name: user.name || null,
          isMfaEnabled: user.isMfaEnabled || false
        },
        token,
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.sendError("Server error", 500, err.message);
  }
});

// Route 5: GET /auth/google — Google OAuth initiate (Web flow)
app.get("/auth/google", (req, res, next) => {
  if (req.query.redirect) {
    req.session.oauthRedirect = req.query.redirect;
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

// Route 5b: POST /auth/google — Google ID token login (Mobile / React Native flow)
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post("/auth/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        authType: "google",
        photo: picture || null,
        name: name || null,
      });
      await user.save();
    } else {
      if (!user.photo && picture) {
        user.photo = picture;
        await user.save();
      }
      if (!user.name && name) {
        user.name = name;
        await user.save();
      }
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "24h" });

    res.sendSuccess("Login successful!", {
      user: {
        _id: user._id,
        email: user.email,
        authType: user.authType,
        photo: user.photo || null,
        name: user.name || null,
      },
      token,
    });
  } catch (err) {
    console.error("Google ID token verification error:", err);
    res.sendError("Invalid Google token", 401, err.message);
  }
});

// Route 6: GET /auth/google/callback — Google OAuth callback (Web flow)
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }),
  (req, res) => {
    try {
      const token = jwt.sign({ id: req.user._id }, JWT_SECRET, { expiresIn: "24h" });
      const redirectUrl = req.session.oauthRedirect;
      delete req.session.oauthRedirect;
      if (redirectUrl) {
        res.redirect(`${redirectUrl}?token=${token}`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
      }
    } catch (err) {
      console.error('Google callback error:', err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

// Route 7: GET /auth/me — Get current authenticated user
app.get("/auth/me", (req, res) => {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return User.findById(decoded.id).then(user => {
        if (!user) return res.sendError("Invalid token", 401);
        res.sendSuccess("User authenticated", {
          user: {
            _id: user._id,
            email: user.email,
            authType: user.authType,
            photo: user.photo || null,
            name: user.name || null
          }
        });
      });
    } catch (err) {
      return res.sendError("Invalid token", 401, err.message);
    }
  }

  if (req.isAuthenticated() && req.user) {
    return res.sendSuccess("User authenticated", { user: req.user });
  } else {
    return res.sendError("Not authenticated", 401);
  }
});

// Route 8: GET /auth/logout — User logout
app.get("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.sendError("Logout error", 500);
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.sendError("Session destroy error", 500);
      }

      res.clearCookie('sessionId');
      res.clearCookie('connect.sid');
      res.sendSuccess("Logged out successfully");
    });
  });
});

// ─── Forgot Password ───────────────────────────────────────────────────────
// Route 9: POST /auth/forgot-password — Send password reset email
app.post("/auth/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    // Always respond OK to prevent email enumeration
    if (!user || user.authType !== 'local') {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    // Generate a secure random token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

    try {
      await (await getEmailTransporter()).sendMail({
        from: `"OtakuShelf" <${process.env.EMAIL_FROM || 'noreply@otakushelf.com'}>`,
        to: normalizedEmail,
        subject: '🔑 OtakuShelf — Reset Your Password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d1a;color:#fff;border-radius:16px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#8b5cf6,#ec4899);padding:32px;text-align:center">
              <h1 style="margin:0;font-size:28px">OtakuShelf</h1>
              <p style="margin:8px 0 0;opacity:0.85">Password Reset Request</p>
            </div>
            <div style="padding:32px">
              <p>Hey there, Otaku! 👋</p>
              <p>We received a request to reset your password. Click the button below — this link expires in <strong>15 minutes</strong>.</p>
              <div style="text-align:center;margin:32px 0">
                <a href="${resetUrl}" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:16px">Reset Password</a>
              </div>
              <p style="font-size:13px;opacity:0.6">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
              <hr style="border-color:rgba(255,255,255,0.1);margin:24px 0">
              <p style="font-size:12px;opacity:0.4;text-align:center">OtakuShelf · Your Anime Universe</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();
      console.error('Failed to send password reset email:', emailErr);
      return res.status(500).json({ message: "Failed to send reset email. Please try again." });
    }

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: "Failed to send reset email. Please try again." });
  }
});

// ─── Reset Password ─────────────────────────────────────────────────────────
// Route 10: POST /auth/reset-password — Reset password with token
app.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({ message: "Token, email, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }, // Must not be expired
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token. Please request a new one." });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({ message: "Password reset successfully! You can now log in." });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: "Server error during password reset" });
  }
});

// Route 11: POST /api/profile/:userId/upload-photo — Upload profile photo
app.post("/api/profile/:userId/upload-photo", authenticateToken, authorizeUser, async (req, res) => {
  try {
    if (!req.files || !req.files.photo) {
      return res.status(400).json({ message: "No photo uploaded" });
    }

    const photo = req.files.photo;
    const { userId } = req.params;

    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(photo.mimetype)) {
      return res.status(400).json({ message: "Invalid image type. Use JPEG, PNG, or WebP" });
    }

    if (photo.size > 2 * 1024 * 1024) {
      return res.status(400).json({ message: "Image too large (max 2MB)" });
    }

    const fileExt = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeFileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filepath = path.join(uploadsDir, safeFileName);

    await photo.mv(filepath);

    const photoUrl = `/uploads/${safeFileName}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { photo: photoUrl },
      { new: true, select: '-password' }
    );

    res.sendSuccess("Photo uploaded successfully", {
      photo: photoUrl,
      user: updatedUser
    });

  } catch (err) {
    console.error('Photo upload error:', err);
    res.sendError("Error uploading photo", 500, process.env.NODE_ENV === 'development' ? err.message : undefined);
  }
});

// Route 12: POST /api/profile/:userId/upload-cover — Upload cover photo
app.post("/api/profile/:userId/upload-cover", authenticateToken, authorizeUser, async (req, res) => {
  try {
    if (!req.files || !req.files.cover) {
      return res.status(400).json({ message: "No cover image uploaded" });
    }

    const cover = req.files.cover;
    const { userId } = req.params;

    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(cover.mimetype)) {
      return res.status(400).json({ message: "Invalid image type. Use JPEG, PNG, or WebP" });
    }

    const fileExt = cover.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeFileName = `cover_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filepath = path.join(uploadsDir, safeFileName);

    await cover.mv(filepath);

    const coverUrl = `/uploads/${safeFileName}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { "profile.coverImage": coverUrl },
      { new: true, select: '-password' }
    );

    res.sendSuccess("Cover image uploaded successfully", {
      coverImage: coverUrl,
      user: updatedUser
    });

  } catch (err) {
    console.error('Cover upload error:', err);
    res.sendError("Error uploading cover image", 500);
  }
});

// Route 13: GET /api/profile/:userId — Get user profile
app.get("/api/profile/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userObj = user.toObject();

    if (userObj.photo && userObj.photo.startsWith('data:image')) {
      userObj.photo = null;
    }

    if (userObj.profile?.coverImage && userObj.profile.coverImage.startsWith('data:image')) {
      userObj.profile.coverImage = null;
    }

    const animeList = await AnimeList.findOne({ userId });

    let stats = {
      animeWatched: 0,
      hoursWatched: 0,
      currentlyWatching: 0,
      favorites: 0,
      animePlanned: 0,
      animeDropped: 0,
      totalEpisodes: 0,
      meanScore: 0
    };

    if (animeList) {
      stats.currentlyWatching = animeList.watching?.length || 0;
      stats.animeWatched = animeList.completed?.length || 0;
      stats.animePlanned = animeList.planned?.length || 0;
      stats.animeDropped = animeList.dropped?.length || 0;

      let totalEpisodes = 0;
      let totalRatings = 0;
      let ratingCount = 0;

      const allAnime = [
        ...(animeList.watching || []),
        ...(animeList.completed || []),
        ...(animeList.dropped || [])
      ];

      allAnime.forEach(anime => {
        totalEpisodes += anime.episodesWatched || 0;
        if (anime.userRating && anime.userRating > 0) {
          totalRatings += anime.userRating;
          ratingCount++;
        }
      });

      stats.totalEpisodes = totalEpisodes;
      stats.hoursWatched = Math.round(totalEpisodes * 24);
      stats.meanScore = ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : 0;
      stats.favorites = animeList.completed?.filter(a => a.userRating >= 4).length || 0;
    }

    const genres = await calculateGenreBreakdown(userId);

    const recentlyWatched = await getRecentlyWatched(userId, 4);

    const favoriteAnime = await getFavoriteAnime(userId, 6);

    const profileData = {
      _id: userObj._id,
      email: userObj.email,
      name: userObj.name || 'Anime Lover',
      photo: userObj.photo || null,
      isMfaEnabled: userObj.isMfaEnabled || false,
      settings: userObj.settings || {
        preferences: { titleLanguage: 'romaji', defaultLayout: 'grid', nsfwContent: false, autoplayTrailers: true, accentColor: '#ff6b6b' },
        notifications: { episodeAlerts: true, securityEmails: true, marketingEmails: false },
        privacy: { profileVisibility: 'public' }
      },
      profile: {
        username: userObj.profile?.username || `@user_${userObj._id.toString().slice(-6)}`,
        bio: userObj.profile?.bio || 'Anime enthusiast exploring new worlds through animation',
        joinDate: userObj.profile?.joinDate || userObj.createdAt,
        coverImage: userObj.profile?.coverImage || null,
        stats: { ...userObj.profile?.stats, ...stats },
        badges: userObj.profile?.badges || [],
        favoriteGenres: genres,
        preferences: userObj.profile?.preferences || {}
      },
      recentlyWatched,
      favoriteAnime,
      watchlist: animeList?.planned?.slice(0, 10) || []
    };

    res.sendSuccess("Profile fetched successfully", profileData);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.sendError("Error fetching profile", 500, err.message);
  }
});

// Route 14: PUT /api/profile/:userId — Update user profile
app.put("/api/profile/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const update = {};

    if (updateData.name) update.name = updateData.name;
    if (updateData.photo) update.photo = updateData.photo;

    if (updateData.profile) {
      update.$set = update.$set || {};
      if (updateData.profile.username) {
        const existingUser = await User.findOne({
          'profile.username': updateData.profile.username,
          _id: { $ne: userId }
        });

        if (existingUser) {
          return res.status(400).json({ message: "Username already taken" });
        }
        update.$set['profile.username'] = updateData.profile.username;
      }
      if (updateData.profile.bio !== undefined) update.$set['profile.bio'] = updateData.profile.bio;
      if (updateData.profile.preferences) update.$set['profile.preferences'] = updateData.profile.preferences;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      update,
      { new: true, select: '-password' }
    );

    res.sendSuccess("Profile updated successfully", updatedUser);
  } catch (err) {
    console.error('Profile update error:', err);
    res.sendError("Error updating profile", 500, err.message);
  }
});

// Route 15: GET /api/settings/:userId — Get user settings
app.get("/api/settings/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('settings');
    if (!user) return res.sendError("User not found", 404);
    res.sendSuccess("Settings retrieved", user.settings || {});
  } catch (err) {
    console.error('Get settings error:', err);
    res.sendError("Error retrieving settings", 500, err.message);
  }
});

// Route 16: PUT /api/settings/:userId — Update user settings
app.put("/api/settings/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { preferences, notifications, privacy } = req.body;
    const update = {};

    if (preferences) {
      if (preferences.titleLanguage !== undefined) update['settings.preferences.titleLanguage'] = preferences.titleLanguage;
      if (preferences.defaultLayout !== undefined) update['settings.preferences.defaultLayout'] = preferences.defaultLayout;
      if (preferences.nsfwContent !== undefined) update['settings.preferences.nsfwContent'] = preferences.nsfwContent;
      if (preferences.autoplayTrailers !== undefined) update['settings.preferences.autoplayTrailers'] = preferences.autoplayTrailers;
      if (preferences.accentColor !== undefined) update['settings.preferences.accentColor'] = preferences.accentColor;
    }
    if (notifications) {
      if (notifications.episodeAlerts !== undefined) update['settings.notifications.episodeAlerts'] = notifications.episodeAlerts;
      if (notifications.securityEmails !== undefined) update['settings.notifications.securityEmails'] = notifications.securityEmails;
      if (notifications.marketingEmails !== undefined) update['settings.notifications.marketingEmails'] = notifications.marketingEmails;
    }
    if (privacy) {
      if (privacy.profileVisibility !== undefined) update['settings.privacy.profileVisibility'] = privacy.profileVisibility;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: update },
      { new: true, select: 'settings' }
    );

    res.sendSuccess("Settings updated", updatedUser.settings);
  } catch (err) {
    console.error('Update settings error:', err);
    res.sendError("Error updating settings", 500, err.message);
  }
});

// Route 17: PUT /auth/change-password — Change password for local auth users
app.put("/auth/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.sendError("Current and new passwords are required", 400);
    }
    if (newPassword.length < 6) {
      return res.sendError("New password must be at least 6 characters", 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.sendError("User not found", 404);
    if (user.authType !== 'local') {
      return res.sendError("Password change is not available for Google accounts", 400);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.sendError("Current password is incorrect", 400);
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Send security alert
    if (user.settings?.notifications?.securityEmails !== false) {
      await sendSecurityEmail(user.email, 'password_changed');
    }

    res.sendSuccess("Password changed successfully");
  } catch (err) {
    console.error('Change password error:', err);
    res.sendError("Error changing password", 500, err.message);
  }
});

// Route 18: DELETE /auth/delete-account — Permanently delete user account
app.delete("/auth/delete-account", authenticateToken, async (req, res) => {
  try {
    const { password, otp } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.sendError("User not found", 404);

    if (!otp) {
      return res.sendError("Security OTP required for deletion", 400);
    }

    if (user.securityOtp !== otp || !user.securityOtpExpires || user.securityOtpExpires < new Date() || user.securityAction !== 'delete_account') {
      return res.sendError("Invalid or expired verification code", 400);
    }

    // For local auth, verify password before deletion
    if (user.authType === 'local') {
      if (!password) return res.sendError("Password is required to delete your account", 400);
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.sendError("Incorrect password", 400);
    }

    // Delete user
    await User.findByIdAndDelete(req.user.id);

    // Send alert
    if (user.settings?.notifications?.securityEmails !== false) {
      await sendSecurityEmail(user.email, 'account_deleted');
    }

    res.sendSuccess("Account deleted successfully");
  } catch (err) {
    console.error('Delete account error:', err);
    res.sendError("Error deleting account", 500, err.message);
  }
});

// Route 19: GET /api/settings/:userId/sessions — Get active sessions
app.get("/api/settings/:userId/sessions", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const db = mongoose.default.connection.db;
    const sessionsCollection = db.collection('sessions');

    const sessions = await sessionsCollection.find({}).toArray();

    const userSessions = sessions.filter(s => {
      try {
        const sessionData = typeof s.session === 'string' ? JSON.parse(s.session) : s.session;
        return sessionData?.passport?.user === req.params.userId;
      } catch { return false; }
    }).map(s => {
      let sessionData = {};
      try {
        sessionData = typeof s.session === 'string' ? JSON.parse(s.session) : s.session;
      } catch {}
      return {
        id: s._id,
        expires: s.expires,
        createdAt: s._id.toString().substring(0, 8),
        ip: sessionData?.ip || 'Unknown IP',
        area: sessionData?.area || 'Unknown Location'
      };
    });



    res.sendSuccess("Active sessions", { sessions: userSessions, count: userSessions.length });
  } catch (err) {
    console.error('Sessions fetch error:', err);
    res.sendError("Error fetching sessions", 500, err.message);
  }
});

// Route 20: DELETE /api/settings/:userId/sessions — Logout all other sessions
app.delete("/api/settings/:userId/sessions", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const db = mongoose.default.connection.db;
    const sessionsCollection = db.collection('sessions');

    const currentSessionId = req.sessionID;

    // Delete all sessions except the current one
    const result = await sessionsCollection.deleteMany({
      _id: { $ne: currentSessionId }
    });

    res.sendSuccess("All other sessions terminated", { deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Session deletion error:', err);
    res.sendError("Error terminating sessions", 500, err.message);
  }
});

// Route 21: GET /api/settings/:userId/export — Export user's anime data as JSON
app.get("/api/settings/:userId/export", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const animeList = await AnimeList.findOne({ userId: req.params.userId });
    const user = await User.findById(req.params.userId).select('-password -passwordResetToken -passwordResetExpires');

    const exportData = {
      exportedAt: new Date().toISOString(),
      platform: "OtakuShelf",
      user: {
        email: user.email,
        name: user.name,
        joinDate: user.profile?.joinDate || user.createdAt,
        stats: user.profile?.stats || {},
      },
      animeList: animeList ? {
        watching: animeList.watching || [],
        completed: animeList.completed || [],
        planToWatch: animeList.planToWatch || [],
        dropped: animeList.dropped || [],
        favorites: animeList.favorites || [],
      } : {}
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="otakushelf_export_${Date.now()}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    console.error('Export error:', err);
    res.sendError("Error exporting data", 500, err.message);
  }
});

// --- MFA & Security Routes --- //

// POST /api/auth/request-security-otp/:userId — Request OTP for sensitive actions
app.post("/api/auth/request-security-otp/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { action, password } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) return res.sendError("User not found", 404);

    // Verify password for local users before generating OTP
    if (user.authType === 'local') {
      if (!password) return res.sendError("Password required to verify identity", 400);
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.sendError("Incorrect password", 400);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.securityOtp = otp;
    user.securityOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.securityAction = action; // 'mfa_disable', 'delete_account'
    await user.save();

    // Send OTP via email
    let actionLabel = action === 'mfa_disable' ? 'MFA Disable' : 'Account Deletion';
    const sent = await sendSecurityEmail(user.email, 'otp', { otp, action: actionLabel });

    if (!sent) return res.sendError("Failed to send verification email. Please check your SMTP settings.", 500);

    res.sendSuccess(`Verification code sent to ${user.email}`);
  } catch (err) {
    console.error('Request OTP error:', err);
    res.sendError("Failed to generate verification code", 500, err.message);
  }
});

// GET /api/mfa/setup/:userId — Generate new MFA secret and QR code
app.get("/api/mfa/setup/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.sendError("User not found", 404);

    const secret = speakeasy.generateSecret({
      name: `OtakuShelf (${user.email})`
    });

    user.tempMfaSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.sendSuccess("MFA Setup started", {
      secret: secret.base32,
      qrCodeUrl
    });
  } catch (err) {
    res.sendError("Failed to generate MFA setup", 500, err.message);
  }
});

// POST /api/mfa/verify/:userId — Verify temp code and enable MFA
app.post("/api/mfa/verify/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user || !user.tempMfaSecret) {
      return res.status(400).json({ message: "MFA setup not initialized" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.tempMfaSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      user.mfaSecret = user.tempMfaSecret;
      user.isMfaEnabled = true;
      user.tempMfaSecret = null;
      await user.save();

      // Send security alert
      if (user.settings?.notifications?.securityEmails !== false) {
        await sendSecurityEmail(user.email, 'mfa_enabled');
      }

      res.sendSuccess("MFA successfully enabled");
    } else {
      res.status(400).json({ message: "Invalid MFA code" });
    }
  } catch (err) {
    res.sendError("Failed to verify MFA", 500, err.message);
  }
});

// POST /api/mfa/disable/:userId — Disable MFA (Requires Email OTP)
app.post("/api/mfa/disable/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) return res.sendError("User not found", 404);

    if (!otp) {
      return res.sendError("Security OTP required to disable MFA", 400);
    }

    if (user.securityOtp !== otp || !user.securityOtpExpires || user.securityOtpExpires < new Date() || user.securityAction !== 'mfa_disable') {
      return res.sendError("Invalid or expired verification code", 400);
    }

    user.mfaSecret = null;
    user.isMfaEnabled = false;
    user.tempMfaSecret = null;
    user.securityOtp = null;
    user.securityOtpExpires = null;
    user.securityAction = null;
    await user.save();

    // Send security alert
    if (user.settings?.notifications?.securityEmails !== false) {
      await sendSecurityEmail(user.email, 'mfa_disabled');
    }

    res.sendSuccess("MFA disabled successfully");
  } catch (err) {
    console.error('MFA disable error:', err);
    res.sendError("Failed to disable MFA", 500, err.message);
  }
});

// Route 22: POST /api/list/:userId — Add anime to list
app.post("/api/list/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { category, animeTitle, animeData } = req.body;
    const userId = req.params.userId;

    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    if (!["watching", "completed", "planned", "dropped"].includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    let list = await AnimeList.findOne({ userId });
    if (!list) {
      list = new AnimeList({ userId, watching: [], completed: [], planned: [], dropped: [] });
    }

    const allCategories = ['watching', 'completed', 'planned', 'dropped'];
    for (const cat of allCategories) {
      const index = list[cat].findIndex(item => item.title === animeTitle);
      if (index !== -1) {
        list[cat].splice(index, 1);
      }
    }

    const animeEntry = {
      title: animeTitle,
      animeId: animeData?.id || animeData?.mal_id || animeData?.malId || null,
      malId: animeData?.mal_id || animeData?.id || animeData?.malId || null,
      image: animeData?.images?.jpg?.large_image_url ||
        animeData?.coverImage?.large ||
        animeData?.coverImage?.extraLarge ||
        animeData?.image_url ||
        animeData?.image ||
        null,
      totalEpisodes: animeData?.totalEpisodes || animeData?.episodes || animeData?.episodeCount || 24,
      episodes: animeData?.totalEpisodes || animeData?.episodes || animeData?.episodeCount || 24,
      addedDate: new Date(),
      status: category,
      genres: animeData?.genres || []
    };

    if (category === 'watching') {
      animeEntry.startDate = new Date();
      animeEntry.episodesWatched = 0;
    }

    if (category === 'completed') {
      animeEntry.startDate = new Date();
      animeEntry.finishDate = new Date();
      animeEntry.episodesWatched = animeEntry.totalEpisodes;
    }

    if (animeData?.userRating) animeEntry.userRating = animeData.userRating;
    if (animeData?.notes) animeEntry.notes = animeData.notes;

    list[category].push(animeEntry);
    await list.save();
    res.sendSuccess("Anime list updated", list);

    // 🏅 Fire-and-forget badge evaluation after adding anime
    setImmediate(() => evaluateBadges(userId).catch(() => {}));
  } catch (err) {
    console.error('Update list error:', err);
    res.sendError("Error updating list", 500, err.message);
  }
});

const userConnections = new Map();

// Route 16: POST /api/list/import/mal — Import from MyAnimeList
app.post('/api/list/import/mal', authenticateToken, authorizeUser, async (req, res) => {
  try {
    if (!req.files || !req.files.malFile) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const malFile = req.files.malFile;
    const userId = req.body.userId;
    const clearExisting = req.body.clearExisting === 'true';

    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ success: false, message: 'Valid User ID is required' });
    }

    if (malFile.size > 50 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File too large (max 50MB)' });
    }

    // Parse XML
    let malData;
    try {
      const xmlContent = malFile.data.toString('utf-8');
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true, trim: true, normalize: true });
      malData = await parser.parseStringPromise(xmlContent);
    } catch (xmlError) {
      return res.status(400).json({ success: false, message: 'Invalid XML file. Please export from MyAnimeList.' });
    }

    if (!malData?.myanimelist) {
      return res.status(400).json({ success: false, message: 'Invalid MAL XML format' });
    }

    const rawAnimeList = malData.myanimelist.anime;
    if (!rawAnimeList) {
      return res.status(400).json({ success: false, message: 'No anime found in XML file' });
    }

    const malAnimeList = Array.isArray(rawAnimeList) ? rawAnimeList : [rawAnimeList];

    if (malAnimeList.length === 0) {
      return res.json({ status: 'success', message: 'No anime found in the file' });
    }

    // Respond immediately - background processing starts below
    res.status(202).json({
      status: 'accepted',
      message: `Import started for ${malAnimeList.length} anime. Watch for progress updates.`,
      total: malAnimeList.length
    });

    // Background Processing
    setImmediate(async () => {
      const userSockets = userConnections.get(userId);

      const sendProgress = (current, total, message, extra = {}) => {
        if (userSockets) {
          for (const ws of userSockets) {
            if (ws.readyState === 1) {
              try {
                ws.send(JSON.stringify({ type: 'progress', current, total, message, ...extra }));
              } catch (e) { /* ignore WS send errors */ }
            }
          }
        }
      };

      function getCategoryFromMalStatus(malStatus) {
        if (!malStatus) return 'planned';
        const s = String(malStatus).trim().toLowerCase();
        if (s === '1' || s.includes('watching') || s.includes('currently')) return 'watching';
        if (s === '2' || s.includes('completed') || s.includes('complete')) return 'completed';
        if (s === '4' || s.includes('dropped')) return 'dropped';
        return 'planned';
      }

      try {
        let animeList = await AnimeList.findOne({ userId });
        if (!animeList) {
          animeList = new AnimeList({ userId, watching: [], completed: [], planned: [], dropped: [] });
        }

        if (clearExisting) {
          animeList.watching = [];
          animeList.completed = [];
          animeList.planned = [];
          animeList.dropped = [];
          await animeList.save();
        }

        sendProgress(0, malAnimeList.length, 'Analyzing MyAnimeList data...');

        // 1. Extract all unique valid MAL IDs
        const malIds = malAnimeList
          .map(anime => {
            const idStr = anime.series_animedb_id || anime.series_anime_db_id || anime.series_animedbid;
            return idStr ? parseInt(idStr) : null;
          })
          .filter(id => id && !isNaN(id));

        // 2. Fetch metadata from AniList in bulk batches of 50
        const metadataMap = new Map();
        const BULK_BATCH_SIZE = 50;
        
        for (let i = 0; i < malIds.length; i += BULK_BATCH_SIZE) {
          const batchIds = malIds.slice(i, i + BULK_BATCH_SIZE);
          sendProgress(0, malAnimeList.length, `Fetching cover images: batch ${Math.floor(i / BULK_BATCH_SIZE) + 1}...`);

          // Stagger requests slightly to prevent AniList rate limits
          await new Promise(r => setTimeout(r, 350));

          try {
            const r = await axios.post('https://graphql.anilist.co', {
              query: `
                query ($idMals: [Int]) {
                  Page(page: 1, perPage: 50) {
                    media(idMal_in: $idMals, type: ANIME) {
                      idMal
                      coverImage {
                        extraLarge
                        large
                        medium
                      }
                      genres
                    }
                  }
                }
              `,
              variables: { idMals: batchIds }
            }, { headers: { 'Content-Type': 'application/json' }, timeout: 12000 });

            const mediaList = r.data?.data?.Page?.media || [];
            for (const media of mediaList) {
              if (media && media.idMal) {
                const img = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || null;
                metadataMap.set(media.idMal.toString(), {
                  image: img,
                  genres: media.genres || []
                });
              }
            }
          } catch (err) {
            console.error(`AniList bulk metadata fetch failed at index ${i}: ${err.message}`);
            if (err.response?.status === 429) {
              // Rate limited: wait 6 seconds and retry the same batch
              await new Promise(r => setTimeout(r, 6000));
              i -= BULK_BATCH_SIZE;
            }
          }
        }

        // Fallback fetch helper for individual items not found in AniList bulk query
        let lastJikanCall = 0;
        async function fetchSingleFallback(malId, title) {
          if (!malId) return { image: null, genres: [] };

          try {
            const now = Date.now();
            if (now - lastJikanCall < 1500) {
              await new Promise(r => setTimeout(r, 1500 - (now - lastJikanCall)));
            }
            lastJikanCall = Date.now();

            const r = await axios.get(`https://api.jikan.moe/v4/anime/${malId}`, {
              headers: { 'User-Agent': 'OtakuShelf/1.0', Accept: 'application/json' },
              timeout: 8000
            });
            const img = r.data?.data?.images?.jpg?.large_image_url ||
              r.data?.data?.images?.jpg?.image_url || null;
            const genres = r.data?.data?.genres?.map(g => g.name) || [];
            
            if (img) return { image: img, genres };
          } catch (err) {
            console.warn(`Fallback Jikan check failed for MAL ID ${malId}: ${err.message}`);
          }

          const encodedTitle = encodeURIComponent(title || 'Anime Poster');
          return {
            image: `https://placehold.co/300x400/667eea/ffffff?text=${encodedTitle}&font=roboto`,
            genres: []
          };
        }

        // 3. Process each anime and write to database
        sendProgress(0, malAnimeList.length, 'Saving anime entries to your list...');

        let processed = 0;
        let imported = 0;
        let skipped = 0;
        const categoryCounts = { watching: 0, completed: 0, planned: 0, dropped: 0 };

        for (let i = 0; i < malAnimeList.length; i++) {
          const malAnime = malAnimeList[i];
          processed++;

          try {
            const malId = malAnime.series_animedb_id || malAnime.series_anime_db_id || malAnime.series_animedbid;
            const title = malAnime.series_title || malAnime.series_title_eng || 'Unknown Title';
            const malStatus = malAnime.my_status || malAnime.my_status_string || malAnime.my_status_str || malAnime.my_status_code;
            const episodesWatched = parseInt(malAnime.my_watched_episodes || malAnime.my_watched_episodes_string || malAnime.my_watched_episodes_str || 0) || 0;
            const totalEpisodes = parseInt(malAnime.series_episodes || malAnime.series_episodes_string || malAnime.series_episodes_str || 24) || 24;
            const userRating = parseInt(malAnime.my_score || malAnime.my_score_string || malAnime.my_score_str || 0) || 0;
            const category = getCategoryFromMalStatus(malStatus);

            sendProgress(processed, malAnimeList.length, `Saving: ${title.substring(0, 30)}...`);

            if (!clearExisting && malId) {
              const exists = ['watching', 'completed', 'planned', 'dropped'].some(cat => 
                animeList[cat].some(a => a.malId === malId.toString())
              );
              if (exists) {
                skipped++;
                continue;
              }
            }

            // Retrieve from bulk map or fetch fallback
            const malIdStr = malId ? malId.toString() : '';
            let metadata = metadataMap.get(malIdStr);
            if (!metadata) {
              metadata = await fetchSingleFallback(malId, title);
            }

            const malStartDate = malAnime.my_start_date && malAnime.my_start_date !== '0000-00-00'
              ? new Date(malAnime.my_start_date) : null;
            const malFinishDate = malAnime.my_finish_date && malAnime.my_finish_date !== '0000-00-00'
              ? new Date(malAnime.my_finish_date) : null;

            const entry = {
              title,
              animeId: malId ? malId.toString() : `mal_${Date.now()}_${processed}`,
              malId: malIdStr || null,
              image: metadata.image,
              totalEpisodes, episodes: totalEpisodes, episodesWatched,
              status: category, genres: metadata.genres,
              userRating: userRating > 0 ? Math.round(userRating / 2) : undefined,
              addedDate: malStartDate || new Date(),
            };

            if (category === 'completed') {
              entry.finishDate = malFinishDate || malStartDate || new Date();
              entry.episodesWatched = totalEpisodes;
            }
            if (category === 'watching') entry.startDate = malStartDate || new Date();
            if (category === 'dropped') entry.droppedDate = malFinishDate || new Date();
            if (category === 'planned') entry.plannedDate = malStartDate || new Date();

            animeList[category].push(entry);
            categoryCounts[category]++;
            imported++;

          } catch (animeError) {
            console.error(`Failed to process anime entry: ${animeError.message}`);
          }

          // Save to database periodically
          if (processed % 15 === 0 || processed === malAnimeList.length) {
            try {
              await animeList.save();
              sendProgress(processed, malAnimeList.length, `Saved ${processed}/${malAnimeList.length} entries`);
            } catch (saveError) {
              console.error('Batch save error:', saveError.message);
            }
          }
        }

        // Final save + stats
        await animeList.save();

        try {
          const user = await User.findById(userId);
          if (user?.profile) {
            user.profile.stats = user.profile.stats || {};
            user.profile.stats.animeWatched = animeList.completed.length;
            user.profile.stats.currentlyWatching = animeList.watching.length;
            user.profile.stats.animePlanned = animeList.planned.length;
            user.profile.stats.animeDropped = animeList.dropped.length;
            await user.save();
          }
        } catch { /* non-critical */ }

        // 🏅 Award the mal_importer badge + re-evaluate all badges after import
        try { await evaluateBadges(userId, true); } catch { /* non-critical */ }

        const finalMsg = `Imported ${imported} anime (W:${categoryCounts.watching} C:${categoryCounts.completed} P:${categoryCounts.planned} D:${categoryCounts.dropped})${skipped ? `, skipped ${skipped} duplicates` : ''}`;
        sendProgress(malAnimeList.length, malAnimeList.length, finalMsg, { completed: true });

      } catch (bgError) {
        console.error('❌ Background MAL import error:', bgError);
        sendProgress(0, 0, `Import failed: ${bgError.message}`, { error: true });
      }
    });
  } catch (error) {
    console.error('❌ MAL import setup error:', error);
    res.sendError('Import failed', 500, error.message);
  }
});

// Route 17: GET /api/list/:userId — Get user's anime list
app.get("/api/list/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    let list = await AnimeList.findOne({ userId });

    if (!list) {
      list = new AnimeList({
        userId: userId,
        watching: [],
        completed: [],
        planned: [],
        dropped: []
      });
      await list.save();
    }

    if (!Array.isArray(list.watching)) list.watching = [];
    if (!Array.isArray(list.completed)) list.completed = [];
    if (!Array.isArray(list.planned)) list.planned = [];
    if (!Array.isArray(list.dropped)) list.dropped = [];

    res.sendSuccess("Anime list fetched successfully", list);
  } catch (err) {
    console.error('Fetch list error:', err);
    res.sendError("Error fetching list", 500, err.message);
  }
});

async function calculateGenreBreakdown(userId) {
  const animeList = await AnimeList.findOne({ userId });

  // Include ALL categories - not just completed and watching
  const allItems = [
    ...(animeList?.completed || []),
    ...(animeList?.watching || []),
    ...(animeList?.planned || []),
    ...(animeList?.dropped || [])
  ];

  if (!allItems.length) return [];

  const genreCount = {};
  const totalAnime = allItems.length;

  // Track which anime we've counted (to avoid duplicates)
  const countedAnime = new Set();

  // Count how many anime have each genre
  for (const anime of allItems) {
    // Skip if we've already counted this anime (prevent duplicates)
    const animeId = anime._id?.toString() || anime.animeId?.toString() || anime.malId?.toString();
    if (animeId && countedAnime.has(animeId)) {
      continue;
    }
    if (animeId) {
      countedAnime.add(animeId);
    }

    if (anime.genres && Array.isArray(anime.genres)) {
      // Track genres for this anime to avoid counting same genre twice per anime
      const genresForThisAnime = new Set();

      for (const genre of anime.genres) {
        const genreName = typeof genre === 'string' ? genre : genre?.name;
        if (genreName && !genresForThisAnime.has(genreName)) {
          genresForThisAnime.add(genreName);
          genreCount[genreName] = (genreCount[genreName] || 0) + 1;
        }
      }
    }
  }

  // Use the actual unique anime count
  const actualAnimeCount = countedAnime.size || totalAnime;

  if (Object.keys(genreCount).length === 0) return [];

  // Calculate percentage based on total unique anime count
  const genreBreakdown = Object.entries(genreCount)
    .map(([name, count]) => ({
      name,
      count,
      percentage: parseFloat(((count / actualAnimeCount) * 100).toFixed(1))
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return genreBreakdown;
}

async function getRecentlyWatched(userId, limit = 4) {
  const animeList = await AnimeList.findOne({ userId });
  if (!animeList) return [];

  const allAnime = [
    ...(animeList.watching || []),
    ...(animeList.completed || []),
  ].sort((a, b) => {
    const dateA = a.finishDate || a.addedDate;
    const dateB = b.finishDate || b.addedDate;
    return new Date(dateB) - new Date(dateA);
  }).slice(0, limit);

  return allAnime.map(anime => ({
    id: anime._id,
    title: anime.title,
    image: anime.image || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=250&fit=crop'
  }));
}

async function getFavoriteAnime(userId, limit = 4) {
  const animeList = await AnimeList.findOne({ userId });
  if (!animeList || !animeList.favorites) return [];

  const favorites = animeList.favorites
    .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate))
    .slice(0, limit);

  return favorites.map(anime => ({
    id: anime.animeId || anime.malId || anime._id,
    title: anime.title,
    image: anime.image || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=250&fit=crop',
    rating: anime.userRating || 0,
    genres: anime.genres || []
  }));
}

// Route 18: GET /api/profile/:userId/badges — Get user badges
app.get("/api/profile/:userId/badges", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const animeList = await AnimeList.findOne({ userId });

    const badges = [];

    const user = await User.findById(userId);
    if (user && new Date() - user.createdAt > 2 * 365 * 24 * 60 * 60 * 1000) {
      badges.push({
        title: 'Anime Veteran',
        description: 'Member for 2+ years',
        icon: '⚔️',
        earnedDate: new Date()
      });
    }

    if (animeList && animeList.completed && animeList.completed.length >= 50) {
      badges.push({
        title: 'Completionist',
        description: 'Completed 50+ anime',
        icon: '🏆',
        earnedDate: new Date()
      });
    }

    res.sendSuccess("Badges fetched successfully", badges);
  } catch (err) {
    console.error('Old badges fetch error:', err);
    res.sendError("Error fetching badges", 500, err.message);
  }
});

// ─── NEW Badge Routes ─────────────────────────────────────────────────────────

// Route: POST /api/badges/evaluate/:userId — Manually trigger badge evaluation
// Called from the profile page "Check Badges" button or on demand.
app.post("/api/badges/evaluate/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.sendError("Invalid user ID format", 400);
    }

    const result = await evaluateBadges(userId);
    res.sendSuccess(
      result.newBadges.length > 0
        ? `Awarded ${result.newBadges.length} new badge(s)!`
        : "No new badges yet — keep watching!",
      {
        newBadges  : result.newBadges,
        totalEarned: result.totalEarned,
      }
    );
  } catch (err) {
    console.error('Badge evaluate error:', err);
    res.sendError("Badge evaluation failed", 500, err.message);
  }
});

// Route: GET /api/badges/all — Return all 100 badge definitions (for locked badge UI)
// No auth required — definitions are public data.
app.get("/api/badges/all", (req, res) => {
  const definitions = BADGES.map(({ id, title, description, icon, rarity, category }) => ({
    id, title, description, icon, rarity, category,
  }));
  res.sendSuccess("All badge definitions", { badges: definitions, total: definitions.length });
});

// Route: POST /api/list/favorite/:userId — Toggle anime favorite status
app.post("/api/list/favorite/:userId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { animeId, isFavorite, animeData } = req.body;
    
    let list = await AnimeList.findOne({ userId });
    if (!list) {
      list = new AnimeList({ userId, favorites: [] });
    }

    const existingIndex = list.favorites.findIndex(a => (String(a.animeId) === String(animeId) || String(a.malId) === String(animeId) || String(a._id) === String(animeId)));
    
    if (isFavorite && existingIndex === -1) {
      // Add to favorites
      list.favorites.push({
        title: animeData?.title?.english || animeData?.title?.romaji || animeData?.title || 'Unknown',
        animeId: animeId,
        malId: animeData?.idMal || animeData?.malId || null,
        image: animeData?.coverImage?.large || animeData?.image || animeData?.coverImage?.extraLarge,
        totalEpisodes: animeData?.episodes || animeData?.totalEpisodes || 0,
        userRating: animeData?.userRating || 0,
        genres: animeData?.genres || [],
        addedDate: new Date()
      });
    } else if (!isFavorite && existingIndex !== -1) {
      // Remove from favorites
      list.favorites.splice(existingIndex, 1);
    }
    
    await list.save();
    res.sendSuccess("Favorite toggled successfully", { isFavorite });
  } catch (err) {
    res.sendError("Failed to toggle favorite", 500, err);
  }
});

// Route 19: PUT /api/list/:userId/:animeId — Update anime in list
app.put("/api/list/:userId/:animeId", authenticateToken, authorizeUser, async (req, res) => {

  try {
    const { episodesWatched, status, userRating } = req.body;
    const { userId, animeId } = req.params;

    const list = await AnimeList.findOne({ userId });
    if (!list) return res.status(404).json({ message: "List not found" });

    const categories = ["watching", "completed", "planned", "dropped"];
    let anime = null;
    let currentCategory = null;

    for (const cat of categories) {
      const found = list[cat].id(animeId);
      if (found) {
        anime = found;
        currentCategory = cat;
        break;
      }
    }

    if (!anime) {
      return res.status(404).json({ message: "Anime not found" });
    }

    if (episodesWatched !== undefined) anime.episodesWatched = episodesWatched;
    if (userRating !== undefined) anime.userRating = userRating;

    if (status && categories.includes(status) && status !== currentCategory) {
      list[currentCategory] = list[currentCategory].filter(
        a => a._id.toString() !== anime._id.toString()
      );

      if (status === "completed" && anime.episodesWatched === undefined) {
        anime.episodesWatched = anime.totalEpisodes || 24;
      }

      anime.status = status;
      list[status].push(anime);
    }

    await list.save();
    res.sendSuccess("Anime updated successfully", list);

    // 🏅 Fire-and-forget badge evaluation after updating anime
    setImmediate(() => evaluateBadges(userId).catch(() => {}));
  } catch (err) {
    console.error("PUT UPDATE ERROR:", err);
    res.sendError(err.message, 500);
  }
});

// Route 20: DELETE /api/list/:userId/:animeId — Remove anime from list
app.delete("/api/list/:userId/:animeId", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const list = await AnimeList.findOne({ userId: req.params.userId });

    if (!list) return res.status(404).json({ message: "List not found" });

    const categories = ['watching', 'completed', 'planned', 'dropped'];
    let removed = false;

    for (const category of categories) {
      const animeIndex = list[category].findIndex(item => item._id.toString() === req.params.animeId);
      if (animeIndex !== -1) {
        list[category].splice(animeIndex, 1);
        removed = true;
        break;
      }
    }

    if (!removed) {
      return res.status(404).json({ message: "Anime not found" });
    }

    await list.save();
    res.sendSuccess("Anime removed successfully", list);
  } catch (err) {
    console.error('Remove anime error:', err);
    res.sendError("Error removing anime", 500, err.message);
  }
});

// Backfill genres for existing anime using AniList API
// Route 21: POST /api/list/:userId/backfill-genres — Backfill genres via AniList
app.post("/api/list/:userId/backfill-genres", authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const animeList = await AnimeList.findOne({ userId });

    if (!animeList) {
      return res.status(404).json({ message: "List not found" });
    }

    let updated = 0;
    let failed = 0;
    const categories = ['watching', 'completed', 'planned', 'dropped'];

    console.log('Starting genre backfill...');

    for (const category of categories) {
      console.log(`Processing ${category}: ${animeList[category].length} anime`);

      for (const anime of animeList[category]) {
        // Skip if already has genres
        if (anime.genres && anime.genres.length > 0) {
          console.log(`Skipping ${anime.title} - already has genres`);
          continue;
        }

        try {
          // Use anime ID to fetch from AniList
          const animeId = anime.animeId || anime.malId;
          if (!animeId) {
            console.log(`Skipping ${anime.title} - no ID`);
            continue;
          }

          console.log(`Fetching genres for: ${anime.title} (ID: ${animeId})`);

          // Fetch from AniList GraphQL API
          const query = `
            query ($id: Int, $idMal: Int) {
              Media(id: $id, idMal: $idMal, type: ANIME) {
                genres
              }
            }
          `;

          const variables = anime.animeId && !anime.animeId.toString().startsWith('mal_')
            ? { id: parseInt(anime.animeId) }
            : anime.malId
              ? { idMal: parseInt(anime.malId) }
              : null;

          if (!variables) {
            console.log(`No valid ID for ${anime.title}`);
            failed++;
            continue;
          }

          const response = await axios.post('https://graphql.anilist.co', {
            query,
            variables
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });

          if (response.data?.data?.Media?.genres) {
            anime.genres = response.data.data.Media.genres;
            console.log(`✓ Updated ${anime.title} with ${anime.genres.length} genres:`, anime.genres);
            updated++;
          } else {
            console.log(`✗ No genres found for ${anime.title}`);
            failed++;
          }

          // Rate limiting - AniList allows 90 requests per minute
          // So we wait ~700ms between requests to be safe
          await new Promise(resolve => setTimeout(resolve, 700));

        } catch (error) {
          console.error(`Failed to fetch genres for ${anime.title}:`, error.message);
          failed++;

          // If rate limited, wait longer
          if (error.response?.status === 429) {
            console.log('Rate limited, waiting 60 seconds...');
            await new Promise(resolve => setTimeout(resolve, 60000));
          }
        }
      }
    }

    await animeList.save();
    console.log(`Backfill complete! Updated: ${updated}, Failed: ${failed}`);

    res.sendSuccess(`Updated genres for ${updated} anime (${failed} failed)`, {
      updated,
      failed
    });

  } catch (error) {
    console.error('Backfill error:', error);
    res.sendError("Error backfilling genres", 500, error.message);
  }
});

app.use("/api/list/:userId", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const list = await AnimeList.findOne({ userId });

    if (!list) {
      const newList = new AnimeList({
        userId,
        watching: [],
        completed: [],
        planned: [],
        dropped: []
      });
      await newList.save();
    }

    next();
  } catch (err) {
    console.error('List middleware error:', err);
    next();
  }
});

// Apply API Rate Limiter to all non-auth API routes
app.use('/api', apiLimiter);

// Router Mount A: /api/anime — Anime sections, search, details (animeRoutes.js)
app.use('/api/anime', animeRoutes);
// Router Mount B: /api/anilist — Hero trailers (anilistRoute.js)
app.use('/api/anilist', anilistRoutes);
// Router Mount C: /api/ai — AI chat, anime info (aiChat.js)
app.use("/api/ai", aiChat);

function cleanupOldUploads() {
  try {
    if (!fs.existsSync(uploadsDir)) return;

    const files = fs.readdirSync(uploadsDir);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const filepath = path.join(uploadsDir, file);
      try {
        const stats = fs.statSync(filepath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filepath);
          console.log(`Cleaned up old file: ${file}`);
        }
      } catch (err) {
        console.error(`Error cleaning up file ${file}:`, err);
      }
    });
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

setInterval(cleanupOldUploads, 24 * 60 * 60 * 1000);

// Health Check Endpoint
// Route 22: GET /health — WebSocket health check
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    environment: isProduction ? 'production' : 'development',
    checks: {
      database: 'unknown',
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };

  try {
    await mongoose.connection.db.admin().ping();
    health.checks.database = 'connected';
    res.sendSuccess("Health check passed", health);
  } catch (error) {
    health.status = 'ERROR';
    health.checks.database = 'disconnected';
    res.sendError("Health check failed", 503, health);
  }
});

// Handler: 404 — Catch-all for undefined routes
app.use((req, res) => {
  res.sendError("Route not found", 404);
});

// Handler: 500 — Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.sendError("Internal server error", 500, process.env.NODE_ENV === 'development' ? err.message : undefined);
});

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: '/ws',
  clientTracking: true
});

wss.on('connection', (ws, req) => {
  try {
    // Construct full URL using host header or dummy base to access search parameters properly
    const url = new URL(req.url, `ws://${req.headers.host || 'localhost'}`);
    const userId = url.searchParams.get('userId');

    if (userId) {
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId).add(ws);
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connected'
      }));
    }

    ws.on('close', () => {
      if (userId) {
        const sockets = userConnections.get(userId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) userConnections.delete(userId);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error for user:', userId, error);
    });

  } catch (error) {
    console.error('WebSocket connection error:', error);
  }
});

// Broadcast newly awarded badges to all connected tabs for a user
badgeEvents.on('awarded', (userId, newBadges) => {
  const sockets = userConnections.get(userId);
  if (sockets) {
    for (const ws of sockets) {
      if (ws.readyState === 1) {
        try {
          ws.send(JSON.stringify({ type: 'BADGES_EARNED', newBadges }));
        } catch (e) {}
      }
    }
  }
});

server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;



// Error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`WebSocket server running on path: /ws`);
  console.log(`Uploads directory: ${uploadsDir}`);
});