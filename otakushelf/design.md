# OtakuShelf — Profile Page Design Document

## Table of Contents
1. [Page Overview](#1-page-overview)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Header](#4-header)
5. [Bottom Navigation Bar](#5-bottom-navigation-bar)
6. [Page-Level Structure](#6-page-level-structure)
7. [Section 1 — Cinematic Entrance](#7-section-1--cinematic-entrance)
8. [Section 2 — The Wall (Badges)](#8-section-2--the-wall-badges)
9. [Section 3 — The Story Zone](#9-section-3--the-story-zone)
10. [Section 4 — Genre Identity](#10-section-4--genre-identity)
11. [Toast Notifications](#11-toast-notifications)
12. [Responsive Breakpoints](#12-responsive-breakpoints)
13. [Key Interactions & Animations](#13-key-interactions--animations)
14. [API Endpoints](#14-api-endpoints)
15. [Render Order](#15-render-order)

---

## 1. Page Overview
**Route:** `/profile` and `/profile/:userId`
**Component:** `ProfilePage`
**Purpose:** Full-page user profile with cinematic hero, achievement badges, recently watched grid, favorites gallery, and genre identity breakdown with interactive pie chart.

**Page background:** `#030712`

**Key Features:**
- Cinematic hero with full-bleed cover image, avatar, identity, and HUD stats ticker
- Edit profile inline (name, username, bio)
- Upload avatar and cover image
- Share profile via Web Share API or clipboard
- Achievement badge wall (earned + locked, with rarity system, spotlight, filtering, sorting)
- Recently watched anime masonry grid
- Favorites gallery masonry grid
- Interactive genre pie chart (recharts) with proportional pills and legend

**Data Flow:**
- Profile fetched from `GET /api/profile/:userId`
- Stats: `animeWatched`, `hoursWatched`, `currentlyWatching`, `favorites`, `animePlanned`, `animeDropped`, `totalEpisodes`, `meanScore`
- Badge definitions from `GET /api/badges/all`
- Badge evaluation via `POST /api/badges/evaluate/:userId`
- Avatar upload: `POST /api/profile/:userId/upload-photo`
- Cover upload: `POST /api/profile/:userId/upload-cover`
- Profile update: `PUT /api/profile/:userId`

---

## 2. Color System

| Token | Hex | Usage |
|---|---|---|
| `--bg-app` | `#030712` | Page background, Story Zone, Genre Identity |
| `--bg-section` | `#0a0f1a` | The Wall background |
| `--bg-hero-gradient-end` | `#0a0f1a` | Bottom bleed from hero into The Wall |
| `--text-primary` | `#ffffff` | Names, titles, headings |
| `--text-secondary` | `#94a3b8` | Bio, subtitles |
| `--text-muted` | `#64748b` | Labels, placeholders, edit labels |
| `--accent-amber` | `#f59e0b` | Avatar border, username, genre eyebrow, XP bar start, label underlines, Edit Profile border-left |
| `--accent-amber-glow` | `rgba(245,158,11,0.14)` | Avatar hover ring, CTA hover |
| `--accent-gold` | `#fbbf24` | XP bar end, genre pill hover, save button hover |
| `--accent-red` | `#ef4444` | XP bar midpoint, danger actions |
| `--accent-purple` | `#c084fc` | XP bar end |
| `--accent-green` | `#4ade80` | Earned badge dates, connected badge |
| `--badge-common` | `#94a3b8` | Common rarity label |
| `--badge-uncommon` | `#4ade80` | Uncommon rarity label |
| `--badge-rare` | `#60a5fa` | Rare rarity label |
| `--badge-epic` | `#c084fc` | Epic rarity label |
| `--badge-legendary` | `#fbbf24` | Legendary rarity label |
| `--border-subtle` | `rgba(255,255,255,0.08)` | Card borders, hero gradients |
| `--glass-bg` | `rgba(0,0,0,0.42)` | HUD Ticker, edit form |

---

## 3. Typography

| Font | Family | Usage |
|---|---|---|
| UI/Headings | `'Outfit', sans-serif` | Buttons, labels, nav items, inputs, badge titles |
| Body | `'Bricolage Grotesque', sans-serif` | Body text |
| Hero name | `'Space Grotesk', sans-serif` | `.entrance-name` (clamped 42–80px, weight 900) |
| Stats numbers | `'Space Grotesk', sans-serif` | `.hud-number` (38px, weight 900), `.ss-number` (26px, weight 800), `.gt-number` (34px, weight 900) |
| Genre title | `'Space Grotesk', sans-serif` | `.genre-title-large` (clamped 26–46px, weight 800) |
| Watermark | `'Space Grotesk', sans-serif` | `.genre-watermark` (clamped 72–152px, weight 200, 0.035 opacity) |

**Badge card title:** 13.5px, weight 800
**Badge card desc:** 11.5px, color `rgba(255,255,255,0.42)`
**Badge rarity label:** 9.5px, weight 800, uppercase, letter-spacing 1px
**Spotlight card:** 228px wide, 20px border-radius

---

## 4. Header
**Component:** `<Header showSearch={false} />`
**File:** `D:\OtakuShelf\otakushelf\src\Frontend\components\header.jsx`

Fixed glassmorphic nav bar. On profile page, search is disabled (`showSearch={false}`).

- **Position:** `fixed`, `top: 0`, `z-index: 90`
- **Background:** `rgba(3, 7, 18, 0.85)` with `backdrop-filter: blur(12px)`
- **Border-bottom:** `1px solid rgba(255,255,255,0.06)`
- **Height:** ~70px
- **Left:** "OtakuShelf" logo with orange SVG, links to `/`
- **Center:** Home | Discover | Schedule nav links
- **Right:** Profile dropdown or Login/Sign Up

---

## 5. Bottom Navigation Bar
**Component:** `<BottomNavBar />`
**File:** `D:\OtakuShelf\otakushelf\src\Frontend\components\bottom.jsx`

Mobile-only fixed bottom bar.

- **Position:** `fixed`, `bottom: 0`, `z-index: 80`
- **Background:** `#030712`
- **Border-top:** `1px solid rgba(255,255,255,0.06)`
- **Items:** Home, Search, My List, Profile
- **Active item:** `#ff6b6b`, `scale(1.1)`
- **Icons:** 24px SVGs

---

## 6. Page-Level Structure

```
<div className="profile-page">
  <PageLoader />                          <!-- conditional -->
  <BottomNavBar />
  <Header showSearch={false} />

  <!-- Toast (conditional) -->
  {toast.show && <div className="settings-toast success|error">...</div>}

  <!-- SECTION 1: Cinematic Entrance -->
  <section className="profile-entrance">
    <input type="file" id="cover-upload" />   <!-- hidden -->
    <input type="file" id="avatar-upload" />  <!-- hidden -->
    <img className="entrance-cover-img" />
    <div className="entrance-gradient-lr" />
    <div className="entrance-gradient-bottom" />
    <label className="cover-change-btn" />
    <div className="entrance-content">
      <div className="entrance-avatar-zone">
        <div className="entrance-avatar"><img /></div>
        <label className="avatar-change-label">CHANGE PHOTO</label>
      </div>
      <!-- Identity or Edit Form -->
      <div className="entrance-identity">...</div>
      <!-- OR -->
      <div className="entrance-edit-form">...</div>
      <div className="hud-ticker">...</div>
    </div>
    <div className="scroll-indicator">chevron</div>
  </section>

  <!-- SECTION 2: The Wall (Badges) -->
  <section className="the-wall">
    <div className="wall-inner">
      <div className="wall-eyebrow">ACHIEVEMENTS</div>
      <div className="xp-wrap">progress bar</div>
      <button className="check-badges-cta">Check for New Badges</button>
      <div className="rarity-legend">...</div>
      <div className="spotlight-row">EPIC/LEGENDARY badges</div>
      <div className="badge-controls-row">filter tabs + sort</div>
      <div className="badges-grid-new">EARNED badges</div>
      <div className="locked-separator">LOCKED badges</div>
      <div className="badges-grid-new">LOCKED badges</div>
    </div>
  </section>

  <!-- SECTION 3: The Story Zone -->
  <section className="story-zone">
    <div className="story-left">
      <span className="story-label">RECENTLY WATCHED</span>
      <div className="recently-watched-grid masonry-grid">cards</div>
    </div>
    <div className="story-divider" />
    <div className="story-right">
      <span className="story-label">FAVORITES</span>
      <div className="masonry-grid">cards</div>
    </div>
  </section>

  <!-- SECTION 4: Genre Identity -->
  <section className="genre-identity">
    <div className="genre-ambient" />
    <div className="genre-header-block">watermark + title</div>
    <div className="genre-pills-row">top 5 genre pills</div>
    <div className="genre-content">
      <div className="genre-chart-col">
        <ResponsiveContainer><PieChart>...</PieChart></ResponsiveContainer>
        <div className="genre-ticker">stats row</div>
      </div>
      <div className="genre-legend-col">genre bars</div>
    </div>
  </section>
</div>
```

---

## 7. Section 1 — Cinematic Entrance

Full-viewport-height hero section with cinematic cover image, avatar, user identity, and a HUD stats ticker card.

### 7.1 Container
**`.profile-entrance`:**
- `position: relative`, `min-height: 460px`
- `display: flex`, `flex-direction: column`, `overflow: hidden`

### 7.2 Cover Image
**`.entrance-cover-img`:**
- `position: absolute`, `inset: 0`, `width: 100%`, `height: 100%`
- `object-fit: cover`, `object-position: center`
- Default fallback: `https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1600&q=80`

### 7.3 Gradient Overlays
**`.entrance-gradient-lr`:**
- `position: absolute`, `inset: 0`
- `background: linear-gradient(to right, rgba(3,7,18,1) 0%, rgba(3,7,18,0.95) 25%, rgba(3,7,18,0.65) 50%, rgba(3,7,18,0.15) 80%, rgba(3,7,18,0.05) 100%)`

**`.entrance-gradient-bottom`:**
- `position: absolute`, `bottom: 0`, `left: 0`, `right: 0`, `height: 50%`
- `background: linear-gradient(to top, #0a0f1a 0%, rgba(10,15,26,0.85) 25%, rgba(10,15,26,0.3) 65%, transparent 100%)`
- `pointer-events: none`

### 7.4 Cover Change Button
**`.cover-change-btn`:**
- `position: absolute`, `top: 100px`, `right: 40px`, `z-index: 20`
- `background: rgba(0,0,0,0.5)`, `backdrop-filter: blur(12px)`
- `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 10px`
- `color: rgba(255,255,255,0.75)`, `font-size: 12px`, `font-weight: 600`
- Hover: `background: rgba(0,0,0,0.75)`, `color: white`
- Mobile: `top: 18px`, `right: 18px`

### 7.5 Content Block
**`.entrance-content`:**
- `position: relative`, `z-index: 10`, `flex: 1`
- `display: flex`, `align-items: center`, `gap: 40px`
- `padding: 120px 8% 30px`, `justify-content: flex-start`
- Mobile (`≤768px`): `flex-direction: column`, `justify-content: center`, `align-items: center`, `text-align: center`, `padding: 90px 5% 48px`

### 7.6 Avatar Zone
**`.entrance-avatar-zone`:**
- `display: flex`, `flex-direction: column`, `align-items: center`, `gap: 14px`, `flex-shrink: 0`

**`.entrance-avatar`:**
- `width: 210px`, `height: 210px`, `border-radius: 50%`, `overflow: hidden`
- `border: 3px solid rgba(245,158,11,0.45)`
- `box-shadow: 0 0 0 7px rgba(245,158,11,0.07), 0 32px 64px rgba(0,0,0,0.75)`
- `background: #111`
- Hover: `border-color: #f59e0b`, `box-shadow: 0 0 0 7px rgba(245,158,11,0.14), 0 32px 64px rgba(0,0,0,0.75)`
- `img`: `width: 100%`, `height: 100%`, `object-fit: cover`
- Mobile: `width: 130px`, `height: 130px`
- Small mobile: `width: 106px`, `height: 106px`

**`.entrance-avatar-placeholder`:**
- `width: 100%`, `height: 100%`
- `background: linear-gradient(135deg, #f59e0b, #d97706)`
- First letter of name, `font-size: 68px`, `font-weight: 800`

**`.avatar-change-label`:**
- `font-size: 9px`, `letter-spacing: 3px`, `color: rgba(255,255,255,0.3)`
- `font-weight: 700`, `text-transform: uppercase`, `cursor: pointer`
- Hover: `color: rgba(255,255,255,0.65)`

### 7.7 Identity Block
**`.entrance-identity`:**
- `display: flex`, `flex-direction: column`, `gap: 12px`, `max-width: 560px`

**`.entrance-name`:**
- `font-size: clamp(42px, 5.5vw, 80px)`, `font-weight: 900`
- `font-family: 'Space Grotesk'`, `color: white`, `line-height: 1`
- `letter-spacing: -1.5px`, `margin: 0`
- Mobile: `letter-spacing: -0.5px`, `font-size: clamp(32px, 7vw, 52px)`

**`.entrance-meta`:**
- `display: flex`, `align-items: center`, `gap: 10px`, `flex-wrap: wrap`
- Mobile: `justify-content: center`

**`.entrance-username`:** `font-size: 17px`, `color: #f59e0b`, `font-weight: 700`
**`.entrance-meta-dot`:** `color: rgba(255,255,255,0.2)`, `font-size: 16px`
**`.entrance-joindate`:** `font-size: 13px`, `color: rgba(255,255,255,0.3)`

**`.entrance-bio`:**
- `font-size: 0.98rem`, `line-height: 1.72`, `color: #94a3b8`
- `font-style: italic`, `max-width: 500px`

**`.entrance-email`:**
- `font-size: 12px`, `color: rgba(255,255,255,0.18)`, `display: block`

### 7.8 Action Buttons
**`.entrance-actions`:**
- `display: flex`, `align-items: center`, `gap: 12px`, `margin-top: 6px`
- Mobile: `justify-content: center`, `flex-wrap: wrap`

**`.btn-edit-new`:**
- `padding: 11px 26px`, `border-radius: 10px`
- `background: rgba(255,255,255,0.04)`, `color: white`
- `border: 1px solid rgba(255,255,255,0.12)`, `border-left: 3px solid #f59e0b`
- `backdrop-filter: blur(10px)`
- Hover: `background: rgba(245,158,11,0.09)`, `box-shadow: -3px 0 16px rgba(245,158,11,0.15)`

**`.btn-share-new`:**
- `width: 42px`, `height: 42px`, `border-radius: 50%`
- `border: 1px solid rgba(255,255,255,0.1)`, `background: rgba(255,255,255,0.04)`
- `color: rgba(255,255,255,0.38)`, SVG share icon 17×17px
- Hover: `color: white`, `background: rgba(255,255,255,0.09)`

### 7.9 Edit Form (Inline)
Shown when `isEditing === true`, replaces identity block.

**`.entrance-edit-form`:**
- `display: flex`, `flex-direction: column`, `gap: 14px`
- `max-width: 500px`, `width: 100%`
- `background: rgba(0,0,0,0.55)`, `border: 1px solid rgba(255,255,255,0.08)`
- `border-radius: 20px`, `padding: 28px`, `backdrop-filter: blur(24px)`

**`.edit-form-group label`:**
- `font-size: 10px`, `font-weight: 700`, `letter-spacing: 1.5px`
- `text-transform: uppercase`, `color: #64748b`

**`.edit-input` / `.edit-textarea`:**
- `background: rgba(255,255,255,0.06)`
- `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 10px`
- `padding: 10px 14px`, `color: white`, `font-size: 15px`
- Focus: `border-color: #f59e0b`

**`.btn-save`:**
- `background: #f59e0b`, `color: black`, `border: none`
- `padding: 10px 22px`, `border-radius: 10px`, `font-weight: 700`
- Hover: `background: #fbbf24`

**`.btn-cancel`:**
- `background: transparent`, `color: #64748b`
- `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 10px`
- Hover: `color: white`, `border-color: rgba(255,255,255,0.2)`

### 7.10 HUD Ticker (Stats Card)
**`.hud-ticker`:**
- `margin-left: auto`, `display: flex`, `flex-direction: column`
- `background: rgba(0,0,0,0.42)`, `backdrop-filter: blur(24px)`
- `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 24px`
- `padding: 20px 24px`, `gap: 16px`, `z-index: 15`
- `width: 100%`, `max-width: 520px`
- Mobile: `max-width: 100%`, `padding: 18px 14px`

**`.hud-primary-row`:**
- `display: flex`, `align-items: center`, `justify-content: space-around`
- Items: ANIME WATCHED | HOURS WATCHED | MEAN SCORE

**`.hud-number`:**
- `font-size: 38px`, `font-weight: 900`, `color: white`
- `font-family: 'Space Grotesk'`
- Mobile: `font-size: 28px`

**`.hud-label`:**
- `font-size: 8.5px`, `letter-spacing: 2.5px`
- `color: rgba(255,255,255,0.5)`, `font-weight: 700`, `text-transform: uppercase`

**`.hud-divider`:** `width: 1px`, `height: 36px`, `background: rgba(255,255,255,0.07)`

**`.hud-row-divider`:** `width: 100%`, `height: 1px`, `background: rgba(255,255,255,0.08)`

**`.hud-secondary-row`:**
- Items: WATCHING | PLANNED | DROPPED | EPISODES | FAVORITES

**`.ss-number`:**
- `font-size: 26px`, `font-weight: 800`, `font-family: 'Space Grotesk'`

**`.ss-label`:**
- `font-size: 7.5px`, `letter-spacing: 1.5px`, `color: rgba(255,255,255,0.38)`

**Mobile (≤900px):** Dividers hidden, stats wrap into 2-column grid

### 7.11 Scroll Indicator
**`.scroll-indicator`:**
- `position: absolute`, `bottom: 40px`, `left: 50%`, `transform: translateX(-50%)`
- Animated chevron SVG (26×26), `animation: scrollBounce 2.2s ease-in-out infinite`
- `pointer-events: none`

**`@keyframes scrollBounce`:** `translateY(0) → translateY(7px) → translateY(0)`, opacity oscillates 0.35–0.75

---

## 8. Section 2 — The Wall (Badges)

Achievement badge wall with XP progress bar, spotlight for epic/legendary badges, filterable/sortable grid.

### 8.1 Container
**`.the-wall`:**
- `background-color: #0a0f1a`
- `background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`
- `background-size: 22px 22px` (dot pattern)
- `padding: 72px 0 80px`

**`.wall-inner`:**
- `max-width: 1300px`, `margin: 0 auto`, `padding: 0 52px`
- Mobile: `padding: 0 18px`

### 8.2 Section Eyebrow
**`.wall-eyebrow`:**
- `display: flex`, `align-items: center`, `gap: 18px`, `margin-bottom: 40px`

**`.wall-eyebrow-line`:** `flex: 1`, `height: 1px`, `background: rgba(255,255,255,0.06)`
**`.wall-eyebrow-text`:**
- `font-size: 10px`, `font-weight: 700`, `letter-spacing: 4px`
- `color: rgba(255,255,255,0.2)`, `text-transform: uppercase`, `white-space: nowrap`

### 8.3 XP Progress Bar
**`.xp-wrap`:**
- `display: flex`, `align-items: center`, `gap: 18px`, `margin-bottom: 18px`

**`.xp-bar-full`:**
- `flex: 1`, `height: 13px`, `background: rgba(255,255,255,0.06)`, `border-radius: 100px`

**`.xp-fill`:**
- `height: 100%`
- `background: linear-gradient(90deg, #f59e0b 0%, #ef4444 50%, #c084fc 100%)`
- `border-radius: 100px`
- `transition: width 0.9s cubic-bezier(0.25, 1, 0.5, 1)`
- `::after` pseudo: shimmer animation (`xpShimmer 2.8s ease-in-out infinite`)

**`.xp-label`:**
- `font-size: 12px`, `font-weight: 700`, `color: #334155`, `white-space: nowrap`
- Shows `{earned} / {total} Badges · {pct}% Complete`

### 8.4 Check Badges CTA
**`.check-badges-cta`:**
- `display: block`, `margin: 0 auto 32px`
- `padding: 13px 44px`, `border-radius: 10px`
- `border: 1px solid rgba(245,158,11,0.35)`
- `background: rgba(245,158,11,0.07)`, `color: #f59e0b`
- `font-size: 14px`, `font-weight: 700`
- Hover: `background: rgba(245,158,11,0.14)`, `border-color: #f59e0b`, `transform: translateY(-2px)`, `box-shadow: 0 8px 24px rgba(245,158,11,0.12)`
- Disabled/loading: `opacity: 0.45`, `cursor: not-allowed`

### 8.5 Rarity Legend
**`.rarity-legend`:**
- `display: flex`, `align-items: center`, `gap: 22px`, `flex-wrap: wrap`, `justify-content: center`, `margin-bottom: 40px`

**`.rarity-pip`:**
- `display: flex`, `align-items: center`, `gap: 6px`
- `font-size: 11px`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.5px`

**`.rarity-dot`:** `width: 7px`, `height: 7px`, `border-radius: 50%`

**Rarity colors (defined in component):**
| Rarity | Border | Glow | Label |
|---|---|---|---|
| common | `rgba(148,163,184,0.35)` | `rgba(148,163,184,0.15)` | `#94a3b8` |
| uncommon | `rgba(74,222,128,0.45)` | `rgba(74,222,128,0.15)` | `#4ade80` |
| rare | `rgba(96,165,250,0.5)` | `rgba(96,165,250,0.18)` | `#60a5fa` |
| epic | `rgba(192,132,252,0.55)` | `rgba(192,132,252,0.2)` | `#c084fc` |
| legendary | `rgba(251,191,36,0.65)` | `rgba(251,191,36,0.25)` | `#fbbf24` |

### 8.6 Spotlight Row
Shown only for earned epic/legendary badges.

**`.spotlight-header`:**
- `font-size: 10px`, `font-weight: 700`, `letter-spacing: 3px`
- `color: rgba(255,255,255,0.25)`, `text-align: center`, `margin-bottom: 18px`

**`.spotlight-row`:**
- `display: flex`, `gap: 18px`, `overflow-x: auto`
- `padding: 6px 0 28px`, `scrollbar-width: none`, `margin-bottom: 16px`

**`.spotlight-card`:**
- `flex: 0 0 auto`, `width: 228px`
- `border-radius: 20px`, `padding: 24px 20px 20px`
- `background: rgba(15,20,40,0.85)`
- Dynamic border/glow set via inline style per rarity
- Hover: `transform: translateY(-7px) scale(1.02)`

**`.spotlight-emoji`:** `font-size: 54px`, `line-height: 1`
**`.spotlight-title`:** `font-size: 15px`, `font-weight: 800`
**`.spotlight-desc`:** `font-size: 11.5px`, `color: rgba(255,255,255,0.42)`
**`.spotlight-rarity`:** `font-size: 9.5px`, `font-weight: 800`, `letter-spacing: 1.5px`, uppercase
**`.spotlight-date`:** `font-size: 11px`, `color: #4ade80`, `font-weight: 600`

### 8.7 Badge Controls (Filter + Sort)
**`.badge-controls-row`:**
- `display: flex`, `justify-content: space-between`, `align-items: center`
- `margin-bottom: 22px`, `flex-wrap: wrap`, `gap: 14px`
- Mobile: `flex-direction: column`, `align-items: stretch`

**`.badge-category-tabs`:**
- `display: flex`, `flex-wrap: wrap`, `gap: 8px`
- Tabs: All + dynamic categories from badge definitions

**`.badge-cat-tab`:**
- `padding: 7px 16px`, `border-radius: 100px`
- `border: 1px solid rgba(255,255,255,0.09)`
- `background: rgba(255,255,255,0.04)`, `color: rgba(255,255,255,0.45)`
- `font-size: 12px`, `font-weight: 600`
- Hover: `background: rgba(255,255,255,0.08)`, `color: rgba(255,255,255,0.85)`
- Active: `background: linear-gradient(135deg, rgba(245,158,11,0.14), rgba(239,68,68,0.12))`, `border-color: rgba(245,158,11,0.6)`, `color: #fbbf24`

**`.badge-sort-control`:**
- `display: flex`, `align-items: center`, `gap: 10px`
- `label`: `font-size: 9.5px`, `letter-spacing: 1.5px`, uppercase, `color: #334155`
- `select`: `background: rgba(15,25,50,0.9)`, `color: white`, `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 8px`
- Sort options: Rarity (Highest/Lowest), Date (Newest/Oldest), Name (A-Z/Z-A)

### 8.8 Badge Grid
**`.badges-grid-new`:**
- `display: grid`, `grid-template-columns: repeat(auto-fill, minmax(196px, 1fr))`, `gap: 14px`
- `margin-bottom: 28px`
- Mobile (`≤768px`): `minmax(160px, 1fr)`
- Small mobile (`≤480px`): `minmax(140px, 1fr)`

**`.badge-card-new`:**
- `border-radius: 18px`, `padding: 18px 16px`
- `display: flex`, `flex-direction: column`, `gap: 10px`
- `position: relative`, `overflow: hidden`
- `transition: transform 0.22s, box-shadow 0.22s`

**`.badge-card-new.earned`:**
- `background: rgba(12,18,38,0.85)`
- Dynamic border/glow per rarity (inline style)
- Hover: `transform: translateY(-5px) scale(1.02)`

**`.badge-card-new.locked`:**
- `background: rgba(255,255,255,0.02)`, `border: 1px solid rgba(255,255,255,0.06)`
- `filter: saturate(0.22)`, `opacity: 0.42`
- Hover: `opacity: 0.58`, `filter: saturate(0.38)`

**`.badge-icon-wrap`:** `position: relative`, `width: 52px`, `height: 52px`
**`.badge-emoji`:** `font-size: 40px`, `line-height: 1`
**`.badge-lock-overlay`:**
- `position: absolute`, `inset: 0`
- `display: flex`, `align-items: center`, `justify-content: center`
- `font-size: 18px`, `background: rgba(0,0,0,0.55)`, `backdrop-filter: blur(2px)`

**`.badge-card-title`:** `font-size: 13.5px`, `font-weight: 800`
**`.badge-card-desc`:** `font-size: 11.5px`, `color: rgba(255,255,255,0.42)`, line-clamp 2 on mobile
**`.badge-rarity-label`:** `font-size: 9.5px`, `font-weight: 800`, uppercase
**`.badge-earned-date`:** `font-size: 10.5px`, `color: #4ade80`, `font-weight: 600`

### 8.9 Locked Separator
**`.locked-separator`:**
- `display: flex`, `align-items: center`, `gap: 16px`, `margin: 8px 0 22px`

**`.locked-sep-line`:** `flex: 1`, `height: 1px`, `background: rgba(255,255,255,0.05)`
**`.locked-sep-text`:**
- `font-size: 9px`, `font-weight: 700`, `letter-spacing: 2.5px`
- `color: rgba(255,255,255,0.18)`, uppercase

### 8.10 Badge State Calculations
- `enrichedBadges`: all badge defs merged with earned status + earnedDate
- `earnedBadgesGrid`: filtered to earned, sorted by current sort
- `lockedBadgesGrid`: filtered to locked, sorted by current sort
- `badgePct`: `Math.round((earnedCount / totalDefs) * 100)`
- `spotlightBadges`: earned badges with rarity `epic` or `legendary`

---

## 9. Section 3 — The Story Zone

Two-column layout: Recently Watched (left) + Favorites (right), separated by an amber divider.

### 9.1 Container
**`.story-zone`:**
- `display: flex`, `flex-direction: column`
- `padding: 72px 6%`, `gap: 0`
- `background: #030712`
- `border-top: 1px solid rgba(255,255,255,0.04)`
- `border-bottom: 1px solid rgba(255,255,255,0.04)`
- Mobile: `padding: 42px 5%`
- Small mobile: `padding: 42px 4%`

### 9.2 Section Labels
**`.story-label`:**
- `display: block`, `font-size: 9.5px`, `font-weight: 700`, `letter-spacing: 4px`
- `color: rgba(255,255,255,0.28)`, uppercase
- `border-bottom: 2px solid #f59e0b`, `width: fit-content`
- `padding-bottom: 10px`, `margin-bottom: 20px`

### 9.3 Recently Watched (Left)
**`.story-left`:**
- `width: 100%`, `max-width: 1196px`, `margin: 0 auto`
- `display: flex`, `flex-direction: column`, `padding-bottom: 48px`
- Mobile: `padding-bottom: 28px`

**`.recently-watched-grid`:**
- `display: grid`, `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))`, `gap: 14px`
- `≤900px`: `minmax(160px, 1fr)`
- `≤480px`: `minmax(140px, 1fr)`

### 9.4 Masonry Grid (Shared)
**`.masonry-grid`:**
- `display: grid`, `grid-template-columns: repeat(8, 1fr)`, `gap: 12px`
- Mobile (`≤768px`): `repeat(3, 1fr)`
- Small mobile (`≤480px`): `repeat(2, 1fr)`, `gap: 10px`

**`.masonry-card`:**
- `border-radius: 13px`, `overflow: hidden`, `position: relative`
- Hover: `box-shadow: inset 0 0 0 2px rgba(245,158,11,0.5)`

**`.masonry-card img`:**
- `width: 100%`, `display: block`, `object-fit: cover`, `aspect-ratio: 2/3`

**`.masonry-overlay`:**
- `position: absolute`, `bottom: 0`, `left: 0`, `right: 0`
- `padding: 14px 10px 10px`
- `background: linear-gradient(to top, rgba(0,0,0,0.9), transparent)`

**`.masonry-title`:**
- `font-size: 11.5px`, `font-weight: 600`, `color: white`
- `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`

### 9.5 Story Divider
**`.story-divider`:**
- `width: 100%`, `max-width: 1196px`, `height: 1px`
- `background: rgba(245,158,11,0.18)`
- `margin: 0 auto 48px`

### 9.6 Favorites (Right)
**`.story-right`:**
- `width: 100%`, `max-width: 1196px`, `margin: 0 auto`
- Same `.masonry-grid` as recently watched

### 9.7 Empty States
**`.story-empty`:**
- `font-size: 14px`, `color: rgba(255,255,255,0.22)`, `font-style: italic`, `padding: 40px 0`

---

## 10. Section 4 — Genre Identity

Full-width section with ambient glow, watermark text, proportional genre pills, interactive pie chart, and genre legend.

### 10.1 Container
**`.genre-identity`:**
- `position: relative`, `padding: 80px 6% 90px`, `overflow: hidden`
- `background: #030712`
- Mobile: `padding: 60px 5% 70px`

### 10.2 Ambient Glow
**`.genre-ambient`:**
- `position: absolute`, `top: -120px`, `left: -100px`
- `width: 650px`, `height: 550px`, `border-radius: 50%`
- `opacity: 0.06`, `filter: blur(130px)`
- `pointer-events: none`
- `transition: background-color 0.8s`
- Color set via inline style to top genre color

### 10.3 Editorial Header
**`.genre-header-block`:**
- `position: relative`, `margin-bottom: 36px`, `min-height: 80px`

**`.genre-watermark`:**
- `position: absolute`, `top: -18px`, `left: -6px`
- `font-size: clamp(72px, 11vw, 152px)`, `font-weight: 200`
- `font-family: 'Space Grotesk'`
- `color: rgba(255,255,255,0.035)`, `line-height: 1`
- `white-space: nowrap`, uppercase, `letter-spacing: -4px`
- Mobile (`≤768px`): `font-size: 48px`
- Small mobile (`≤480px`): `font-size: 42px`

**`.genre-eyebrow`:**
- `display: block`, `font-size: 9.5px`, `font-weight: 700`, `letter-spacing: 5px`
- `color: #f59e0b`, uppercase, `margin-bottom: 10px`

**`.genre-title-large`:**
- `font-size: clamp(26px, 3.8vw, 46px)`, `font-weight: 800`
- `font-family: 'Space Grotesk'`, `color: white`
- `line-height: 1.1`, `margin: 0`
- Mobile: `clamp(28px, 6vw, 38px)`
- Small mobile: `28px`

### 10.4 Genre Pills
**`.genre-pills-row`:**
- `display: flex`, `gap: 6px`, `margin-bottom: 56px`
- `flex-wrap: nowrap`, `align-items: stretch`, `overflow: hidden`
- Mobile: `flex-wrap: wrap`, `gap: 10px`, `margin-bottom: 36px`
- Small mobile: `gap: 6px`, `margin-bottom: 32px`

**`.genre-pill`:**
- `height: 40px`, `border-radius: 100px`
- `display: flex`, `align-items: center`, `justify-content: center`
- `flex-direction: column`, `padding: 0 10px`
- `overflow: hidden`, `transition: transform 0.2s`, `min-width: 50px`
- Hover: `transform: translateY(-3px)`
- Width set via inline `flexBasis: Math.max(genre.value, 6)%`
- Mobile: `height: 34px`, `min-width: 48px`
- Small mobile: `height: 30px`, `min-width: 40px`

**`.genre-pill-name`:**
- `font-size: 11px`, `font-weight: 700`, `color: white`
- `white-space: nowrap`, `text-shadow: 0 1px 5px rgba(0,0,0,0.6)`
- Mobile: `font-size: 10px`
- Small mobile: `font-size: 9px`

**`.genre-pill-pct`:**
- `font-size: 9px`, `color: rgba(255,255,255,0.65)`, `font-weight: 600`
- Hidden on mobile (`display: none`)

### 10.5 Chart + Legend Content
**`.genre-content`:**
- `display: grid`, `grid-template-columns: 1fr 1fr`, `gap: 52px`, `align-items: start`
- `≤1100px`: `grid-template-columns: 1fr`

### 10.6 Chart Column
**`.genre-chart-col`:**
- `display: flex`, `flex-direction: column`, `gap: 28px`
- Mobile: `gap: 22px`

**`.pie-chart-wrapper`:**
- `background: rgba(0,0,0,0.1)`, `border-radius: 20px`, `padding: 16px`

**PieChart config:**
- `<ResponsiveContainer width="100%" height={380}>`
- `<Pie>`: `cx="50%"`, `cy="50%"`, `outerRadius={175}`, `innerRadius={70}` (donut)
- `data`: filtered chartData (value > 0)
- Label: custom renderer, shows percentage if > 3%
- Center text: `{watchedGenres}` (large) + "Genres" (small)
- `<Tooltip>`: custom tooltip with genre name, percentage, count
- Colors: 19-color palette starting `#FF6B6B, #4ECDC4, #FFD166...`

**Custom Tooltip (`.custom-tooltip`):**
- `background: rgba(10,15,35,0.97)`, `border: 1px solid rgba(255,255,255,0.08)`
- `border-radius: 12px`, `padding: 12px 16px`, `backdrop-filter: blur(20px)`
- Genre name (13px, bold, white), percentage (20px, bold, #f59e0b), count (12px, #475569)

### 10.7 Genre Ticker
**`.genre-ticker`:**
- `display: flex`, `align-items: center`, `justify-content: center`
- `padding: 20px 0`, `border-top: 1px solid rgba(255,255,255,0.05)`
- Mobile: `flex-wrap: wrap`, `gap: 12px`

**`.gt-stat`:**
- `display: flex`, `flex-direction: column`, `align-items: center`, `gap: 4px`, `padding: 0 24px`

**`.gt-number`:**
- `font-size: 34px`, `font-weight: 900`, `color: white`
- `font-family: 'Space Grotesk'`

**`.gt-label`:**
- `font-size: 8.5px`, `letter-spacing: 2px`, `color: #334155`, `font-weight: 700`, uppercase

**`.gt-divider`:** `width: 1px`, `height: 30px`, `background: rgba(255,255,255,0.06)`

Items: TOTAL (19) | WATCHED | TOP GENRE (%) | COVERAGE (%)

### 10.8 Genre Legend
**`.genre-legend-col`:**
- `display: flex`, `flex-direction: column`, `gap: 16px`
- `max-height: 520px`, `overflow-y: auto`, `padding-right: 6px`
- `scrollbar-width: thin`, `scrollbar-color: rgba(255,255,255,0.07) transparent`
- Mobile: `max-height: none`, `padding-right: 0`

**`.genre-legend-item`:**
- `display: flex`, `flex-direction: column`, `gap: 5px`

**`.gli-name`:** `font-size: 13px`, `font-weight: 600`, `color: rgba(255,255,255,0.82)`
**`.gli-bar-wrap`:**
- `height: 5px`, `background: rgba(255,255,255,0.06)`, `border-radius: 100px`

**`.gli-bar`:**
- `height: 100%`, `border-radius: 100px`, `min-width: 4px`
- `transition: width 0.9s`
- Color set via inline style per genre

**`.gli-meta`:** `font-size: 11px`, `color: #334155`, `font-weight: 600`
- Shows `{percentage}% · {count} anime`

---

## 11. Toast Notifications

Reuses settings page toast styles.

**`.settings-toast`:**
- `position: fixed`, `top: 90px`, `right: 32px`, `z-index: 9999`
- `padding: 14px 28px`, `border-radius: 14px`
- `font-size: 15px`, `font-weight: 600`
- `backdrop-filter: blur(24px)`, `box-shadow: 0 12px 40px rgba(0,0,0,0.4)`
- `animation: toastSlide 0.35s cubic-bezier(0.22, 1, 0.36, 1)`

**`.settings-toast.success`:**
- `background: rgba(16,185,129,0.2)`, `border: 1px solid rgba(16,185,129,0.4)`, `color: #6ee7b7`

**`.settings-toast.error`:**
- `background: rgba(239,68,68,0.2)`, `border: 1px solid rgba(239,68,68,0.4)`, `color: #fca5a5`

---

## 12. Responsive Breakpoints

| Breakpoint | Changes |
|---|---|
| `≤ 1100px` | Genre content → single column; story sections full width |
| `≤ 900px` | HUD ticker full width; stats wrap to 2-col grid; dividers hidden |
| `≤ 768px` | Hero → stacked column layout; avatar 130px; name centered; badges grid `minmax(160px)`; story zone padding reduced; recently watched grid `minmax(160px)`; masonry 3-col; genre pills wrap; watermark 48px |
| `≤ 480px` | Avatar 106px; name 32px; badges grid `minmax(140px)`; masonry 2-col; genre pills smaller; watermark 42px; spotlight desc line-clamp 2 |

**Key mobile overrides (≤768px):**
- `.entrance-content`: `flex-direction: column`, `text-align: center`, `padding: 90px 5% 48px`
- `.entrance-avatar`: `130px × 130px`
- `.entrance-name`: `clamp(32px, 7vw, 52px)`
- `.cover-change-btn`: `top: 18px`, `right: 18px`
- `.hud-ticker`: `max-width: 580px`, centered
- `.badges-grid-new`: `minmax(160px, 1fr)`
- `.badge-controls-row`: `flex-direction: column`
- `.story-zone`: `padding: 42px 5%`
- `.masonry-grid`: `repeat(3, 1fr)`
- `.genre-pills-row`: `flex-wrap: wrap`, `gap: 10px`
- `.genre-pill`: `flex: 1 1 auto`, `min-width: 120px`

---

## 13. Key Interactions & Animations

| Interaction | Behavior |
|---|---|
| **Cover hover** | Image scales up slightly |
| **Avatar hover** | Border color brightens to `#f59e0b`, glow ring intensifies |
| **Edit Profile click** | Identity block replaced by glassmorphic edit form |
| **Share click** | Web Share API (mobile) or clipboard copy |
| **Badge hover** | `translateY(-5px) scale(1.02)` with rarity glow |
| **Spotlight card hover** | `translateY(-7px) scale(1.02)` |
| **Genre pill hover** | `translateY(-3px)` |
| **Check Badges click** | Triggers `/api/badges/evaluate/:userId`, shows toast |
| **Badge category tab click** | Filters grid to category |
| **Badge sort select** | Reorders grid |
| **Pie chart hover** | Custom tooltip with genre name, percentage, count |

**Keyframe animations:**
- `@keyframes scrollBounce` — scroll indicator vertical bounce (2.2s loop)
- `@keyframes xpShimmer` — shimmer across XP bar (2.8s loop)
- `@keyframes profileSpin` — loading spinner rotation (1s linear)
- `@keyframes toastSlide` — toast slide from right (0.35s)

---

## 14. API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/profile/:userId` | GET | Fetch full profile data |
| `/api/profile/:userId` | PUT | Update profile (name, bio, username) |
| `/api/profile/:userId/upload-photo` | POST | Upload avatar image |
| `/api/profile/:userId/upload-cover` | POST | Upload cover image |
| `/api/badges/all` | GET | Fetch all badge definitions |
| `/api/badges/evaluate/:userId` | POST | Trigger badge evaluation |
| `/api/list/:userId/backfill-genres` | POST | Backfill genre data (admin) |

---

## 15. Render Order

```
1. <PageLoader />               — full-screen cinematic loader (conditional)
2. <BottomNavBar />             — fixed bottom nav (mobile)
3. <Header showSearch={false} /> — fixed top nav
4. Toast                        — conditional, fixed top-right

5. <section class="profile-entrance">
   a. Hidden file inputs        — cover-upload, avatar-upload
   b. Cover image               — full-bleed absolute
   c. Gradient overlays         — left-to-right + bottom bleed
   d. Cover change button       — absolute top-right
   e. Entrance content
      i. Avatar zone            — circular avatar + "CHANGE PHOTO" label
      ii. Identity block        — name, username, join date, bio, email, actions
         OR Edit form           — name, username, bio inputs + save/cancel
      iii. HUD ticker           — primary stats (3) + divider + secondary stats (5)
   f. Scroll indicator          — bouncing chevron

6. <section class="the-wall">
   a. Section eyebrow           — "ACHIEVEMENTS" with lines
   b. XP progress bar           — gradient bar + label
   c. Check Badges CTA          — "⚡ Check for New Badges"
   d. Rarity legend             — 5 colored pips
   e. Spotlight row             — horizontal scroll of epic/legendary badges
   f. Badge controls            — category tabs + sort dropdown
   g. Earned badge grid         — grid of earned badge cards
   h. Locked separator          — "LOCKED — N REMAINING"
   i. Locked badge grid         — grid of locked badge cards

7. <section class="story-zone">
   a. Story left                — "RECENTLY WATCHED" + masonry grid
   b. Story divider             — amber horizontal line
   c. Story right               — "FAVORITES" + masonry grid

8. <section class="genre-identity">
   a. Ambient glow              — blurred color blob
   b. Genre header              — watermark text + eyebrow + title
   c. Genre pills               — proportional colored bars (top 5)
   d. Genre content
      i. Chart column           — donut pie chart + genre ticker stats
      ii. Legend column          — genre bars with names + percentages
```

---

*This document provides complete UI specification for the Profile page. All component dimensions, colors, spacing, responsive breakpoints, and interaction behaviors are defined to enable faithful React Native implementation.*
