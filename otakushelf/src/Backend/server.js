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
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  authType: { type: String, enum: ["local", "google"], required: true },
  photo: { type: String },
  name: { type: String },
});
const User = mongoose.model("User", userSchema);

const jikanImageCache = new Map();

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
    status: { type: String, default: 'watching' }
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
    status: { type: String, default: 'completed' }
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
    status: { type: String, default: 'planned' }
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
    status: { type: String, default: 'dropped' }
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
      status: category
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

// FIXED: MAL Import Route
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

    console.log('User ID:', userId);
    console.log('File name:', malFile.name);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Parse XML
    const parser = new xml2js.Parser();
    const xmlText = malFile.data.toString('utf8');

    const xmlData = await parser.parseStringPromise(xmlText);

    if (!xmlData.myanimelist || !xmlData.myanimelist.anime) {
      return res.status(400).json({
        success: false,
        message: 'No anime data found in XML file'
      });
    }

    const animeEntries = xmlData.myanimelist.anime;
    console.log(`Found ${animeEntries.length} anime entries`);

    // Debug first entry to see structure
    if (animeEntries.length > 0) {
      console.log('=== FIRST ENTRY STRUCTURE ===');
      const firstEntry = animeEntries[0];
      Object.keys(firstEntry).forEach(key => {
        console.log(`${key}:`, firstEntry[key]?.[0]);
      });
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Get or create user list
    let userList = await AnimeList.findOne({ userId });
    if (!userList) {
      userList = new AnimeList({
        userId,
        watching: [],
        completed: [],
        planned: [],
        dropped: []
      });
      await userList.save();
      console.log('Created new list for user');
    }

    // Process each anime entry
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


        console.log(`Processing: ${title} | Status: ${malStatus} | Start: ${startDate} | Finish: ${finishDate}`);

        // Validate required fields
        if (!malId || !title || !malStatus) {
          console.log(`Skipping: missing required fields`);
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
          console.log(`Skipping: unknown status "${malStatus}"`);
          skippedCount++;
          continue;
        }

        // Determine the best date to use for grouping
        let addedDate;

        if (finishDate) {
          addedDate = finishDate;
          console.log(`Using finish date`);
        } else if (startDate) {
          addedDate = startDate;
          console.log(`Using start date`);
        } else {
          addedDate = new Date();
          console.log(`Using current date`);
        }


        // Validate date
        if (isNaN(addedDate.getTime())) {
          addedDate = new Date();
          console.log(`Invalid date, using current date`);
        }


        const imageUrl = await fetchJikanImage(malId);
        await new Promise(r => setTimeout(r, 800));


        // Create anime object WITH PROPER DATE
        const animeObj = {
          title: title.trim(),
          animeId: malId.toString(),
          malId: malId.toString(),
          image: imageUrl,

          totalEpisodes,
          episodes: totalEpisodes,
          episodesWatched: Math.min(episodesWatched, totalEpisodes),
          userRating: userRating > 0 ? Math.min(userRating / 2, 5) : 0,

          addedDate,                 // always Date
          startDate: startDate ?? undefined,
          finishDate: finishDate ?? undefined,

          status: category
        };



        // For completed anime, set episodes watched to total
        if (category === 'completed') {
          animeObj.episodesWatched = totalEpisodes;
          animeObj.finishDate = addedDate; // Use the finish date
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
            // Update existing entry WITH NEW DATE
            userList[cat][existingIndex] = {
              ...userList[cat][existingIndex],
              ...animeObj
            };
            updatedCount++;
            exists = true;
            console.log(`Updated: ${title.substring(0, 30)}...`);
            break;
          }
        }

        // If doesn't exist, add to appropriate category
        if (!exists) {
          userList[category].push(animeObj);
          importedCount++;
          console.log(`Added: ${title.substring(0, 30)}... to ${category}`);
        }

      } catch (entryError) {
        console.error(`Error processing entry ${i}:`, entryError);
        skippedCount++;
      }
    }

    // Save the updated list
    await userList.save();

    console.log(`=== IMPORT COMPLETED ===`);
    console.log(`Total found: ${animeEntries.length}`);
    console.log(`Imported: ${importedCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);

    res.json({
      success: true,
      importedCount,
      updatedCount,
      skippedCount,
      totalFound: animeEntries.length,
      message: `Successfully imported ${importedCount} new anime and updated ${updatedCount} existing ones`
    });

  } catch (error) {
    console.error('MAL Import error:', error);
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

// Server
const server = http.createServer(app);
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
});