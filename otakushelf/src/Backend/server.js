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
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const isProduction = process.env.NODE_ENV === 'production';

// CRITICAL: Trust proxy for Render deployment
app.set('trust proxy', 1);

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
    addedDate: { type: Date, default: Date.now },
    startDate: Date,
    finishDate: Date,
    userRating: Number,
    episodesWatched: Number,
    notes: String
  }],
  completed: [{
    title: String,
    animeId: String,
    malId: String,
    image: String,
    addedDate: { type: Date, default: Date.now },
    startDate: Date,
    finishDate: Date,
    userRating: Number,
    episodesWatched: Number,
    notes: String
  }],
  planned: [{
    title: String,
    animeId: String,
    malId: String,
    image: String,
    addedDate: { type: Date, default: Date.now },
    plannedDate: Date,
    notes: String
  }],
  dropped: [{
    title: String,
    animeId: String,
    malId: String,
    image: String,
    addedDate: { type: Date, default: Date.now },
    droppedDate: Date,
    reason: String,
    episodesWatched: Number
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

    const hashed = await bcrypt.hash(password, 12); // Increased salt rounds
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

    // FIXED: Better session handling
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

  // fallback: session-based auth
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
      res.clearCookie('connect.sid'); // Fallback for default name
      console.log('User logged out successfully:', userEmail);
      res.json({ message: "Logged out successfully" });
    });
  });
});

// Anime list routes 
app.get("/api/list/:userId", async (req, res) => {
  try {
    const list = await AnimeList.findOne({ userId: req.params.userId });
    if (!list) return res.json({ watching: [], completed: [], planned: [], dropped: [] });
    res.json(list);
  } catch (err) {
    console.error('Fetch list error:', err);
    res.status(500).json({ message: "Error fetching list", error: err.message });
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
      animeId: animeData?.id || animeData?.mal_id || null,
      malId: animeData?.mal_id || animeData?.id || null,
      image: animeData?.images?.jpg?.large_image_url || animeData?.coverImage?.large || animeData?.image_url || null,
      addedDate: new Date()
    };
    
    if (category === 'watching' || category === 'completed') {
      animeEntry.startDate = new Date();
      animeEntry.episodesWatched = 0;
    }
    
    if (category === 'completed') {
      animeEntry.finishDate = new Date();
    }
    
    list[category].push(animeEntry);
    await list.save();
    res.json({ message: "Anime list updated", list });
  } catch (err) {
    console.error('Update list error:', err);
    res.status(500).json({ message: "Error updating list", error: err.message });
  }
});

// Get specific anime list with details
app.get("/api/list/:userId", async (req, res) => {
  try {
    let list = await AnimeList.findOne({ userId: req.params.userId });
    
    if (!list) {
      // Create empty list if it doesn't exist
      list = new AnimeList({
        userId: req.params.userId,
        watching: [],
        completed: [],
        planned: [],
        dropped: []
      });
      await list.save();
    }
    
    res.json(list);
  } catch (err) {
    console.error('Fetch list error:', err);
    res.status(500).json({ message: "Error fetching list", error: err.message });
  }
});
// Update anime in list
app.put("/api/list/:userId/:animeId", async (req, res) => {
  try {
    const { startDate, finishDate, userRating, episodesWatched, notes, category } = req.body;
    const list = await AnimeList.findOne({ userId: req.params.userId });

    if (!list) return res.status(404).json({ message: "List not found" });

    const animeIndex = list[category].findIndex(item => item._id.toString() === req.params.animeId);
    if (animeIndex === -1) {
      return res.status(404).json({ message: "Anime not found in specified category" });
    }

    list[category][animeIndex] = {
      ...list[category][animeIndex]._doc,
      startDate: startDate ? new Date(startDate) : list[category][animeIndex].startDate,
      finishDate: finishDate ? new Date(finishDate) : list[category][animeIndex].finishDate,
      userRating: userRating ?? list[category][animeIndex].userRating,
      episodesWatched: episodesWatched ?? list[category][animeIndex].episodesWatched,
      notes: notes ?? list[category][animeIndex].notes,
    };

    await list.save();
    return res.json({ message: "Anime updated", list });
  } catch (err) {
    console.error("PUT error:", err);
    return res.status(500).json({ message: "Error updating anime", error: err.message });
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

app.use("/api/list/:userId", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const list = await AnimeList.findOne({ userId });
    
    if (!list) {
      // Create empty list if it doesn't exist
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

// Server
const server = http.createServer(app);
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
});