# OtakuShelf — Profile Page Design Document

## Table of Contents
1. [Page Overview](#1-page-overview)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Header & BottomNav](#4-header--bottomnav)
5. [Page-Level Structure](#5-page-level-structure)
6. [Section 1 — Cinematic Entrance](#6-section-1--cinematic-entrance)
7. [Section 2 — The Wall (Badges)](#7-section-2--the-wall-badges)
8. [Section 3 — The Story Zone](#8-section-3--the-story-zone)
9. [Section 4 — Genre Identity](#9-section-4--genre-identity)
10. [Toast Notifications](#10-toast-notifications)
11. [Loading State](#11-loading-state)
12. [Responsive Breakpoints](#12-responsive-breakpoints)
13. [Key Interactions & Animations](#13-key-interactions--animations)
14. [API Endpoints](#14-api-endpoints)
15. [Render Order](#15-render-order)

---

## 1. Page Overview
**Route:** `/profile` and `/profile/:userId`
**Component:** `ProfilePage`
**File:** `D:\OtakuShelf\otakushelf\src\Frontend\components\profile.jsx`

**Purpose:** Full-page user profile with cinematic hero section, achievement badge wall, recently watched/favorites galleries, and interactive genre breakdown with donut chart.

**Page background:** `#030712` (`.profile-page`)
**Section 2 (The Wall) background:** `#0a0f1a` with dot pattern
**Sections 3 & 4 background:** `#030712`

**Key Features:**
- Full-bleed cinematic hero with cover image, avatar, identity, HUD stats ticker
- Edit profile inline (name, username, bio)
- Upload avatar (2MB max) and cover image (5MB max)
- Share profile via Web Share API or clipboard copy
- Achievement badge wall with XP progress bar, rarity system (5 tiers), spotlight for epic/legendary, filter by category, 6 sort modes
- "Check for New Badges" CTA that evaluates all badge criteria
- Recently watched anime horizontal scroll with featured card and filmstrip grid
- Favorites gallery in masonry grid
- Interactive recharts donut pie chart (19 AniList genres) with proportional pills, scrollable legend, and ticker stats

**Data Sources:**
- `GET /api/profile/:userId` — profile, stats, badges, recently watched, favorites, genres
- `POST /api/profile/:userId/upload-photo` — avatar upload (multipart)
- `POST /api/profile/:userId/upload-cover` — cover upload (multipart)
- `PUT /api/profile/:userId` — update name, bio, username
- `GET /api/badges/all` — all 100 badge definitions
- `POST /api/badges/evaluate/:userId` — trigger badge evaluation
- Library: `recharts` (`PieChart`, `Pie`, `Cell`, `Tooltip`, `ResponsiveContainer`)

---

## 2. Color System

| Token | Hex | Usage |
|---|---|---|
| `--bg-app` | `#030712` | Page, Story Zone, Genre Identity |
| `--bg-wall` | `#0a0f1a` | The Wall section |
| `--bg-hero-end` | `#0a0f1a` | Bottom gradient bleed |
| `--text-primary` | `#ffffff` | Names, titles |
| `--text-secondary` | `#94a3b8` | Bio, subtitles |
| `--text-muted` | `#64748b` | Labels |
| `--accent-amber` | `#f59e0b` | Avatar border, username, genre eyebrow, edit btn border-left, label underlines, XP bar start, pie tooltip percentage |
| `--accent-amber-glow` | `rgba(245,158,11,0.14)` | Avatar hover ring |
| `--accent-gold` | `#fbbf24` | Save btn hover, active badge tab |
| `--accent-red` | `#ef4444` | XP bar midpoint |
| `--accent-purple` | `#c084fc` | XP bar end |
| `--accent-green` | `#4ade80` | Earned badge dates, earned tooltip |
| `--badge-common` | `#94a3b8` | Common rarity |
| `--badge-uncommon` | `#4ade80` | Uncommon rarity |
| `--badge-rare` | `#60a5fa` | Rare rarity |
| `--badge-epic` | `#c084fc` | Epic rarity |
| `--badge-legendary` | `#fbbf24` | Legendary rarity |
| `--chart-colors` | `19-color palette` | Pie chart segments: `#FF6B6B, #4ECDC4, #FFD166, #06D6A0, #118AB2, #EF476F, #073B4C, #7209B7, #3A86FF, #FB5607, #8338EC, #FF006E, #FFBE0B, #3A86FF, #FB5607, #FF595E, #8AC926, #1982C4, #6A4C93` |

---

## 3. Typography

| Font | Family | Usage |
|---|---|---|
| UI/Nav | `'Outfit', sans-serif` | Labels, buttons, inputs, nav, badge card titles |
| Body | `'Bricolage Grotesque', sans-serif` | Body text |
| Hero name | `'Space Grotesk', sans-serif` | `.entrance-name` — `clamp(42px, 5.5vw, 80px)`, weight 900, letter-spacing -1.5px |
| Stats numbers | `'Space Grotesk', sans-serif` | `.hud-number` (38px), `.ss-number` (26px), `.gt-number` (34px) |
| Genre title | `'Space Grotesk', sans-serif` | `.genre-title-large` — `clamp(26px, 3.8vw, 46px)`, weight 800 |
| Watermark | `'Space Grotesk', sans-serif` | `.genre-watermark` — `clamp(72px, 11vw, 152px)`, weight 200, opacity 0.035 |
| Badge card title | 13.5px, weight 800 |
| Badge card desc | 11.5px, color `rgba(255,255,255,0.42)` |
| Badge rarity label | 9.5px, weight 800, uppercase, letter-spacing 1px |
| Spotlight card | 228px wide, 20px border-radius |

---

## 4. Header & BottomNav

**Header:** `<Header showSearch={false} />` — fixed top glassmorphic nav, search disabled
**BottomNav:** `<BottomNavBar />` — fixed bottom mobile-only nav

Both render identically to other pages. No profile-specific customization.

---

## 5. Page-Level Structure

```
<div class="profile-page">                     <!-- #030712, min-height: 100vh -->
  <PageLoader />                               <!-- conditional, onFinish sets showLoader false -->
  <BottomNavBar />
  <Header showSearch={false} />

  <!-- Toast -->
  {toast.show && <div class="settings-toast success|error">{toast.message}</div>}

  <!-- SECTION 1 — Cinematic Entrance -->
  <section class="profile-entrance">
    <input type="file" id="cover-upload" />     <!-- hidden -->
    <input type="file" id="avatar-upload" />    <!-- hidden -->
    <img class="entrance-cover-img" />
    <div class="entrance-gradient-lr" />
    <div class="entrance-gradient-bottom" />
    <label class="cover-change-btn">Change Cover</label>
    <div class="entrance-content">
      <div class="entrance-avatar-zone">
        <div class="entrance-avatar"><img /></div>
        <label class="avatar-change-label">CHANGE PHOTO</label>
      </div>
      <!-- Identity (view mode) OR Edit Form (edit mode) -->
      <div class="entrance-identity">...</div>
      <!-- OR -->
      <div class="entrance-edit-form">...</div>
      <!-- HUD Ticker -->
      <div class="hud-ticker">...</div>
    </div>
    <div class="scroll-indicator">▼</div>
  </section>

  <!-- SECTION 2 — The Wall -->
  <section class="the-wall">
    <div class="wall-inner">
      <div class="wall-eyebrow">ACHIEVEMENTS</div>
      <div class="xp-wrap">XP progress bar</div>
      <button class="check-badges-cta">⚡ Check for New Badges</button>
      <div class="rarity-legend">5 rarity pips</div>
      <div class="spotlight-header">✦ FEATURED</div>
      <div class="spotlight-row">epic/legendary cards</div>
      <div class="badge-controls-row">
        <div class="badge-category-tabs">All | Categories</div>
        <div class="badge-sort-control">Sort by <select /></div>
      </div>
      <div class="badges-grid-new">Earned badges</div>
      <div class="locked-separator">LOCKED — N REMAINING</div>
      <div class="badges-grid-new">Locked badges</div>
    </div>
  </section>

  <!-- SECTION 3 — The Story Zone -->
  <section class="story-zone">
    <div class="story-left">
      <span class="story-label">RECENTLY WATCHED</span>
      <div class="recently-watched-grid masonry-grid">cards</div>
    </div>
    <div class="story-divider" />
    <div class="story-right">
      <span class="story-label">FAVORITES</span>
      <div class="masonry-grid">cards</div>
    </div>
  </section>

  <!-- SECTION 4 — Genre Identity -->
  <section class="genre-identity">
    <div class="genre-ambient" style="background-color: <topGenreColor>" />
    <div class="genre-header-block">
      <div class="genre-watermark">TOP GENRE</div>
      <span class="genre-eyebrow">YOUR TASTE</span>
      <h2 class="genre-title-large">Genre Name</h2>
    </div>
    <div class="genre-pills-row">top 5 proportional pills</div>
    <div class="genre-content">
      <div class="genre-chart-col">
        <ResponsiveContainer><PieChart>donut</PieChart></ResponsiveContainer>
        <div class="genre-ticker">TOTAL | WATCHED | TOP GENRE | COVERAGE</div>
      </div>
      <div class="genre-legend-col">genre bars</div>
    </div>
  </section>
</div>
```

---

## 6. Section 1 — Cinematic Entrance

Full-viewport-height hero section with cinematic cover image, circular avatar, identity block, and HUD stats ticker.

### 6.1 Container
**`.profile-entrance`:**
- `position: relative`, `min-height: 460px`
- `display: flex`, `flex-direction: column`, `overflow: hidden`

### 6.2 Cover Image
**`.entrance-cover-img`:**
- `position: absolute`, `inset: 0`, `100% × 100%`
- `object-fit: cover`, `object-position: center`
- Fallback: `https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1600&q=80`

### 6.3 Gradient Overlays
**`.entrance-gradient-lr`** (left-to-right darken):
```
linear-gradient(to right,
  rgba(3,7,18,1) 0%,
  rgba(3,7,18,0.95) 25%,
  rgba(3,7,18,0.65) 50%,
  rgba(3,7,18,0.15) 80%,
  rgba(3,7,18,0.05) 100%)
```

**`.entrance-gradient-bottom`** (bottom bleed into The Wall):
```
linear-gradient(to top,
  #0a0f1a 0%,
  rgba(10,15,26,0.85) 25%,
  rgba(10,15,26,0.3) 65%,
  transparent 100%)
```
- `position: absolute`, `bottom: 0`, `left: 0`, `right: 0`, `height: 50%`
- `pointer-events: none`

### 6.4 Cover Change Button
**`.cover-change-btn`:**
- `position: absolute`, `top: 100px`, `right: 40px`, `z-index: 20`
- `background: rgba(0,0,0,0.5)`, `backdrop-filter: blur(12px)`
- `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 10px`
- `color: rgba(255,255,255,0.75)`, `font-size: 12px`, `font-weight: 600`
- Hover: `background: rgba(0,0,0,0.75)`, `color: white`
- Mobile: `top: 18px`, `right: 18px`, `padding: 9px 16px`

### 6.5 Avatar Zone
**`.entrance-avatar-zone`:**
- `display: flex`, `flex-direction: column`, `align-items: center`, `gap: 14px`

**`.entrance-avatar`:**
- `width: 210px`, `height: 210px`, `border-radius: 50%`
- `border: 3px solid rgba(245,158,11,0.45)`
- `box-shadow: 0 0 0 7px rgba(245,158,11,0.07), 0 32px 64px rgba(0,0,0,0.75)`
- Hover: `border-color: #f59e0b`, `box-shadow: 0 0 0 7px rgba(245,158,11,0.14)`
- Mobile: `130px`, small mobile: `106px`

**`.entrance-avatar-placeholder`:**
- `background: linear-gradient(135deg, #f59e0b, #d97706)`
- First letter of name, `font-size: 68px`, `font-weight: 800`

**`.avatar-change-label`:**
- `font-size: 9px`, `letter-spacing: 3px`, uppercase, `color: rgba(255,255,255,0.3)`
- Hover: `color: rgba(255,255,255,0.65)`

### 6.6 Identity Block (View Mode)
**`.entrance-identity`:**
- `max-width: 560px`, `gap: 12px`

**`.entrance-name`:**
- `clamp(42px, 5.5vw, 80px)`, `weight: 900`, `font-family: 'Space Grotesk'`
- `letter-spacing: -1.5px`, `line-height: 1`

**`.entrance-username`:** `color: #f59e0b`, `font-size: 17px`, `font-weight: 700`
**`.entrance-joindate`:** `font-size: 13px`, `color: rgba(255,255,255,0.3)`
**`.entrance-bio`:**
- `font-size: 0.98rem`, `line-height: 1.72`, `color: #94a3b8`, `font-style: italic`

### 6.7 Action Buttons
**`.entrance-actions`:**
- `gap: 12px`, `margin-top: 6px`

**`.btn-edit-new`:**
- `padding: 11px 26px`, `border-radius: 10px`
- `background: rgba(255,255,255,0.04)`, `border: 1px solid rgba(255,255,255,0.12)`, `border-left: 3px solid #f59e0b`
- `backdrop-filter: blur(10px)`
- Hover: `background: rgba(245,158,11,0.09)`, `box-shadow: -3px 0 16px rgba(245,158,11,0.15)`

**`.btn-share-new`:**
- `width: 42px`, `height: 42px`, `border-radius: 50%`
- `border: 1px solid rgba(255,255,255,0.1)`, `color: rgba(255,255,255,0.38)`
- SVG share icon 17×17px
- Hover: `color: white`, `background: rgba(255,255,255,0.09)`

### 6.8 Edit Form (Edit Mode)
**`.entrance-edit-form`:**
- `background: rgba(0,0,0,0.55)`, `backdrop-filter: blur(24px)`
- `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 20px`
- `padding: 28px`, `max-width: 500px`

**`.edit-form-group label`:**
- `font-size: 10px`, `letter-spacing: 1.5px`, uppercase, `color: #64748b`

**`.edit-input` / `.edit-textarea`:**
- `background: rgba(255,255,255,0.06)`, `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 10px`
- `color: white`, `font-size: 15px`
- Focus: `border-color: #f59e0b`

**`.btn-save`:** `background: #f59e0b`, `color: black`, `font-weight: 700`; hover `#fbbf24`
**`.btn-cancel`:** `background: transparent`, `color: #64748b`; hover `color: white`

### 6.9 HUD Ticker (Stats Card)
**`.hud-ticker`:**
- `margin-left: auto`, `flex-direction: column`
- `background: rgba(0,0,0,0.42)`, `backdrop-filter: blur(24px)`
- `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 24px`
- `padding: 20px 24px`, `gap: 16px`, `max-width: 520px`
- Mobile: `max-width: 100%`

**Row 1 — Primary Stats:**
| Stat | Key | Font |
|---|---|---|
| ANIME WATCHED | `stats.animeWatched` | 38px Space Grotesk weight 900 |
| HOURS WATCHED | `stats.hoursWatched` | 38px Space Grotesk weight 900 |
| MEAN SCORE | `stats.meanScore` | 38px Space Grotesk weight 900 |

**Row 2 — Secondary Stats:**
| Stat | Key | Font |
|---|---|---|
| WATCHING | `stats.currentlyWatching` | 26px weight 800 |
| PLANNED | `stats.animePlanned` | 26px weight 800 |
| DROPPED | `stats.animeDropped` | 26px weight 800 |
| EPISODES | `stats.totalEpisodes` | 26px weight 800 |
| FAVORITES | `stats.favorites` | 26px weight 800 |

**`.hud-label`:** `8.5px`, `letter-spacing: 2.5px`, uppercase, `color: rgba(255,255,255,0.5)`
**`.ss-label`:** `7.5px`, `letter-spacing: 1.5px`, uppercase, `color: rgba(255,255,255,0.38)`
**`.hud-divider`:** `1px × 36px`, `background: rgba(255,255,255,0.07)`
**`.hud-row-divider`:** `100% × 1px`, `background: rgba(255,255,255,0.08)`

### 6.10 Scroll Indicator
**`.scroll-indicator`:**
- `position: absolute`, `bottom: 40px`, `left: 50%`, `transform: translateX(-50%)`
- SVG chevron (26×26), `animation: scrollBounce 2.2s ease-in-out infinite`

**`@keyframes scrollBounce`:** `translateY(0) opacity 0.35 → translateY(7px) opacity 0.75 → translateY(0) opacity 0.35`

---

## 7. Section 2 — The Wall (Badges)

### 7.1 Container
**`.the-wall`:**
- `background-color: #0a0f1a`
- `background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`
- `background-size: 22px 22px` (dot grid pattern)
- `padding: 72px 0 80px`

**`.wall-inner`:**
- `max-width: 1300px`, `margin: 0 auto`, `padding: 0 52px`
- Mobile: `padding: 0 18px`

### 7.2 Section Eyebrow
**`.wall-eyebrow`:**
- `display: flex`, `align-items: center`, `gap: 18px`, `margin-bottom: 40px`

**`.wall-eyebrow-line`:** `flex: 1`, `height: 1px`, `background: rgba(255,255,255,0.06)`
**`.wall-eyebrow-text`:**
- `font-size: 10px`, `font-weight: 700`, `letter-spacing: 4px`
- `color: rgba(255,255,255,0.2)`, uppercase

### 7.3 XP Progress Bar
**`.xp-wrap`:**
- `display: flex`, `align-items: center`, `gap: 18px`, `margin-bottom: 18px`

**`.xp-bar-full`:**
- `flex: 1`, `height: 13px`, `background: rgba(255,255,255,0.06)`, `border-radius: 100px`

**`.xp-fill`:**
- `height: 100%`, `border-radius: 100px`
- `background: linear-gradient(90deg, #f59e0b 0%, #ef4444 50%, #c084fc 100%)`
- `transition: width 0.9s cubic-bezier(0.25, 1, 0.5, 1)`
- `::after` shimmer: `left: -70% → 130%`, `2.8s ease-in-out infinite`

**`.xp-label`:**
- `font-size: 12px`, `font-weight: 700`, `color: #334155`
- Shows: `{earned} / {total} Badges · {pct}% Complete`

### 7.4 Check Badges CTA
**`.check-badges-cta`:**
- `padding: 13px 44px`, `border-radius: 10px`
- `border: 1px solid rgba(245,158,11,0.35)`
- `background: rgba(245,158,11,0.07)`, `color: #f59e0b`
- Hover: `background: rgba(245,158,11,0.14)`, `border-color: #f59e0b`, `translateY(-2px)`, `box-shadow 0 8px 24px rgba(245,158,11,0.12)`
- Disabled: `opacity: 0.45`

### 7.5 Rarity System

| Rarity | Border | Glow | Label Color |
|---|---|---|---|
| common | `rgba(148,163,184,0.35)` | `rgba(148,163,184,0.15)` | `#94a3b8` |
| uncommon | `rgba(74,222,128,0.45)` | `rgba(74,222,128,0.15)` | `#4ade80` |
| rare | `rgba(96,165,250,0.5)` | `rgba(96,165,250,0.18)` | `#60a5fa` |
| epic | `rgba(192,132,252,0.55)` | `rgba(192,132,252,0.2)` | `#c084fc` |
| legendary | `rgba(251,191,36,0.65)` | `rgba(251,191,36,0.25)` | `#fbbf24` |

**`.rarity-legend`:**
- `display: flex`, `gap: 22px`, `justify-content: center`, `margin-bottom: 40px`

**`.rarity-pip`:**
- `font-size: 11px`, `font-weight: 700`, uppercase
- Color dot: `7px × 7px`, `border-radius: 50%`

### 7.6 Spotlight Row (Epic/Legendary Only)
**`.spotlight-header`:**
- `font-size: 10px`, `letter-spacing: 3px`, `color: rgba(255,255,255,0.25)`, `text-align: center`

**`.spotlight-row`:**
- `display: flex`, `gap: 18px`, `overflow-x: auto`, `padding: 6px 0 28px`
- Hidden scrollbar

**`.spotlight-card`:**
- `flex: 0 0 auto`, `width: 228px`, `border-radius: 20px`, `padding: 24px 20px`
- `background: rgba(15,20,40,0.85)`
- Dynamic border/glow per rarity (inline style)
- Hover: `translateY(-7px) scale(1.02)`

**`.spotlight-emoji`:** `font-size: 54px`
**`.spotlight-title`:** `font-size: 15px`, `font-weight: 800`
**`.spotlight-desc`:** `11.5px`, `color: rgba(255,255,255,0.42)` (line-clamp 2 on mobile)
**`.spotlight-date`:** `11px`, `color: #4ade80`

### 7.7 Badge Controls
**`.badge-controls-row`:**
- `display: flex`, `justify-content: space-between`, `margin-bottom: 22px`
- Mobile: `flex-direction: column`

**`.badge-category-tabs`:**
- `display: flex`, `flex-wrap: wrap`, `gap: 8px`
- Tabs: "All" + dynamic categories from badge defs

**`.badge-cat-tab`:**
- `padding: 7px 16px`, `border-radius: 100px`
- `border: 1px solid rgba(255,255,255,0.09)`, `color: rgba(255,255,255,0.45)`
- Active: `linear-gradient(135deg, rgba(245,158,11,0.14), rgba(239,68,68,0.12))`, `border-color: rgba(245,158,11,0.6)`, `color: #fbbf24`

**`.badge-sort-control`**: label (`9.5px`, uppercase, `#334155`) + `<select>` (dark, white text, 8px radius)

**Sort options:**
1. Rarity (Highest) — default
2. Rarity (Lowest)
3. Date (Newest)
4. Date (Oldest)
5. Name (A–Z)
6. Name (Z–A)

### 7.8 Badge Grids
**`.badges-grid-new`:**
- `display: grid`, `grid-template-columns: repeat(auto-fill, minmax(196px, 1fr))`, `gap: 14px`
- Mobile: `minmax(160px, 1fr)`, small mobile: `minmax(140px, 1fr)`

**`.badge-card-new`:**
- `border-radius: 18px`, `padding: 18px 16px`
- `display: flex`, `flex-direction: column`, `gap: 10px`

**Earned (`.earned`):**
- `background: rgba(12,18,38,0.85)`
- Dynamic border/glow per rarity
- Hover: `translateY(-5px) scale(1.02)`

**Locked (`.locked`):**
- `background: rgba(255,255,255,0.02)`, `border: 1px solid rgba(255,255,255,0.06)`
- `filter: saturate(0.22)`, `opacity: 0.42`
- Lock icon overlay (🔒) with `blur(2px)` background
- Hover: `opacity: 0.58`, `filter: saturate(0.38)`

**`.badge-emoji`:** `font-size: 40px`
**`.badge-card-title`:** `font-size: 13.5px`, `font-weight: 800`
**`.badge-rarity-label`:** `9.5px`, `font-weight: 800`, uppercase
**`.badge-earned-date`:** `10.5px`, `color: #4ade80`

### 7.9 Locked Separator
**`.locked-separator`:**
- `display: flex`, `align-items: center`, `gap: 16px`, `margin: 8px 0 22px`

**`.locked-sep-line`:** `flex: 1`, `height: 1px`, `background: rgba(255,255,255,0.05)`
**`.locked-sep-text`:** `font-size: 9px`, `letter-spacing: 2.5px`, `color: rgba(255,255,255,0.18)`, uppercase

### 7.10 State Calculations
- `earnedIds`: `Set(badges.map(b => b.id))`
- `enrichedBadges`: all badge defs + `earned: boolean` + `earnedDate`
- `sortedBadges`: filtered by `badgeFilter`, sorted by 6 modes
- `spotlightBadges`: earned badges with rarity `epic` or `legendary`
- `badgePct`: `Math.round((earnedCount / totalDefs) * 100)`

---

## 8. Section 3 — The Story Zone

### 8.1 Container
**`.story-zone`:**
- `display: flex`, `flex-direction: column`
- `padding: 72px 6%`, `background: #030712`
- `border-top: 1px solid rgba(255,255,255,0.04)`
- `border-bottom: 1px solid rgba(255,255,255,0.04)`

### 8.2 Section Labels
**`.story-label`:**
- `font-size: 9.5px`, `font-weight: 700`, `letter-spacing: 4px`, uppercase
- `color: rgba(255,255,255,0.28)`
- `border-bottom: 2px solid #f59e0b`, `width: fit-content`, `padding-bottom: 10px`

### 8.3 Recently Watched (Left)
**`.story-left`:**
- `width: 100%`, `max-width: 1196px`, `margin: 0 auto`, `padding-bottom: 48px`

**`.recently-watched-grid`:**
- `display: grid`, `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))`, `gap: 14px`
- `≤900px`: `minmax(160px, 1fr)`
- `≤480px`: `minmax(140px, 1fr)`

### 8.4 Favorites (Right)
**`.story-right`:**
- `width: 100%`, `max-width: 1196px`, `margin: 0 auto`

**`.masonry-grid`:**
- `display: grid`, `grid-template-columns: repeat(8, 1fr)`, `gap: 12px`
- Mobile (`≤768px`): `repeat(3, 1fr)`
- Small mobile (`≤480px`): `repeat(2, 1fr)`, `gap: 10px`

**`.masonry-card`:**
- `border-radius: 13px`, `overflow: hidden`, `aspect-ratio: 2/3`
- Hover: `inset box-shadow: 0 0 0 2px rgba(245,158,11,0.5)`

**`.masonry-overlay`:**
- `position: absolute`, `bottom: 0`, `left: 0`, `right: 0`
- `padding: 14px 10px 10px`
- `background: linear-gradient(to top, rgba(0,0,0,0.9), transparent)`

**`.masonry-title`:**
- `font-size: 11.5px`, `font-weight: 600`, `color: white`
- `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`

### 8.5 Story Divider
**`.story-divider`:**
- `width: 100%`, `max-width: 1196px`, `height: 1px`
- `background: rgba(245,158,11,0.18)`
- `margin: 0 auto 48px`

### 8.6 Empty States
**`.story-empty`:**
- `font-size: 14px`, `color: rgba(255,255,255,0.22)`, `font-style: italic`, `padding: 40px 0`

---

## 9. Section 4 — Genre Identity

### 9.1 Container
**`.genre-identity`:**
- `position: relative`, `padding: 80px 6% 90px`, `overflow: hidden`, `background: #030712`

### 9.2 Ambient Glow
**`.genre-ambient`:**
- `position: absolute`, `top: -120px`, `left: -100px`
- `width: 650px`, `height: 550px`, `border-radius: 50%`
- `opacity: 0.06`, `filter: blur(130px)`
- `pointer-events: none`
- `transition: background-color 0.8s`
- Color set via inline style to top genre color

### 9.3 Editorial Header
**`.genre-watermark`:**
- `position: absolute`, `top: -18px`, `left: -6px`
- `clamp(72px, 11vw, 152px)`, `font-weight: 200`, `font-family: 'Space Grotesk'`
- `color: rgba(255,255,255,0.035)`, `letter-spacing: -4px`, uppercase
- Mobile: `48px`, small mobile: `42px`

**`.genre-eyebrow`:**
- `font-size: 9.5px`, `font-weight: 700`, `letter-spacing: 5px`
- `color: #f59e0b`, uppercase

**`.genre-title-large`:**
- `clamp(26px, 3.8vw, 46px)`, `font-weight: 800`, `font-family: 'Space Grotesk'`

### 9.4 Genre Pills (Top 5)
**`.genre-pills-row`:**
- `display: flex`, `gap: 6px`, `margin-bottom: 56px`, `flex-wrap: nowrap`
- Mobile: `flex-wrap: wrap`, `gap: 10px`

**`.genre-pill`:**
- `height: 40px`, `border-radius: 100px`
- `display: flex`, `align-items: center`, `justify-content: center`, `flex-direction: column`
- `min-width: 50px`, `padding: 0 10px`
- `flexBasis`: `Math.max(genre.value, 6)%` (inline)
- Hover: `translateY(-3px)`
- Mobile: `height: 34px`, small mobile: `height: 30px`

**`.genre-pill-name`:** `font-size: 11px`, `font-weight: 700`, `text-shadow: 0 1px 5px rgba(0,0,0,0.6)`
**`.genre-pill-pct`:** `font-size: 9px`, `color: rgba(255,255,255,0.65)` (hidden on mobile)

### 9.5 Chart + Legend Layout
**`.genre-content`:**
- `display: grid`, `grid-template-columns: 1fr 1fr`, `gap: 52px`
- `≤1100px`: single column

### 9.6 Pie Chart
**`.pie-chart-wrapper`:**
- `background: rgba(0,0,0,0.1)`, `border-radius: 20px`, `padding: 16px`

**PieChart config:**
- `<ResponsiveContainer width="100%" height={380}>`
- `<Pie>`: donut (`innerRadius: 70`, `outerRadius: 175`), `cx: 50%`, `cy: 50%`
- Filtered data: genres with `value > 0`
- 19-color palette applied to `Cell` components
- Custom label renderer: shows percentage if > 3%
- Center text: `{watchedGenres}` (30px) + "Genres" (13px)
- `<Tooltip content={<CustomTooltip />}>`

**`.custom-tooltip`:**
- `background: rgba(10,15,35,0.97)`, `border: 1px solid rgba(255,255,255,0.08)`
- `border-radius: 12px`, `padding: 12px 16px`, `backdrop-filter: blur(20px)`
- Genre name: 13px, bold, white
- Percentage: 20px, bold, `#f59e0b`
- Count: 12px, `#475569`

### 9.7 Genre Ticker
**`.genre-ticker`:**
- `display: flex`, `align-items: center`, `justify-content: center`
- `padding: 20px 0`, `border-top: 1px solid rgba(255,255,255,0.05)`

| Stat | Label |
|---|---|
| 19 | TOTAL |
| `watchedGenres` | WATCHED |
| `topPercentage%` | TOP GENRE |
| `coveragePct%` | COVERAGE |

**`.gt-number`:** `34px`, `font-weight: 900`, `font-family: 'Space Grotesk'`
**`.gt-label`:** `8.5px`, `letter-spacing: 2px`, uppercase, `color: #334155`

### 9.8 Genre Legend
**`.genre-legend-col`:**
- `max-height: 520px`, `overflow-y: auto`
- `scrollbar-width: thin`, `scrollbar-color: rgba(255,255,255,0.07) transparent`
- Mobile: `max-height: none`

**`.genre-legend-item`:**
- `display: flex`, `flex-direction: column`, `gap: 5px`

**`.gli-name`:** `font-size: 13px`, `font-weight: 600`, `color: rgba(255,255,255,0.82)`
**`.gli-bar-wrap`:** `height: 5px`, `background: rgba(255,255,255,0.06)`, `border-radius: 100px`
**`.gli-bar`:** `height: 100%`, `border-radius: 100px`, `transition: width 0.9s`, `min-width: 4px`, color per genre
**`.gli-meta`:** `font-size: 11px`, `color: #334155`, format: `{pct}% · {count} anime`

---

## 10. Toast Notifications

**`.settings-toast`:**
- `position: fixed`, `top: 90px`, `right: 32px`, `z-index: 9999`
- `padding: 14px 28px`, `border-radius: 14px`
- `font-size: 15px`, `font-weight: 600`
- `backdrop-filter: blur(24px)`, `box-shadow: 0 12px 40px rgba(0,0,0,0.4)`
- `animation: toastSlide 0.35s`

**`.settings-toast.success`:** `background: rgba(16,185,129,0.2)`, `color: #6ee7b7`, `border: 1px solid rgba(16,185,129,0.4)`
**`.settings-toast.error`:** `background: rgba(239,68,68,0.2)`, `color: #fca5a5`, `border: 1px solid rgba(239,68,68,0.4)`

Auto-dismiss after 3.5s.

---

## 11. Loading State

**`.profile-loading`:**
- `position: fixed`, `inset: 0`, `z-index: 9999`
- `display: flex`, `justify-content: center`, `align-items: center`
- `background: linear-gradient(180deg, #0a0f1e 0%, #161b2e 100%)`

**`.loading-spinner`:** `48px`, `border: 3px solid rgba(245,158,11,0.18)`, `border-top-color: #f59e0b`, `animation: profileSpin 1s linear infinite`
**`.loading-text`:** "Loading Your Anime Journey", `font-size: 22px`, `font-weight: 700`
**`.loading-subtext`:** "Preparing your stats, favorites, and anime collection...", `font-size: 14px`, `color: #475569`

**Initial load:** `<PageLoader />` renders first (full-screen cinematic intro), then `onFinish` callback hides it.

When `!profileData` and `!showLoader`, shows centered loading screen with spinner + text.

---

## 12. Responsive Breakpoints

| Breakpoint | Changes |
|---|---|
| `≤ 1100px` | Genre content → single column; legend `max-height: none` |
| `≤ 900px` | HUD ticker full width (`max-width: 100%`), stats wrap to 2-column (`flex: 1 1 50%`), dividers hidden |
| `≤ 768px` | Hero → stacked centered column; avatar 130px; name `clamp(32px, 7vw, 52px)`; HUD 580px max-width; wall padding 0 18px; badges `minmax(160px)`; controls column; story padding 42px 5%; masonry `repeat(3)`; filmstrip `1fr`; genre pills wrap; watermark 48px; title `clamp(28px, 6vw, 38px)` |
| `≤ 480px` | Avatar 106px; name 32px; badges `minmax(140px)`; masonry `repeat(2)`; genre pills 30px height; watermark 42px; ripple desc line-clamp 2 |

---

## 13. Key Interactions & Animations

| Interaction | Behavior |
|---|---|
| **Cover hover** | Image scales slightly (via CSS) |
| **Avatar hover** | Border brightens to `#f59e0b`, glow ring widens |
| **Edit Profile** | Identity block replaced by glassmorphic edit form |
| **Save/Cancel** | Triggers `PUT /api/profile/:userId`, shows toast |
| **Share** | Web Share API (mobile) or clipboard copy |
| **Badge Card hover (earned)** | `translateY(-5px) scale(1.02)` |
| **Badge Card hover (locked)** | `opacity: 0.42 → 0.58`, `saturate: 0.22 → 0.38` |
| **Spotlight card hover** | `translateY(-7px) scale(1.02)` |
| **Genre pill hover** | `translateY(-3px)` |
| **XP bar** | Animated width with shimmer overlay |
| **Check Badges** | POST to evaluate, shows toast with result |
| **Badge category tab** | Filters grid by category, active state amber gradient |
| **Badge sort** | Reorders grid by 6 modes |
| **Pie chart hover** | Custom tooltip with name, %, count |
| **Masonry card hover** | Amber inset border appears (2px) |
| **Scroll indicator** | Bounces continuously (2.2s loop) |
| **Last updated** | `toastSlide` animation (0.35s) |

**Keyframes:**
- `scrollBounce` — hero chevron (2.2s)
- `xpShimmer` — XP bar reflective sweep (2.8s)
- `profileSpin` — loading spinner (1s)
- `toastSlide` — notification slide-in (0.35s)

---

## 14. API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/profile/:userId` | GET | Fetch profile, stats, badges, recently watched, favorites, genres |
| `/api/profile/:userId` | PUT | Update name, bio, username |
| `/api/profile/:userId/upload-photo` | POST | Upload avatar (multipart, max 2MB) |
| `/api/profile/:userId/upload-cover` | POST | Upload cover (multipart, max 5MB) |
| `/api/badges/all` | GET | All badge definitions (~100) |
| `/api/badges/evaluate/:userId` | POST | Trigger badge re-evaluation |
| `/api/list/:userId/backfill-genres` | POST | Backfill genre data (admin/debug) |

---

## 15. Render Order

```
1. <PageLoader />                        — full-screen intro (conditional, auto-hides)

2. <BottomNavBar />                      — fixed bottom

3. <Header showSearch={false} />         — fixed top

4. Toast                                 — fixed top-right (conditional)

5. <section class="profile-entrance">
   a. Hidden file inputs                 — #cover-upload, #avatar-upload
   b. Cover image                        — full-bleed, Unsplash fallback
   c. entrance-gradient-lr               — L→R darken
   d. entrance-gradient-bottom            — bottom bleed into The Wall
   e. "Change Cover" button              — absolute top-right
   f. entrance-content
      i.   Avatar zone                   — circular avatar + "CHANGE PHOTO"
      ii.  Identity block OR edit form   — name/username/bio/actions
      iii. HUD ticker                    — 3 primary stats + divider + 5 secondary stats
   g. Scroll indicator                   — bouncing chevron

6. <section class="the-wall">
   a. Eyebrow                           — "ACHIEVEMENTS" with lines
   b. XP bar                            — gradient fill + shimmer + label
   c. Check Badges CTA                  — amber pill button
   d. Rarity legend                     — 5 colored pips
   e. Spotlight row                     — epic/legendary cards (horizontal scroll)
   f. Badge controls                    — category tabs + sort dropdown
   g. Earned badge grid                 — auto-fill grid, rarity-colored borders
   h. Locked separator                  — "LOCKED — N REMAINING"
   i. Locked badge grid                 — desaturated, lock overlay

7. <section class="story-zone">
   a. Story left                        — "RECENTLY WATCHED" + auto-fit grid
   b. Story divider                     — amber line
   c. Story right                       — "FAVORITES" + 8-column masonry grid

8. <section class="genre-identity">
   a. Ambient glow                      — blurred color blob
   b. Editorial header                  — watermark + eyebrow + large title
   c. Genre pills                       — top 5 proportional colored bars
   d. Genre content
      i.  Chart column                  — donut pie chart (recharts) + ticker
      ii. Legend column                 — scrollable genre bars with % + count
```

---

*This document provides complete UI specification for the Profile page. All component dimensions, colors, spacing, responsive breakpoints, and interaction behaviors are defined to enable faithful React Native implementation.*
