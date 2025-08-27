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
dotenv.config();



const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173", // vite
  "https://yourfrontenddomain.com"
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
});
const User = mongoose.model("User", userSchema);

// =======================
// Anime List Schema
// =======================
const animeListSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  watching: [String],
  completed: [String],
  planned: [String],
  dropped: [String],
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
    callbackURL: "http://localhost:5000/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ email: profile.emails[0].value });

      if (!user) {
        user = new User({
          email: profile.emails[0].value,
          authType: "google",
        });
        await user.save();
      }

      // attach profile pic to session user object
      user.photo = profile.photos?.[0]?.value || null;

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
          photo: null
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
  passport.authenticate("google", { failureRedirect: "http://localhost:3000/login" }),
  (req, res) => {
    // Make sure this URL matches where your frontend is running
    res.redirect("http://localhost:3000/home");
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
        photo: req.user.photo || null 
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

// Get userâ€™s anime list
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
    const { category, animeTitle } = req.body; // e.g. { category: "watching", animeTitle: "One Piece" }

    let list = await AnimeList.findOne({ userId: req.params.userId });
    if (!list) {
      list = new AnimeList({ userId: req.params.userId, watching: [], completed: [], planned: [], dropped: [] });
    }

    if (!["watching", "completed", "planned", "dropped"].includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    if (!list[category].includes(animeTitle)) {
      list[category].push(animeTitle);
    }

    await list.save();
    res.json({ message: "Anime list updated", list });
  } catch (err) {
    res.status(500).json({ message: "Error updating list", error: err.message });
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