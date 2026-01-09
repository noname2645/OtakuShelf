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
dotenv.config();

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
// =======================
// Enhanced User Schema with Profile
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
  // 1️⃣ Return from cache if exists
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

    const image =
      res.data?.data?.images?.jpg?.large_image_url || null;

    // 2️⃣ Cache result (even if null)
    jikanImageCache.set(malId, image);

    return image;
  } catch (err) {
    // 3️⃣ If rate limited → STOP hammering
    if (err.response?.status === 429) {
      console.warn("Jikan rate limit hit. Skipping further image fetches.");
      return null;
    }

    console.error(
      `Jikan fetch failed for MAL ID ${malId}`,
      err.response?.status,
      err.response?.data || err.message
    );
    return null;
  }
};

// server.js - Update the fetchAniListGenres function

const fetchAniListGenres = async (malId) => {
  if (!malId) return [];

  // 1. Check cache first
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

    // cache by MAL ID
    jikanGenreCache.set(malId, genres);
    return genres;

  } catch (err) {
    // ===== RATE LIMIT HANDLING =====
    if (err.response?.status === 429) {
      console.warn("⚠️ AniList rate limit hit! Waiting 60 seconds...");

      // Wait for 60 seconds (rate limit reset time)
      await new Promise(resolve => setTimeout(resolve, 60000));

      console.log("↻ Retrying after wait...");

      // Try again once
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
    // ===== END RATE LIMIT HANDLING =====

    console.error(
      `AniList genre fetch failed for MAL ID ${malId}`,
      err.response?.data || err.message
    );
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
    genres: [String]  // ← ADD THIS LINE
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
    genres: [String]  // ← ADD THIS LINE
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
    genres: [String]  // ← ADD THIS LINE
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

// Anime list routes 
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
      genres: animeData?.genres || []  // ← Extract genres from animeData
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
  try {
    console.log('=== MAL IMPORT STARTED ===');

    if (!req.files || !req.files.malFile) {
      console.log('ERROR: No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an XML file.'
      });
    }

    const malFile = req.files.malFile;
    const userId = req.body.userId;
    const clearExisting = req.body.clearExisting === 'true';

    console.log('User ID:', userId);
    console.log('File name:', malFile.name);
    console.log('Clear existing:', clearExisting);
    console.log('Mode:', clearExisting ? 'REPLACE' : 'MERGE');

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Helper function to send WebSocket progress
    const sendProgress = (current, total, message = '') => {
      const ws = userConnections.get(userId);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'progress',
          current,
          total,
          message: total ? `[${current}/${total}] ${message}` : `[${current}] ${message}`
        }));
      }
    };

    // Send initial progress
    sendProgress(0, 0, 'Starting MAL import...');

    let userList;

    // Check if we should clear existing list
    if (clearExisting) {
      sendProgress(0, 0, 'Clearing existing list...');
      console.log('🧹 Clearing existing anime list...');
      await AnimeList.deleteOne({ userId });
      console.log('✅ Existing list cleared');

      // Create brand new list
      userList = new AnimeList({
        userId,
        watching: [],
        completed: [],
        planned: [],
        dropped: []
      });
      await userList.save();
      console.log('📝 Created new list for user (after clear)');
      sendProgress(0, 0, 'List cleared, ready to import...');
    } else {
      // Get or create user list (merge mode)
      userList = await AnimeList.findOne({ userId });
      if (!userList) {
        userList = new AnimeList({
          userId,
          watching: [],
          completed: [],
          planned: [],
          dropped: []
        });
        await userList.save();
        console.log('📝 Created new list for user');
      } else {
        console.log('📋 Found existing list with:');
        console.log(`   Watching: ${userList.watching?.length || 0}`);
        console.log(`   Completed: ${userList.completed?.length || 0}`);
        console.log(`   Planned: ${userList.planned?.length || 0}`);
        console.log(`   Dropped: ${userList.dropped?.length || 0}`);
      }
      sendProgress(0, 0, 'Merging with existing list...');
    }

    // Parse XML
    const parser = new xml2js.Parser();
    const xmlText = malFile.data.toString('utf8');

    const xmlData = await parser.parseStringPromise(xmlText);

    if (!xmlData.myanimelist || !xmlData.myanimelist.anime) {
      sendProgress(0, 0, 'Error: No anime data found in XML');
      return res.status(400).json({
        success: false,
        message: 'No anime data found in XML file'
      });
    }

    const animeEntries = xmlData.myanimelist.anime;
    const totalAnime = animeEntries.length;

    console.log(`📊 Found ${totalAnime} anime entries in XML`);
    sendProgress(0, totalAnime, `Found ${totalAnime} anime, starting processing...`);

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let cachedImagesUsed = 0;
    let newImagesFetched = 0;

    // Create combined array for quick lookups in MERGE mode
    let allExistingAnime = [];
    if (!clearExisting && userList) {
      allExistingAnime = [
        ...(userList.watching || []),
        ...(userList.completed || []),
        ...(userList.planned || []),
        ...(userList.dropped || [])
      ];
      console.log(`🔍 ${allExistingAnime.length} existing anime for image lookup`);
    }

    // ============================================
    // PROCESS EACH ANIME WITH REAL-TIME UPDATES
    // ============================================
    for (let i = 0; i < animeEntries.length; i++) {
      try {
        const entry = animeEntries[i];

        // Extract all possible fields
        const malId = entry.series_animedb_id?.[0];
        const title = entry.series_title?.[0];
        const malStatus = entry.my_status?.[0];
        const episodesWatched = parseInt(entry.my_watched_episodes?.[0]) || 0;
        const totalEpisodes = parseInt(entry.series_episodes?.[0]) || 24;
        const userRating = parseInt(entry.my_score?.[0]) || 0;
        const startDate = parseMALDate(entry.my_start_date?.[0]);
        const finishDate = parseMALDate(entry.my_finish_date?.[0]);

        // ============================================
        // REAL-TIME PROGRESS UPDATE FOR EACH ANIME
        // ============================================
        sendProgress(i + 1, totalAnime, 'Importing...');

        // Validate required fields
        if (!malId || !title || !malStatus) {
          console.log(`⏭️ Skipping: missing required fields`);
          skippedCount++;
          continue;
        }

        // Map MAL status to your categories
        let category;
        const status = malStatus.toString().toLowerCase();

        if (status === '1' || status === 'watching') {
          category = 'watching';
        } else if (status === '2' || status === 'completed') {
          category = 'completed';
        } else if (status === '3' || status === 'on-hold') {
          category = 'planned';
        } else if (status === '4' || status === 'dropped') {
          category = 'dropped';
        } else if (status === '6' || status === 'plan to watch') {
          category = 'planned';
        } else {
          console.log(`⏭️ Skipping: unknown status "${malStatus}"`);
          skippedCount++;
          continue;
        }

        // Determine the best date to use for grouping
        let addedDate;

        if (finishDate) {
          addedDate = finishDate;
        } else if (startDate) {
          addedDate = startDate;
        } else {
          addedDate = new Date();
        }

        // Validate date
        if (isNaN(addedDate.getTime())) {
          addedDate = new Date();
        }

        // ===== OPTIMIZED IMAGE FETCHING =====
        let imageUrl = null;

        if (!clearExisting) {
          // MERGE MODE: Try to reuse existing image first
          const existingAnime = allExistingAnime.find(
            anime => anime.malId === malId.toString() ||
              anime.title.toLowerCase() === title.toLowerCase().trim()
          );

          if (existingAnime && existingAnime.image) {
            // Use cached image - NO API CALL!
            imageUrl = existingAnime.image;
            cachedImagesUsed++;
            console.log(`✅ [${i + 1}/${animeEntries.length}] Using cached image: ${title.substring(0, 30)}...`);
          } else {
            // New anime, fetch image
            imageUrl = await fetchJikanImage(malId);
            await new Promise(r => setTimeout(r, 800)); // Rate limiting
            newImagesFetched++;
            console.log(`🔄 [${i + 1}/${animeEntries.length}] Fetching image: ${title.substring(0, 30)}...`);
          }
        } else {
          // REPLACE MODE: Always fetch fresh images
          imageUrl = await fetchJikanImage(malId);
          await new Promise(r => setTimeout(r, 800)); // Rate limiting
          newImagesFetched++;
          console.log(`🔄 [${i + 1}/${animeEntries.length}] Fetching (Replace mode): ${title.substring(0, 30)}...`);
        }

        // Create anime object
        const animeObj = {
          title: title.trim(),
          animeId: malId.toString(),
          malId: malId.toString(),
          image: imageUrl,
          totalEpisodes,
          episodes: totalEpisodes,
          episodesWatched: Math.min(episodesWatched, totalEpisodes),
          userRating: userRating > 0 ? Math.min(userRating / 2, 5) : 0,
          addedDate,
          startDate: startDate ?? undefined,
          finishDate: finishDate ?? undefined,
          status: category,
          genres: []
        };


        // Only fetch genres if we have a MAL ID
        if (malId) {
          try {
            const genres = await fetchAniListGenres(malId);
            if (genres && genres.length > 0) {
              animeObj.genres = genres;
              console.log(`📊 [${i + 1}/${animeEntries.length}] Found ${genres.length} genres for ${title.substring(0, 30)}...`);
            }
            await new Promise(r => setTimeout(r, 500)); // Rate limiting
          } catch (genreError) {
            console.log(`⚠️ Could not fetch genres for ${title}:`, genreError.message);
          }
        }

        // For completed anime, set episodes watched to total
        if (category === 'completed') {
          animeObj.episodesWatched = totalEpisodes;
          animeObj.finishDate = addedDate;
        }

        // Check if anime already exists in ANY category
        let exists = false;
        const categories = ['watching', 'completed', 'planned', 'dropped'];

        for (const cat of categories) {
          const existingIndex = userList[cat].findIndex(
            anime => anime.malId === malId.toString() ||
              anime.title.toLowerCase() === title.toLowerCase().trim()
          );

          if (existingIndex !== -1) {
            // Update existing entry
            userList[cat][existingIndex] = {
              ...userList[cat][existingIndex],
              ...animeObj
            };
            updatedCount++;
            exists = true;
            console.log(`📝 Updated: ${title.substring(0, 30)}...`);
            break;
          }
        }

        // If doesn't exist, add to appropriate category
        if (!exists) {
          userList[category].push(animeObj);
          importedCount++;
          console.log(`➕ Added: ${title.substring(0, 30)}... to ${category}`);
        }

      } catch (entryError) {
        console.error(`❌ Error processing entry ${i}:`, entryError.message);
        skippedCount++;
      }
    }

    // Save the updated list
    await userList.save();

    console.log(`=== IMPORT COMPLETED ===`);
    console.log(`📊 Total found in XML: ${animeEntries.length}`);
    console.log(`✅ Imported new: ${importedCount}`);
    console.log(`📝 Updated existing: ${updatedCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log(`🖼️ Cached images reused: ${cachedImagesUsed}`);
    console.log(`🔄 New images fetched: ${newImagesFetched}`);
    console.log(`🎯 Mode: ${clearExisting ? 'REPLACE (fresh import)' : 'MERGE (update existing)'}`);

    // Send final progress
    sendProgress(totalAnime, totalAnime, 'Import completed!');

    res.json({
      success: true,
      importedCount,
      updatedCount,
      skippedCount,
      cachedImagesUsed,
      newImagesFetched,
      totalFound: animeEntries.length,
      message: clearExisting
        ? `Successfully imported ${importedCount} anime (Replace mode)`
        : `Successfully merged ${importedCount} new anime and updated ${updatedCount} existing ones`
    });

  } catch (error) {
    console.error('❌ MAL Import error:', error);
    // Send error progress
    const userId = req.body.userId;
    const ws = userConnections.get(userId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'error',
        message: `Import failed: ${error.message}`
      }));
    }
    res.status(500).json({
      success: false,
      message: 'Import failed',
      error: error.message
    });
  }
});

// Get anime list with error handling
app.get("/api/list/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    let list = await AnimeList.findOne({ userId });

    if (!list) {
      // Create empty list if it doesn't exist
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

    // Ensure all arrays exist
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

// server.js - Add a new endpoint to fetch genres for existing anime

app.post("/api/list/:userId/refresh-genres", async (req, res) => {
  try {
    const { userId } = req.params;

    const animeList = await AnimeList.findOne({ userId });
    if (!animeList) {
      return res.status(404).json({ message: "List not found" });
    }

    let updatedCount = 0;
    let failedCount = 0;

    // Combine all anime from all categories
    const allAnime = [
      ...(animeList.watching || []),
      ...(animeList.completed || []),
      ...(animeList.planned || []),
      ...(animeList.dropped || [])
    ];

    // Filter anime without genres
    const animeWithoutGenres = allAnime.filter(anime =>
      (!anime.genres || anime.genres.length === 0) && anime.malId
    );

    console.log(`Found ${animeWithoutGenres.length} anime without genres to update`);

    // Process in batches to avoid rate limiting
    for (let i = 0; i < animeWithoutGenres.length; i++) {
      const anime = animeWithoutGenres[i];

      try {
        const genres = await fetchAniListGenres(anime.malId);

        if (genres && genres.length > 0) {
          // Find which category this anime is in
          const categories = ['watching', 'completed', 'planned', 'dropped'];

          for (const category of categories) {
            const animeIndex = animeList[category].findIndex(
              a => a._id && a._id.toString() === anime._id.toString()
            );

            if (animeIndex !== -1) {
              animeList[category][animeIndex].genres = genres;
              updatedCount++;
              break;
            }
          }

          // Rate limiting
          await new Promise(r => setTimeout(r, 600));
        }
      } catch (error) {
        console.error(`Failed to fetch genres for ${anime.title}:`, error.message);
        failedCount++;
      }
    }

    await animeList.save();

    res.json({
      success: true,
      message: `Genres refreshed for ${updatedCount} anime`,
      updatedCount,
      failedCount,
      totalProcessed: animeWithoutGenres.length
    });

  } catch (error) {
    console.error('Genre refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh genres',
      error: error.message
    });
  }
});

// =======================
// PROFILE API ROUTES
// =======================

// Get user profile
app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
      stats.hoursWatched = Math.round(totalEpisodes * 24); // Assuming 24 minutes per episode
      stats.meanScore = ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : 0;
      stats.favorites = animeList.completed?.filter(a => a.userRating >= 4).length || 0;
    }

    // Calculate genre breakdown
    const genres = await calculateGenreBreakdown(userId);

    // Get recently watched (last 4 completed/watching anime)
    const recentlyWatched = await getRecentlyWatched(userId, 4);

    // Get favorite anime (highest rated)
    const favoriteAnime = await getFavoriteAnime(userId, 6);

    const profileData = {
      _id: user._id,
      email: user.email,
      name: user.name || 'Anime Lover',
      photo: user.photo || null,
      profile: {
        username: user.profile?.username || `@user_${user._id.toString().slice(-6)}`,
        bio: user.profile?.bio || 'Anime enthusiast exploring new worlds through animation',
        joinDate: user.profile?.joinDate || user.createdAt,
        coverImage: user.profile?.coverImage || null,
        stats: { ...user.profile?.stats, ...stats },
        badges: user.profile?.badges || [],
        favoriteGenres: genres,
        preferences: user.profile?.preferences || {}
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

// Upload profile COVER image
app.post("/api/profile/:userId/upload-cover", async (req, res) => {
  try {
    if (!req.files || !req.files.cover) {
      return res.status(400).json({ message: "No cover image uploaded" });
    }

    const cover = req.files.cover;
    const { userId } = req.params;

    // Basic validation
    if (!cover.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Invalid file type" });
    }

    if (cover.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "Cover image too large (max 5MB)" });
    }

    // ⚠️ TEMP approach (same as avatar)
    const base64Image = cover.data.toString("base64");
    const dataUrl = `data:${cover.mimetype};base64,${base64Image}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { "profile.coverImage": dataUrl } },
      { new: true, select: "-password" }
    );

    res.json({
      message: "Cover image uploaded successfully",
      coverImage: dataUrl,
      user: updatedUser
    });

  } catch (err) {
    console.error("Cover upload error:", err);
    res.status(500).json({ message: "Cover upload failed" });
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

// Upload profile picture
app.post("/api/profile/:userId/upload-photo", async (req, res) => {
  try {
    if (!req.files || !req.files.photo) {
      return res.status(400).json({ message: "No photo uploaded" });
    }

    const photo = req.files.photo;
    const { userId } = req.params;

    // In production, you would upload to Cloudinary, AWS S3, etc.
    // For now, we'll save as base64 (not recommended for production)
    const base64Image = photo.data.toString('base64');
    const dataUrl = `data:${photo.mimetype};base64,${base64Image}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { photo: dataUrl },
      { new: true, select: '-password' }
    );

    res.json({
      message: "Photo uploaded successfully",
      photo: dataUrl,
      user: updatedUser
    });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ message: "Error uploading photo", error: err.message });
  }
});


// Calculate genre breakdown
// server.js - Replace the calculateGenreBreakdown function

async function calculateGenreBreakdown(userId) {
  const animeList = await AnimeList.findOne({ userId });
  if (!animeList || !animeList.completed.length) return [];

  const genreCount = {};
  let total = 0;

  // Process all completed anime
  for (const anime of animeList.completed) {
    // Use locally stored genres if available
    if (anime.genres && Array.isArray(anime.genres)) {
      for (const genre of anime.genres) {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
        total++;
      }
    }
    // If genres not stored locally, try to fetch them ONCE and save
    else if (anime.malId) {
      try {
        const genres = await fetchAniListGenres(anime.malId);
        if (genres && genres.length > 0) {
          // Update the anime document with genres for future use
          await AnimeList.findOneAndUpdate(
            { userId, "completed._id": anime._id },
            { $set: { "completed.$.genres": genres } }
          );

          // Count the genres
          for (const genre of genres) {
            genreCount[genre] = (genreCount[genre] || 0) + 1;
            total++;
          }
        }
        await new Promise(r => setTimeout(r, 500)); // Rate limiting
      } catch (error) {
        console.error(`Could not fetch genres for ${anime.title}:`, error.message);
      }
    }
  }

  if (total === 0) return [];

  // Calculate percentages
  const genreBreakdown = Object.entries(genreCount)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 10); // Top 10 genres

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

    // Binge King - Watched 10+ episodes in a day
    const bingeKing = await checkBingeKing(userId);
    if (bingeKing) badges.push(bingeKing);

    // Seasonal Hunter - Completed 5+ seasonal anime
    const seasonalHunter = await checkSeasonalHunter(userId);
    if (seasonalHunter) badges.push(seasonalHunter);

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
  // Implement logic to check if user watched 10+ episodes in a day
  return null; // Placeholder
}

async function checkSeasonalHunter(userId) {
  // Implement logic to check seasonal anime completion
  return null; // Placeholder
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

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/ws',
  clientTracking: true
});

// Store WebSocket connections by userId
const userConnections = new Map();

wss.on('connection', (ws, req) => {
  try {
    const { query } = parse(req.url, true);
    const userId = query.userId;

    if (userId) {
      userConnections.set(userId, ws);
      console.log(`🔗 WebSocket connected for user: ${userId}`);

      // Send connection confirmation
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

// Server settings
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`WebSocket server running on path: /ws`);
});