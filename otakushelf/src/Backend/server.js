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
import { parse } from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import aiChat from "./aiChat.js";

// Security packages
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';


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

// Validate critical environment variables (FAIL FAST)
function validateEnvVars() {
  const required = ['JWT_SECRET', 'SESSION_SECRET', 'MONGO_URI'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }

  if (process.env.SESSION_SECRET.length < 32) {
    console.error('❌ SESSION_SECRET must be at least 32 characters');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
}

validateEnvVars();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET; // No fallback!
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development - enable in production with proper config
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  }
}));

// MongoDB Injection Protection
// Note: Temporarily disabled due to compatibility issue with Express version
// TODO: Implement manual input validation or upgrade express-mongo-sanitize
// app.use(mongoSanitize({
//   replaceWith: '_'
// }));

// Request Size Limits (DoS Protection)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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

// Apply rate limiters
// Note: Apply to specific routes instead of blanket /api/ to avoid conflicts
// app.use('/api/', apiLimiter);


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
    // In production, require origin header
    if (isProduction && !origin) {
      return callback(new Error('No origin header'), false);
    }
    // Allow localhost in development
    if (!isProduction && !origin) {
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

// Middleware already configured above with security settings

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

app.get('/healthz', (req, res) => res.send('ok'));

app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const newUser = new User({
      email,
      password: hashed,
      authType: "local",
    });
    await newUser.save();

    console.log('User registered successfully:', email);
    res.json({ message: "Registration successful!" });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
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

    req.login(user, (err) => {
      if (err) {
        console.error("Session login error:", err);
        return res.status(500).json({ message: "Session error" });
      }

      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "24h" });

      res.json({
        message: "Login successful!",
        user: {
          _id: user._id,
          email: user.email,
          authType: user.authType,
          photo: user.photo || null,
          name: user.name || null
        },
        token,
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }),
  (req, res) => {
    try {
      const token = jwt.sign({ id: req.user._id }, JWT_SECRET, { expiresIn: "24h" });
      console.log('Google auth successful for:', req.user.email);
      res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
    } catch (err) {
      console.error('Google callback error:', err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

app.get("/auth/me", (req, res) => {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return User.findById(decoded.id).then(user => {
        if (!user) return res.status(401).json({ message: "Invalid token" });
        res.json({
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
      return res.status(401).json({ message: "Invalid token", error: err.message });
    }
  }

  if (req.isAuthenticated() && req.user) {
    return res.json({ user: req.user });
  } else {
    return res.status(401).json({ message: "Not authenticated" });
  }
});

app.get("/auth/logout", (req, res) => {
  const userEmail = req.user ? req.user.email : 'unknown';

  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout error" });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ message: "Session destroy error" });
      }

      res.clearCookie('sessionId');
      res.clearCookie('connect.sid');
      console.log('User logged out successfully:', userEmail);
      res.json({ message: "Logged out successfully" });
    });
  });
});

app.post("/api/profile/:userId/upload-photo", async (req, res) => {
  try {
    if (!req.files || !req.files.photo) {
      return res.status(400).json({ message: "No photo uploaded" });
    }

    const photo = req.files.photo;
    const { userId } = req.params;

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

    res.json({
      success: true,
      message: "Photo uploaded successfully",
      photo: photoUrl,
      user: updatedUser
    });

  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({
      success: false,
      message: "Error uploading photo",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.post("/api/profile/:userId/upload-cover", async (req, res) => {
  try {
    if (!req.files || !req.files.cover) {
      return res.status(400).json({ message: "No cover image uploaded" });
    }

    const cover = req.files.cover;
    const { userId } = req.params;

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

    res.json({
      success: true,
      message: "Cover image uploaded successfully",
      coverImage: coverUrl,
      user: updatedUser
    });

  } catch (err) {
    console.error('Cover upload error:', err);
    res.status(500).json({
      success: false,
      message: "Error uploading cover image"
    });
  }
});

app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

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

    res.json(profileData);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: "Error fetching profile", error: err.message });
  }
});

app.put("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

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

    res.json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: "Error updating profile", error: err.message });
  }
});

app.post("/api/list/:userId", async (req, res) => {
  try {
    const { category, animeTitle, animeData } = req.body;
    const userId = req.params.userId;

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
    res.json({ message: "Anime list updated", list });
  } catch (err) {
    console.error('Update list error:', err);
    res.status(500).json({ message: "Error updating list", error: err.message });
  }
});

// FIXED: MAL Import Route with better error handling
app.post('/api/list/import/mal', async (req, res) => {
  console.log('🔵 MAL IMPORT REQUEST RECEIVED');

  // Initialize caching for this import session
  const jikanImageCache = new Map();
  let lastJikanRequest = 0;

  try {
    if (!req.files || !req.files.malFile) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const malFile = req.files.malFile;
    const userId = req.body.userId;
    const clearExisting = req.body.clearExisting === 'true';

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (malFile.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File too large (max 10MB)'
      });
    }

    const userWs = userConnections.get(userId);

    const sendProgress = (current, total, message) => {
      console.log(`📈 Progress: ${current}/${total} - ${message}`);

      if (userWs && userWs.readyState === 1) {
        try {
          userWs.send(JSON.stringify({
            type: 'progress',
            current: current,
            total: total,
            message: message,
            progress: `${current}/${total}`
          }));
        } catch (wsError) {
          console.error('WebSocket send error:', wsError.message);
        }
      }
    };

    console.log('Parsing XML file...');
    sendProgress(0, 0, 'Starting import...');

    let malData;
    try {
      const xmlContent = malFile.data.toString('utf-8');
      console.log('XML length:', xmlContent.length);

      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
        normalize: true
      });

      malData = await parser.parseStringPromise(xmlContent);
      console.log('✅ XML parsed successfully');
    } catch (xmlError) {
      console.error('❌ XML parsing failed:', xmlError.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid XML file. Please export from MyAnimeList.'
      });
    }

    if (!malData || !malData.myanimelist) {
      return res.status(400).json({
        success: false,
        message: 'Invalid MAL XML format'
      });
    }

    let rawAnimeList = malData.myanimelist.anime;
    if (!rawAnimeList) {
      return res.status(400).json({
        success: false,
        message: 'No anime found in XML file'
      });
    }

    const malAnimeList = Array.isArray(rawAnimeList) ? rawAnimeList : [rawAnimeList];

    console.log(`Found ${malAnimeList.length} anime entries`);

    if (malAnimeList.length === 0) {
      return res.json({
        success: true,
        message: 'No anime found in the file'
      });
    }

    sendProgress(0, malAnimeList.length, 'Preparing database...');

    let animeList = await AnimeList.findOne({ userId });

    if (!animeList) {
      animeList = new AnimeList({
        userId,
        watching: [],
        completed: [],
        planned: [],
        dropped: []
      });
    }

    if (clearExisting) {
      console.log('Clearing existing lists...');
      animeList.watching = [];
      animeList.completed = [];
      animeList.planned = [];
      animeList.dropped = [];
      await animeList.save();
      sendProgress(0, malAnimeList.length, 'Cleared existing list');
    }

    function getCategoryFromMalStatus(malStatus) {
      if (!malStatus) return 'planned';

      const statusStr = String(malStatus).trim().toLowerCase();

      if (statusStr === '1') return 'watching';
      if (statusStr === '2') return 'completed';
      if (statusStr === '3') return 'planned';
      if (statusStr === '4') return 'dropped';
      if (statusStr === '6') return 'planned';

      if (statusStr.includes('watching') || statusStr.includes('currently')) {
        return 'watching';
      }
      if (statusStr.includes('completed') || statusStr.includes('complete')) {
        return 'completed';
      }
      if (statusStr.includes('dropped')) {
        return 'dropped';
      }
      if (statusStr.includes('on-hold') || statusStr.includes('on hold') || statusStr === '3') {
        return 'planned';
      }
      if (statusStr.includes('plan') || statusStr.includes('ptw') || statusStr === '6') {
        return 'planned';
      }

      console.warn(`Unknown status: "${malStatus}", defaulting to planned`);
      return 'planned';
    }

    console.log('\n🎬 PROCESSING ANIME ENTRIES...');

    const batchSize = 10;
    let processed = 0;
    let imported = 0;
    let skipped = 0;
    let errors = [];

    const categoryCounts = {
      watching: 0,
      completed: 0,
      planned: 0,
      dropped: 0
    };

    for (let i = 0; i < malAnimeList.length; i += batchSize) {
      const batch = malAnimeList.slice(i, Math.min(i + batchSize, malAnimeList.length));

      for (const malAnime of batch) {
        processed++;

        try {
          const malId = malAnime.series_animedb_id || malAnime.series_anime_db_id || malAnime.series_animedbid;
          const title = malAnime.series_title || malAnime.series_title_eng || 'Unknown Title';

          const malStatus = malAnime.my_status || malAnime.my_status_string || malAnime.my_status_str || malAnime.my_status_code;
          const episodesWatched = parseInt(malAnime.my_watched_episodes || malAnime.my_watched_episodes_string || malAnime.my_watched_episodes_str || 0) || 0;
          const totalEpisodes = parseInt(malAnime.series_episodes || malAnime.series_episodes_string || malAnime.series_episodes_str || 24) || 24;
          const userRating = parseInt(malAnime.my_score || malAnime.my_score_string || malAnime.my_score_str || 0) || 0;

          const category = getCategoryFromMalStatus(malStatus);
          categoryCounts[category]++;

          sendProgress(
            processed,
            malAnimeList.length,
            `Processing: ${title.substring(0, 30)}... -> ${category}`
          );

          if (!clearExisting && malId) {
            const exists = animeList[category].some(a => a.malId === malId.toString());
            if (exists) {
              console.log(`Skipped (duplicate): ${title}`);
              skipped++;
              continue;
            }
          }

          // FIX THIS SECTION - Replace the existing image fetching code:

          const metadata = await getAnimeMetadata(malId, title);
          const imageUrl = metadata.image;
          const fetchedGenres = metadata.genres || [];

          // NEW FUNCTION TO ADD (place it near other helper functions):
          async function getAnimeMetadata(malId, title) {
            // Try multiple sources in order

            // 1. First try: Jikan API (with proper rate limiting)
            try {
              // Rate limiting
              const now = Date.now();
              if (now - lastJikanRequest < 1500) { // 1.5 second delay
                await new Promise(resolve => setTimeout(resolve, 1500 - (now - lastJikanRequest)));
              }

              lastJikanRequest = Date.now();

              const res = await axios.get(`https://api.jikan.moe/v4/anime/${malId}`, {
                headers: {
                  "User-Agent": "OtakuShelf/1.0 (contact: example@email.com)",
                  "Accept": "application/json"
                },
                timeout: 5000
              });

              const image = res.data?.data?.images?.jpg?.large_image_url ||
                res.data?.data?.images?.jpg?.image_url ||
                res.data?.data?.images?.jpg?.small_image_url ||
                null;

              const genres = res.data?.data?.genres?.map(g => g.name) || [];

              if (image) {
                // jikanImageCache is simple for now, but valid
                return { image, genres };
              }
            } catch (error) {
              console.log(`Jikan failed for ${malId}: ${error.message}`);
            }

            // 2. Second try: AniList API (alternative)
            try {
              const query = `
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
          coverImage {
            extraLarge
            large
            medium
          }
          genres
        }
      }
    `;

              const response = await axios.post(
                "https://graphql.anilist.co",
                {
                  query,
                  variables: { idMal: Number(malId) }
                },
                {
                  headers: { "Content-Type": "application/json" },
                  timeout: 5000
                }
              );

              const image = response.data?.data?.Media?.coverImage?.extraLarge ||
                response.data?.data?.Media?.coverImage?.large ||
                response.data?.data?.Media?.coverImage?.medium;

              const genres = response.data?.data?.Media?.genres || [];

              if (image) {
                return { image, genres };
              }
            } catch (error) {
              console.log(`AniList failed for ${malId}: ${error.message}`);
            }

            // 3. Fallback: Use placeholder with anime title
            const encodedTitle = encodeURIComponent(title || 'Anime Poster');
            return {
              image: `https://placehold.co/300x400/667eea/ffffff?text=${encodedTitle}&font=roboto`,
              genres: []
            };
          }

          const malStartDate = malAnime.my_start_date && malAnime.my_start_date !== "0000-00-00"
            ? new Date(malAnime.my_start_date)
            : null;

          const malFinishDate = malAnime.my_finish_date && malAnime.my_finish_date !== "0000-00-00"
            ? new Date(malAnime.my_finish_date)
            : null;

          const animeEntry = {
            title,
            animeId: malId ? malId.toString() : `mal_${Date.now()}_${processed}`,
            malId: malId ? malId.toString() : null,
            image: imageUrl,
            totalEpisodes,
            episodes: totalEpisodes,
            episodesWatched,
            status: category,
            genres: fetchedGenres,
            userRating: userRating > 0 ? Math.round(userRating / 2) : undefined,
            addedDate: malStartDate || new Date(),
          };

          if (category === "completed") {
            animeEntry.finishDate = malFinishDate || malStartDate || new Date();
            animeEntry.episodesWatched = animeEntry.totalEpisodes;
          }

          if (category === "watching") {
            animeEntry.startDate = malStartDate || new Date();
          }

          if (category === "dropped") {
            animeEntry.droppedDate = malFinishDate || new Date();
          }

          if (category === "planned") {
            animeEntry.plannedDate = malStartDate || new Date();
          }

          animeList[category].push(animeEntry);
          imported++;

          console.log(`✅ Imported to ${category}: ${title}`);

        } catch (animeError) {
          const errorMsg = `Failed to process anime: ${animeError.message}`;
          errors.push(errorMsg);
          console.error('❌ Anime processing error:', errorMsg);
        }
      }

      try {
        await animeList.save();
        console.log(`💾 Saved batch ${Math.ceil(processed / batchSize)}`);
        sendProgress(
          processed,
          malAnimeList.length,
          `Saved ${processed}/${malAnimeList.length} entries`
        );
      } catch (saveError) {
        console.error('❌ Batch save error:', saveError.message);
        errors.push(`Batch save failed: ${saveError.message}`);
      }

      if (processed < malAnimeList.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log('\n💾 FINALIZING IMPORT...');

    console.log('\n📊 IMPORT SUMMARY BY CATEGORY:');
    console.log(`Watching: ${categoryCounts.watching}`);
    console.log(`Completed: ${categoryCounts.completed}`);
    console.log(`Planned: ${categoryCounts.planned}`);
    console.log(`Dropped: ${categoryCounts.dropped}`);

    sendProgress(malAnimeList.length, malAnimeList.length, 'Finalizing import...');

    try {
      await animeList.save();
      console.log('✅ List saved successfully');
    } catch (saveError) {
      console.error('❌ Final save error:', saveError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to save list to database'
      });
    }

    try {
      const user = await User.findById(userId);
      if (user && user.profile) {
        user.profile.stats = user.profile.stats || {};
        user.profile.stats.animeWatched = animeList.completed.length;
        user.profile.stats.currentlyWatching = animeList.watching.length;
        user.profile.stats.animePlanned = animeList.planned.length;
        user.profile.stats.animeDropped = animeList.dropped.length;
        await user.save();
      }
    } catch (statsError) {
      console.error('Stats update error:', statsError.message);
    }

    const finalMessage = `Imported ${imported} anime (Watching: ${categoryCounts.watching}, Completed: ${categoryCounts.completed}, Planned: ${categoryCounts.planned}, Dropped: ${categoryCounts.dropped})`;
    console.log(`\n✅ ${finalMessage}`);

    if (userWs && userWs.readyState === 1) {
      userWs.send(JSON.stringify({
        type: 'progress',
        message: 'Import completed successfully!',
        current: malAnimeList.length,
        total: malAnimeList.length,
        completed: true
      }));
    }

    res.json({
      success: true,
      message: finalMessage,
      imported: imported,
      skipped: skipped,
      errors: errors.length,
      total: malAnimeList.length,
      categoryCounts: categoryCounts
    });

  } catch (error) {
    console.error('❌ UNHANDLED ERROR IN MAL IMPORT:', error);

    try {
      const userId = req.body?.userId;
      if (userId) {
        const userWs = userConnections.get(userId);
        if (userWs && userWs.readyState === 1) {
          userWs.send(JSON.stringify({
            type: 'progress',
            message: `Import failed: ${error.message}`,
            current: 0,
            total: 0,
            error: true
          }));
        }
      }
    } catch (wsError) {
      console.error('Failed to send WebSocket error:', wsError);
    }

    res.status(500).json({
      success: false,
      message: 'Import failed',
      error: error.message
    });
  }
});

app.get("/api/list/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      return res.status(400).json({ message: "Invalid user ID" });
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
      console.log('Created new empty list for user:', userId);
    }

    if (!Array.isArray(list.watching)) list.watching = [];
    if (!Array.isArray(list.completed)) list.completed = [];
    if (!Array.isArray(list.planned)) list.planned = [];
    if (!Array.isArray(list.dropped)) list.dropped = [];

    res.json(list);
  } catch (err) {
    console.error('Fetch list error:', err);
    res.status(500).json({ message: "Error fetching list", error: err.message });
  }
});

// Genre Breakdown
// Replace the calculateGenreBreakdown function in your server.js (around line 1106) with this:

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
  if (!animeList) return [];

  const allAnime = [
    ...(animeList.completed || []),
    ...(animeList.watching || []),
  ].filter(anime => anime.userRating && anime.userRating >= 4)
    .sort((a, b) => b.userRating - a.userRating)
    .slice(0, limit);

  return allAnime.map(anime => ({
    id: anime._id,
    title: anime.title,
    image: anime.image || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=250&fit=crop',
    rating: anime.userRating
  }));
}

app.get("/api/profile/:userId/badges", async (req, res) => {
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

    res.json(badges);
  } catch (err) {
    console.error('Badges fetch error:', err);
    res.status(500).json({ message: "Error fetching badges", error: err.message });
  }
});

app.put("/api/list/:userId/:animeId", async (req, res) => {
  try {
    const { episodesWatched, status, userRating } = req.body; // Add userRating
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

    if (episodesWatched !== undefined) {
      anime.episodesWatched = episodesWatched;
    }

    // ADD THIS: Handle rating update
    if (userRating !== undefined) {
      anime.userRating = userRating;
    }

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
    res.json({ message: "Anime updated", list });
  } catch (err) {
    console.error("PUT UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/list/:userId/:animeId", async (req, res) => {
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
    res.json({ message: "Anime removed", list });
  } catch (err) {
    console.error('Remove anime error:', err);
    res.status(500).json({ message: "Error removing anime", error: err.message });
  }
});

// ADD THIS ENDPOINT TO YOUR server.js (after the other list endpoints, around line 1300)

// Backfill genres for existing anime using AniList API
app.post("/api/list/:userId/backfill-genres", async (req, res) => {
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

    res.json({
      success: true,
      message: `Updated genres for ${updated} anime (${failed} failed)`,
      updated,
      failed
    });

  } catch (error) {
    console.error('Backfill error:', error);
    res.status(500).json({ message: "Error backfilling genres", error: error.message });
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

app.use('/api/anime', animeRoutes);
app.use('/api/anilist', anilistRoutes);
app.use("/api/ai", aiChat);
app.use("/auth", (req, res, next) => next());
app.use("/api", (req, res, next) => next());

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

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: '/ws',
  clientTracking: true
});

const userConnections = new Map();

wss.on('connection', (ws, req) => {
  try {
    const { query } = parse(req.url, true);
    const userId = query.userId;

    if (userId) {
      userConnections.set(userId, ws);
      console.log(`🔗 WebSocket connected for user: ${userId}`);

      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connected'
      }));
    }

    ws.on('close', () => {
      if (userId) {
        userConnections.delete(userId);
        console.log(`🔌 WebSocket disconnected for user: ${userId}`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error for user:', userId, error);
    });

  } catch (error) {
    console.error('WebSocket connection error:', error);
  }
});

server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;

// Health Check Endpoint
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
    res.status(200).json(health);
  } catch (error) {
    health.status = 'ERROR';
    health.checks.database = 'disconnected';
    res.status(503).json(health);
  }
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('HTTP server closed');

    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');

      if (wss) {
        wss.clients.forEach(client => client.close());
        wss.close(() => console.log('WebSocket server closed'));
      }

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`WebSocket server running on path: /ws`);
  console.log(`Uploads directory: ${uploadsDir}`);
});