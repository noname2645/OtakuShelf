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
import dotenv from "dotenv";
import { title } from 'process';
dotenv.config();



const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173", // vite
  "https://yesotakushelf.onrender.com"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));


app.use(express.json());

app.use(compression());

// health check (for uptime pinger)
app.get('/healthz', (req, res) => res.send('ok'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/animeApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

// =======================
// User Schema + Model
// =======================
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // optional (only for local accounts)
  authType: { type: String, enum: ["local", "google"], required: true },
  photo: { type: String }, // field for profile pictures
  name: { type: String }, // field for Google users
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

// Session middleware (needed for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || "mysecret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set secure:true only with https
}));

app.use(passport.initialize());
app.use(passport.session());


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
          photo: profile.photos?.[0]?.value || null, // Save photo to database
          name: profile.displayName || null // Save name
        });
        await user.save();
      } else {
        // Update existing user with photo if missing
        if (!user.photo && profile.photos?.[0]?.value) {
          user.photo = profile.photos[0].value;
          await user.save();
        }
        // Update name if missing
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
  const user = await User.findById(id);
  done(null, user);
});


// =======================
// Auth Routes
// =======================

// Register
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashed,
      authType: "local",
    });

    await newUser.save();
    res.json({ message: "Registration successful!" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt:", email);

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.authType !== "local") {
      return res.status(400).json({ message: "This account uses Google login only" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Store user in session for consistency
    req.login(user, (err) => {
      if (err) {
        console.error("Session login error:", err);
        return res.status(500).json({ message: "Session error" });
      }

      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

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



// Trigger Google login
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google callback
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Make sure this URL matches where your frontend is running
    res.redirect(`${process.env.FRONTEND_URL}/home`);
  }
);
// Check current user
app.get("/auth/me", (req, res) => {
  console.log("Auth me called, isAuthenticated:", req.isAuthenticated());
  console.log("Session user:", req.user);

  if (req.isAuthenticated()) {
    res.json({
      user: {
        _id: req.user._id,
        email: req.user.email,
        authType: req.user.authType,
        photo: req.user.photo || null,
        name: req.user.name || null
      }
    });
  } else {
    res.status(401).json({ message: "Not logged in" });
  }
});


// Logout
app.get("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout error" });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });
});


// =======================
// Anime List Routes
// =======================

// Get user's anime list
app.get("/api/list/:userId", async (req, res) => {
  try {
    const list = await AnimeList.findOne({ userId: req.params.userId });
    if (!list) return res.json({ watching: [], completed: [], planned: [], dropped: [] });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Error fetching list", error: err.message });
  }
});

// Update anime list (add/remove)
app.post("/api/list/:userId", async (req, res) => {
  try {
    const { category, animeTitle, animeData } = req.body;
    const userId = req.params.userId;

    if (!["watching", "completed", "planned", "dropped"].includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    let list = await AnimeList.findOne({ userId });
    if (!list) {
      list = new AnimeList({
        userId,
        watching: [],
        completed: [],
        planned: [],
        dropped: []
      });
    }

    // Check if anime already exists in any category
    const allCategories = ['watching', 'completed', 'planned', 'dropped'];
    for (const cat of allCategories) {
      const index = list[cat].findIndex(item => item.title === animeTitle);
      if (index !== -1) {
        // Remove from current category if it exists elsewhere
        list[cat].splice(index, 1);
      }
    }

    // Add to the specified category with enhanced data
    const animeEntry = {
      title: animeTitle,
      animeId: animeData?.id || animeData?.mal_id || null,
      malId: animeData?.mal_id || animeData?.id || null,
      image: animeData?.images?.jpg?.large_image_url ||
        animeData?.coverImage?.large ||
        animeData?.image_url ||
        null,
      addedDate: new Date()
    };

    // Add category-specific fields
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
    res.status(500).json({ message: "Error updating list", error: err.message });
  }
});


// Get specific anime list with details
app.get("/api/list/:userId/:animeId", async (req, res) => {
  try {
    const list = await AnimeList.findOne({ userId: req.params.userId });
    if (!list) return res.status(404).json({ message: "List not found" });

    // Find anime in any category
    let anime = null;
    const categories = ['watching', 'completed', 'planned', 'dropped'];

    for (const category of categories) {
      anime = list[category].find(item => item._id.toString() === req.params.animeId);
      if (anime) break;
    }

    if (!anime) return res.status(404).json({ message: "Anime not found" });

    res.json(anime);
  } catch (err) {
    res.status(500).json({ message: "Error fetching anime", error: err.message });
  }
});

// Update anime in list
app.put("/api/list/:userId/:animeId", async (req, res) => {
  try {
    const { startDate, finishDate, userRating, episodesWatched, notes, category } = req.body;
    const list = await AnimeList.findOne({ userId: req.params.userId });

    if (!list) return res.status(404).json({ message: "List not found" });  // ✅ add return

    const animeIndex = list[category].findIndex(item => item._id.toString() === req.params.animeId);
    if (animeIndex === -1) {
      return res.status(404).json({ message: "Anime not found in specified category" }); // ✅ add return
    }

    // Update
    list[category][animeIndex] = {
      ...list[category][animeIndex]._doc, // keep old fields like title/image
      startDate: startDate ? new Date(startDate) : list[category][animeIndex].startDate,
      finishDate: finishDate ? new Date(finishDate) : list[category][animeIndex].finishDate,
      userRating: userRating ?? list[category][animeIndex].userRating,
      episodesWatched: episodesWatched ?? list[category][animeIndex].episodesWatched,
      notes: notes ?? list[category][animeIndex].notes,
    };

    await list.save();
    return res.json({ message: "Anime updated", list });  // ✅ final response
  } catch (err) {
    console.error("PUT error:", err);
    return res.status(500).json({ message: "Error updating anime", error: err.message }); // ✅ final fallback
  }
});


// Remove anime from list
app.delete("/api/list/:userId/:animeId", async (req, res) => {
  try {
    const list = await AnimeList.findOne({ userId: req.params.userId });

    if (!list) return res.status(404).json({ message: "List not found" });

    // Find and remove anime from any category
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
    res.status(500).json({ message: "Error removing anime", error: err.message });
  }
});

// =======================
// Other Routes
// =======================
app.use('/api/anime', animeRoutes);
app.use('/api/anilist', anilistRoutes);

// Server
const server = http.createServer(app);

// help avoid 502s on cold networks / free tiers
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});