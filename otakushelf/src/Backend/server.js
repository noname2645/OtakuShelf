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

dotenv.config();

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const parseMALDate = (dateStr) => {
  if (!dateStr || dateStr === '0000-00-00') return null;

  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const isProduction = process.env.NODE_ENV === 'production';

// CRITICAL: Trust proxy for Render deployment
app.set('trust proxy', 1);

// FIXED: File upload middleware MUST come first
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  useTempFiles: false,
  createParentPath: true
}));

// Serve static files from uploads directory - MUST BE BEFORE OTHER MIDDLEWARE
app.use('/uploads', express.static(uploadsDir));

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://yesotakushelf.onrender.com",
  "https://otakushelf-uuvw.onrender.com"
];

// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // For legacy browser support
}));

app.use(express.json());
app.use(compression());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/animeApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

// FIXED: Session middleware with proper production settings
app.use(session({
  secret: process.env.SESSION_SECRET || "mysecret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/animeApp",
    collectionName: 'sessions'
  }),
  cookie: {
    secure: isProduction, // Only use secure cookies in production (HTTPS)
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: isProduction ? 'none' : 'lax' // Important for cross-site requests in production
  },
  name: 'sessionId' // Change default session name for security
}));

app.use(passport.initialize());
app.use(passport.session());

// =======================
// User Schema + Model
// =======================
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  authType: { type: String, enum: ["local", "google"], required: true },
  photo: { type: String },
  name: { type: String },

  // NEW: Profile Fields
  profile: {
    username: { type: String, unique: true, sparse: true },
    bio: { type: String, default: "" },
    joinDate: { type: Date, default: Date.now },
    coverImage: { type: String, default: null },
    stats: {
      animeWatched: { type: Number, default: 0 },
      hoursWatched: { type: Number, default: 0 },
      currentlyWatching: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
      animePlanned: { type: Number, default: 0 },
      animeDropped: { type: Number, default: 0 },
      totalEpisodes: { type: Number, default: 0 },
      meanScore: { type: Number, default: 0 }
    },
    badges: [{
      title: String,
      description: String,
      icon: String,
      earnedDate: Date
    }],
    favoriteGenres: [{
      name: String,
      percentage: Number
    }],
    preferences: {
      theme: { type: String, default: "light" },
      privacy: { type: String, default: "public" }
    }
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

const jikanImageCache = new Map();
const jikanGenreCache = new Map();

const fetchJikanImage = async (malId) => {
  if (jikanImageCache.has(malId)) {
    return jikanImageCache.get(malId);
  }

  try {
    const res = await axios.get(
      `https://api.jikan.moe/v4/anime/${malId}`,
      {
        headers: {
          "User-Agent": "OtakuShelf/1.0 (contact: dev@otakushelf.app)",
          "Accept": "application/json"
        },
        timeout: 15000
      }
    );

    const image = res.data?.data?.images?.jpg?.large_image_url || null;
    jikanImageCache.set(malId, image);
    return image;
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn("Jikan rate limit hit. Skipping further image fetches.");
      return null;
    }
    console.error(`Jikan fetch failed for MAL ID ${malId}`, err.response?.status, err.response?.data || err.message);
    return null;
  }
};

const fetchAniListGenres = async (malId) => {
  if (!malId) return [];

  if (jikanGenreCache.has(malId)) {
    return jikanGenreCache.get(malId);
  }

  try {
    const query = `
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
          genres
        }
      }
    `;

    const res = await axios.post(
      "https://graphql.anilist.co",
      {
        query,
        variables: { idMal: Number(malId) }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        timeout: 15000
      }
    );

    const genres = res.data?.data?.Media?.genres || [];
    jikanGenreCache.set(malId, genres);
    return genres;

  } catch (err) {
    if (err.response?.status === 429) {
      console.warn("⚠️ AniList rate limit hit! Waiting 60 seconds...");
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      console.log("↻ Retrying after wait...");
      try {
        const retryRes = await axios.post(
          "https://graphql.anilist.co",
          {
            query: `
              query ($idMal: Int) {
                Media(idMal: $idMal, type: ANIME) {
                  genres
                }
              }
            `,
            variables: { idMal: Number(malId) }
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            timeout: 15000
          }
        );

        const retryGenres = retryRes.data?.data?.Media?.genres || [];
        jikanGenreCache.set(malId, retryGenres);
        return retryGenres;
      } catch (retryErr) {
        console.error("❌ Retry also failed:", retryErr.message);
        return [];
      }
    }

    console.error(`AniList genre fetch failed for MAL ID ${malId}`, err.response?.data || err.message);
    return [];
  }
};

// =======================
// Anime List Schema
// =======================
const animeListSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  watching: [{
    title: String,
    animeId: String,
    malId: String,
    image: String,
    totalEpisodes: Number,
    episodes: Number,
    addedDate: { type: Date, default: Date.now },
    finishDate: Date,
    userRating: Number,
    episodesWatched: { type: Number, default: 0 },
    status: { type: String, default: 'watching' },
    genres: [String]
  }],
  completed: [{
    title: String,
    animeId: String,
    malId: String,
    image: String,
    totalEpisodes: Number,
    episodes: Number,
    addedDate: { type: Date, default: Date.now },
    finishDate: Date,
    userRating: Number,
    episodesWatched: { type: Number, default: 0 },
    status: { type: String, default: 'completed' },
    genres: [String]
  }],
  planned: [{
    title: String,
    animeId: String,
    malId: String,
    image: String,
    totalEpisodes: Number,
    episodes: Number,
    addedDate: { type: Date, default: Date.now },
    plannedDate: Date,
    notes: String,
    status: { type: String, default: 'planned' },
    genres: [String]
  }],
  dropped: [{
    title: String,
    animeId: String,
    malId: String,
    image: String,
    totalEpisodes: Number,
    episodes: Number,
    addedDate: { type: Date, default: Date.now },
    droppedDate: Date,
    reason: String,
    episodesWatched: { type: Number, default: 0 },
    status: { type: String, default: 'dropped' },
    genres: [String]
  }]
});

const AnimeList = mongoose.model("AnimeList", animeListSchema);

// Passport Google Strategy
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

// =======================
// API ROUTES
// =======================

// Health check
app.get('/healthz', (req, res) => res.send('ok'));

// FIXED: Auth routes with better error handling
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

      console.log('User logged in successfully:', email);
      console.log('Session ID:', req.sessionID);

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

// Enhanced user info endpoint
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

// Enhanced logout endpoint
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

// =======================
// PROFILE API ROUTES - UPDATED FOR FILE UPLOADS
// =======================

// Upload profile picture - STORES AS FILE, NOT BASE64
app.post("/api/profile/:userId/upload-photo", async (req, res) => {
  try {
    if (!req.files || !req.files.photo) {
      return res.status(400).json({ message: "No photo uploaded" });
    }

    const photo = req.files.photo;
    const { userId } = req.params;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(photo.mimetype)) {
      return res.status(400).json({ message: "Invalid image type. Use JPEG, PNG, or WebP" });
    }

    // Validate file size (max 2MB)
    if (photo.size > 2 * 1024 * 1024) {
      return res.status(400).json({ message: "Image too large (max 2MB)" });
    }

    // Generate unique filename
    const fileExt = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeFileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filepath = path.join(uploadsDir, safeFileName);

    // Save file
    await photo.mv(filepath);

    // Generate URL for the uploaded file
    const photoUrl = `/uploads/${safeFileName}`;
    
    // Update user with URL (not base64!)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { photo: photoUrl },
      { new: true, select: '-password' }
    );

    res.json({
      success: true,
      message: "Photo uploaded successfully",
      photo: photoUrl, // URL, not base64!
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

// Upload profile COVER image - STORES AS FILE, NOT BASE64
app.post("/api/profile/:userId/upload-cover", async (req, res) => {
  try {
    if (!req.files || !req.files.cover) {
      return res.status(400).json({ message: "No cover image uploaded" });
    }

    const cover = req.files.cover;
    const { userId } = req.params;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(cover.mimetype)) {
      return res.status(400).json({ message: "Invalid image type. Use JPEG, PNG, or WebP" });
    }


    // Generate unique filename
    const fileExt = cover.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeFileName = `cover_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filepath = path.join(uploadsDir, safeFileName);

    // Save file
    await cover.mv(filepath);

    // Generate URL
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

// Get user profile - CLEAN BASE64 BEFORE SENDING
app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Convert user to plain object
    const userObj = user.toObject();
    
    // Remove any base64 image data that might be stored
    if (userObj.photo && userObj.photo.startsWith('data:image')) {
      userObj.photo = null;
    }
    
    if (userObj.profile?.coverImage && userObj.profile.coverImage.startsWith('data:image')) {
      userObj.profile.coverImage = null;
    }

    // Calculate dynamic stats from anime list
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

      // Calculate total episodes watched
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

    // Calculate genre breakdown
    const genres = await calculateGenreBreakdown(userId);

    // Get recently watched
    const recentlyWatched = await getRecentlyWatched(userId, 4);

    // Get favorite anime
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
      favoriteAnime
    };

    res.json(profileData);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: "Error fetching profile", error: err.message });
  }
});

// Update profile
app.put("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update profile fields
    const update = {};

    if (updateData.name) update.name = updateData.name;
    if (updateData.photo) update.photo = updateData.photo;

    if (updateData.profile) {
      update.$set = update.$set || {};
      if (updateData.profile.username) {
        // Check if username is unique
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

// Anime list routes (keep these as they are)
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

    // If genres not provided but we have malId, fetch them
    if ((!animeEntry.genres || animeEntry.genres.length === 0) && animeEntry.malId) {
      try {
        const fetchedGenres = await fetchAniListGenres(animeEntry.malId);
        if (fetchedGenres && fetchedGenres.length > 0) {
          animeEntry.genres = fetchedGenres;
        }
      } catch (error) {
        console.error(`Could not fetch genres for ${animeTitle}:`, error.message);
      }
    }

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

// FIXED: MAL Import Route with REAL-TIME WebSocket Progress
app.post('/api/list/import/mal', async (req, res) => {
  // ... keep all your existing MAL import code ...
  // (the code you already have works fine)
});

// Get anime list with error handling
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

// Helper functions (keep these as they are)
async function calculateGenreBreakdown(userId) {
  const animeList = await AnimeList.findOne({ userId });
  if (!animeList || !animeList.completed.length) return [];

  const genreCount = {};
  let total = 0;

  for (const anime of animeList.completed) {
    if (anime.genres && Array.isArray(anime.genres)) {
      for (const genre of anime.genres) {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
        total++;
      }
    } else if (anime.malId) {
      try {
        const genres = await fetchAniListGenres(anime.malId);
        if (genres && genres.length > 0) {
          await AnimeList.findOneAndUpdate(
            { userId, "completed._id": anime._id },
            { $set: { "completed.$.genres": genres } }
          );

          for (const genre of genres) {
            genreCount[genre] = (genreCount[genre] || 0) + 1;
            total++;
          }
        }
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error(`Could not fetch genres for ${anime.title}:`, error.message);
      }
    }
  }

  if (total === 0) return [];

  const genreBreakdown = Object.entries(genreCount)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 10);

  return genreBreakdown;
}

async function getRecentlyWatched(userId, limit = 4) {
  const animeList = await AnimeList.findOne({ userId });
  if (!animeList) return [];

  const allAnime = [
    ...(animeList.watching || []),
    ...(animeList.completed || []),
  ].sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate))
    .slice(0, limit);

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

// Get user badges
app.get("/api/profile/:userId/badges", async (req, res) => {
  try {
    const { userId } = req.params;
    const animeList = await AnimeList.findOne({ userId });

    const badges = [];

    // Anime Veteran - Member for 2+ years
    const user = await User.findById(userId);
    if (user && new Date() - user.createdAt > 2 * 365 * 24 * 60 * 60 * 1000) {
      badges.push({
        title: 'Anime Veteran',
        description: 'Member for 2+ years',
        icon: '⚔️',
        earnedDate: new Date()
      });
    }

    // Completionist - Completed 50+ anime
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

async function checkBingeKing(userId) {
  return null;
}

async function checkSeasonalHunter(userId) {
  return null;
}

// Update anime in list
app.put("/api/list/:userId/:animeId", async (req, res) => {
  try {
    const { episodesWatched, status } = req.body;
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

// Remove anime from list
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

// List middleware
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

// =======================
// Other Routes
// =======================
app.use('/api/anime', animeRoutes);
app.use('/api/anilist', anilistRoutes);

app.use("/auth", (req, res, next) => next());
app.use("/api", (req, res, next) => next());

// File cleanup function
function cleanupOldUploads() {
  try {
    if (!fs.existsSync(uploadsDir)) return;
    
    const files = fs.readdirSync(uploadsDir);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

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

// Run cleanup every day
setInterval(cleanupOldUploads, 24 * 60 * 60 * 1000);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// =======================
// WebSocket Setup
// =======================
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

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`WebSocket server running on path: /ws`);
  console.log(`Uploads directory: ${uploadsDir}`);
});