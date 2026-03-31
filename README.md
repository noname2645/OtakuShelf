<div align="center">

# 🎌 OtakuShelf

**A full-stack anime tracking platform with an AI companion, MAL import, and real-time trailer discovery.**

[![React](https://img.shields.io/badge/React_18-61dafb?style=flat-square&logo=react&logoColor=61dafb&labelColor=0d0f1a)](https://react.dev)
[![Express](https://img.shields.io/badge/Express.js-339933?style=flat-square&logo=node.js&logoColor=339933&labelColor=0d0f1a)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-47a248?style=flat-square&logo=mongodb&logoColor=47a248&labelColor=0d0f1a)](https://mongodb.com)
[![Mistral AI](https://img.shields.io/badge/Mistral_AI-ff7700?style=flat-square&labelColor=0d0f1a)](https://mistral.ai)
[![License](https://img.shields.io/badge/License-MIT-a78bfa?style=flat-square&labelColor=0d0f1a)](LICENSE)

[Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## 📌 Quick Overview

- Full-stack MERN application with JWT + Google OAuth authentication and protected REST API routes
- AI chat assistant (OtakuAI) built on Mistral with Retrieval-Augmented Generation (RAG) using live AniList data
- MyAnimeList XML import with real-time WebSocket progress streaming and dual image source fallback
- Anime discovery via AniList's GraphQL API — six curated sections, advanced filtering, and a full-screen YouTube trailer hero
- User profile system with genre analytics (interactive donut chart), episode tracking, star ratings, and badges

---

## 💡 Motivation

Most anime trackers are either too basic or locked behind closed ecosystems. I wanted to build something genuinely useful — where you can track what you're watching, import your existing MAL history, and get intelligent recommendations through an actual AI conversation rather than a static algorithm.

OtakuShelf was also a deliberate attempt to learn full-stack development end-to-end: designing a production-grade REST API, handling OAuth flows, consuming third-party GraphQL APIs, and shipping a polished, responsive React frontend — all as a solo project.

---

## 🖼️ Screenshots

| Home — Trailer Hero | AI Chat (OtakuAI) | Anime List |
|:-:|:-:|:-:|
| ![Home](./screenshots/home.png) | ![AI](./screenshots/ai.png) | ![List](./screenshots/list.png) |

| Advanced Search | User Profile |
|:-:|:-:|
| ![Search](./screenshots/search.png) | ![Profile](./screenshots/profile.png) |

> Screenshots directory not yet committed. Run locally to preview the app.

---

## ✨ Features

### 🎬 Anime Discovery
- Full-screen trailer hero with YouTube embeds, mute control, auto-rotation, and next-up previews
- Six curated carousels — Top Airing, Trending, Most Watched, Top Rated, Movies, Upcoming
- Advanced search with filters for genre, season, year, score, format, and airing status
- Stale-while-revalidate caching: instant render from `localStorage`, silent background refresh every 30 minutes

### 🤖 AI Companion — OtakuAI
- RAG pipeline: user queries are enriched with live AniList data before being passed to Mistral
- Conversation history (last 10 messages) maintained across turns for coherent dialogue
- AI-mentioned anime are verified against AniList and rendered as interactive recommendation cards
- Typewriter streaming effect for a natural, chat-like feel

### 📋 List Management
- Four categories: Watching, Completed, Planned, Dropped
- Episode progress tracker with auto-completion when the final episode is logged
- 5-star rating system with optimistic UI updates and server sync
- Cards grouped by month/year with inline status switching via dropdown badge

### 📥 MAL Import
- Upload a MyAnimeList XML export — all five statuses mapped automatically
- Real-time import progress streamed over WebSocket
- Cover images sourced from Jikan API, with AniList GraphQL as fallback
- Supports merge mode (add new entries) and replace mode (clean slate)

### 🔐 Auth & Security
- Dual auth strategy: JWT for API calls, Passport.js sessions for Google OAuth
- Password reset via SHA-256 hashed tokens with 15-minute expiry, delivered by Nodemailer
- `authenticateToken` + `authorizeUser` middleware enforces strict per-user data isolation
- Helmet, CORS allowlist, and rate limiting (5 auth attempts / 100 API requests per 15 min)

### 👤 Profile
- Avatar and cover image upload with MIME type validation and file size limits
- Interactive genre breakdown donut chart (Recharts) spanning all 19 AniList genres
- Computed stats: episodes watched, hours, mean score, favorites, and watch counts per category
- One-click genre backfill — fetches missing genre metadata from AniList for imported anime

---

## 🏗️ Project Structure

```
otakushelf/src/
│
├── Backend/
│   ├── server.js               # Express app, auth, list & profile routes, WebSocket server
│   ├── aiChat.js               # Mistral AI integration + RAG pipeline
│   ├── routes/
│   │   ├── animeRoutes.js      # Anime sections, search, single anime detail
│   │   └── anilistRoute.js     # Hero trailers with 6-hour in-memory cache
│   ├── models/
│   │   ├── User.js             # User schema with nested profile subdocument
│   │   └── AnimeList.js        # Per-category anime entry subdocuments
│   └── utils/
│       ├── authMiddleware.js   # JWT verification + resource ownership guard
│       └── responseHandler.js  # Unified { status, message, data } response format
│
└── Frontend/
    ├── App.jsx                 # Router setup + AnimatePresence page transitions
    ├── api.js                  # Axios instance with JWT interceptor
    ├── components/
    │   ├── home.jsx            # Homepage with SWR caching and drag carousels
    │   ├── TrailerHero.jsx     # YouTube IFrame API hero section
    │   ├── aipage.jsx          # OtakuAI chat interface
    │   ├── list.jsx            # Anime list management + WebSocket MAL import
    │   ├── modal.jsx           # Anime detail modal (info / related / trailer tabs)
    │   ├── profile.jsx         # Profile page with Recharts genre chart
    │   ├── AuthContext.jsx     # Global auth state with exponential backoff retry
    │   ├── AnimeTransition.jsx # Per-route themed transition animations
    │   └── relatedsection.jsx  # Sequel/prequel data via AniList + Jikan
    └── Stylesheets/            # Per-component CSS + global mobile.css as final cascade
```

---

## 🛠️ Tech Stack

**Backend**

| Technology | Role |
|---|---|
| Express.js | REST API server |
| MongoDB + Mongoose | Database and ODM |
| Passport.js + JWT | Google OAuth 2.0 and stateless auth tokens |
| Mistral AI | LLM powering OtakuAI |
| AniList GraphQL | Primary anime data source |
| Jikan REST API | MAL image and relation fallback |
| ws (WebSocket) | Real-time import progress streaming |
| Nodemailer | Password reset email delivery |
| Helmet + express-rate-limit | Security headers and rate limiting |
| bcryptjs | Password hashing (cost factor 12) |

**Frontend**

| Technology | Role |
|---|---|
| React 18 + Vite | UI framework and build tooling |
| React Router v6 | Client-side routing |
| Framer Motion | Page transitions and UI animations |
| Axios | HTTP client with JWT request interceptor |
| Recharts | Genre analytics donut chart |
| ReactMarkdown | AI chat response rendering |
| YouTube IFrame API | Hero trailer video player |

---

## 🌐 Deployment Architecture

```
User Browser
    │
    ▼
React SPA (Vite build) ──────────── Static hosting
    │
    │  HTTP requests  (JWT in Authorization header)
    │  WebSocket      (MAL import progress)
    ▼
Express.js API Server ───────────── Node.js hosting (e.g. Render)
    │
    ├── AniList GraphQL API   anime data          (no API key required)
    ├── Jikan REST API        MAL image fallback  (public)
    ├── Mistral AI API        OtakuAI responses   (API key)
    └── MongoDB Atlas         users, lists, sessions
```

**Production notes:**
- Frontend pings `/api/ping` on load to wake the backend from cold start
- Auth layer retries with exponential backoff: 3s → 6s → 12s on network failure
- Hero trailer data cached in memory for 6 hours; anime sections cached for 10 minutes

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB (local instance or Atlas cluster)
- Google Cloud OAuth credentials
- Mistral AI API key
- Gmail account with App Password enabled

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/otakushelf.git
cd otakushelf

# 2. Install backend dependencies
cd src/Backend
npm install

# 3. Install frontend dependencies
cd ../Frontend
npm install
```

### Environment Variables

Create `src/Backend/.env.development`:

```env
NODE_ENV=development
PORT=5000

MONGO_URI=mongodb://localhost:27017/otakushelf

JWT_SECRET=your_jwt_secret_min_32_chars
SESSION_SECRET=your_session_secret_min_32_chars

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

MISTRAL_API_KEY=your_mistral_api_key

EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

FRONTEND_URL=http://localhost:5173
```

Create `src/Frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### Run Locally

```bash
# Terminal 1 — start backend
cd src/Backend && npm run dev

# Terminal 2 — start frontend
cd src/Frontend && npm run dev
```

Open **http://localhost:5173**

---

## 🔒 Security Notes

- All protected routes require a valid JWT (`Authorization: Bearer <token>`)
- `authorizeUser` middleware verifies the requesting user matches the target resource — no cross-user data access is possible
- Password reset tokens are SHA-256 hashed server-side before storage and expire after 15 minutes
- File uploads are validated for MIME type, extension, and file size before saving to disk

---

## 🤝 Contributing

```bash
# Fork the repo, create a branch, and open a PR
git checkout -b feature/your-feature-name
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
```

Please follow conventional commit prefixes: `feat:` `fix:` `docs:` `refactor:`

---

## 🙏 Acknowledgements

- [AniList](https://anilist.co) — Free GraphQL anime database
- [Jikan](https://jikan.moe) — Unofficial MyAnimeList REST API
- [Mistral AI](https://mistral.ai) — LLM behind OtakuAI
- [Framer Motion](https://framer.com/motion) — Animation library
- [Recharts](https://recharts.org) — React charting library

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**[⬆ Back to Top](#-otakushelf)**

</div>
