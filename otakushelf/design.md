# OtakuShelf — Profile Page Design Document

> **Purpose:** Accurate reference document for redesigning or rebuilding the Profile page UI.
> All measurements, colors, class names, and component behaviors are sourced directly from the live codebase.

---

## Tech Stack

- **Framework:** React (JSX) with React Router
- **Styling:** Vanilla CSS (`profile.css` + `settings.css` imported on this page)
- **Charts:** Recharts (`PieChart`, `Pie`, `Cell`, `Tooltip`, `ResponsiveContainer`)
- **Fonts:** `Space Grotesk` (headings) + `Outfit` (body/UI) — both from Google Fonts
- **Background color of entire app:** `#030712`

---

## Page-Level Structure

```
<PageLoader />           <- Full-screen cinematic loader (shows on every visit, fades out)
<BottomNavBar />         <- Fixed bottom mobile navigation bar (always present)
<Toast />                <- Fixed-position notification (top-right, appears on actions)
<div.profile-page>
  <Header />             <- Global top navigation bar (search hidden on this page)
  <div.profile-cover>    <- Full-width hero banner section
  <div.profile-container2> <- Main content body (max-width 1400px, centered)
```

---

## 1. Toast Notification

Appears fixed at **top: 90px, right: 32px** over all content. Auto-dismisses after **3500ms**.

| Property | Value |
|---|---|
| z-index | 9999 |
| padding | 14px 28px |
| border-radius | 14px |
| font-size | 15px / font-weight 600 |
| backdrop-filter | blur(24px) |
| box-shadow | 0 12px 40px rgba(0,0,0,0.4) |
| animation | toastSlide 0.35s cubic-bezier(0.22,1,0.36,1) |

**Success variant:** background `rgba(16,185,129,0.2)`, border `rgba(16,185,129,0.4)`, color `#6ee7b7`
**Error variant:** background `rgba(239,68,68,0.2)`, border `rgba(239,68,68,0.4)`, color `#fca5a5`

---

## 2. Profile Cover (Hero Banner)

`.profile-cover` — Full-viewport-width banner pinned flush to the top below the global header.

| Property | Value |
|---|---|
| width | 100vw (uses `margin-left: calc(50% - 50vw)` to break out of container) |
| height | 520px |
| overflow | hidden |
| position | relative |

**Cover image** (`.profile-cover-img`): `width: 100%; height: 100%; object-fit: cover`
Default fallback image: `https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1600&q=80`

**Gradient overlay** (`.profile-cover-fade`): `inset: 0`, gradient from `rgba(3,7,18,0.1)` at top -> `rgba(3,7,18,0.4)` at 40% -> `rgba(3,7,18,0.95)` at bottom. This makes the bottom of the cover photo blend into the dark background.

### Change Cover Button (`.cover-upload-btn`)
- Position: `absolute`, top: `100px`, right: `40px`, z-index: `20`
- Background: `rgba(0,0,0,0.4)`, border: `1px solid rgba(255,255,255,0.1)`
- Padding: `8px 16px`, border-radius: `10px`
- Font: 13px / weight 600 / color white
- `backdrop-filter: blur(10px)`
- Triggers a hidden `<input type="file">` via `<label htmlFor="cover-upload">`

---

## 3. Profile Header (overlays bottom of cover)

`.profile-header` — Absolutely positioned at the bottom of the cover div.

| Property | Value |
|---|---|
| position | absolute, bottom: 0, left: 0, right: 0 |
| padding | 40px 8% |
| display | flex |
| align-items | flex-end |
| gap | 40px |
| z-index | 10 |

### 3a. Avatar Section (`.profile-avatar-section`)
- `flex-shrink: 0`, flex column, centered, gap: `12px`

**Avatar frame** (`.profile-avatar-large`):
- width/height: `190px`
- border-radius: `54px` (squircle shape)
- border: `4px solid rgba(255,255,255,0.15)`
- box-shadow: `0 20px 50px rgba(0,0,0,0.6)`
- background: `#111`
- Hover: `translateY(-5px)`, border-color becomes `#f59e0b`

**Avatar placeholder** (when no image): gradient `#f59e0b -> #d97706`, `64px` font-size initial letter of name

**"Change Photo" label** (`.upload-label`):
- Pill shape: background `rgba(0,0,0,0.6)`, border `1px solid rgba(255,255,255,0.1)`, padding `6px 18px`, border-radius `100px`
- Font: 12px / weight 600 / white
- `backdrop-filter: blur(10px)`
- Triggers a hidden `<input type="file">` for avatar upload (max 2MB, images only)

### 3b. Profile Name Section (`.profile-name-section`) — View Mode

| Element | Style |
|---|---|
| h1 (display name) | font-size `60px`, weight `900`, font-family `Space Grotesk`, color `white`, line-height `1` |
| `.username` | font-size `18px`, color `#f59e0b`, weight `700` |
| `.email` | font-size `14px`, color `rgba(255,255,255,0.4)` |
| `.username-section` | flex row, gap `12px`, margin `10px 0 18px 0` |
| `.profile-bio` | font-size `1.05rem`, line-height `1.6`, color `#cbd5e1`, max-width `600px`, padding `18px 24px`, background `rgba(255,255,255,0.05)`, border-radius `20px`, **left border** `4px solid #f59e0b`, `backdrop-filter: blur(20px)` |
| `.join-date` | Plain text "Joined [Month Year]" |

### 3c. Edit Mode (`.profile-edit-section`)

Replaces the name section when "Edit Profile" is clicked. Three form groups stacked vertically.

**Form group** (`.edit-form-group`): `<label>` + `<input>` or `<textarea>`
- **Inputs** (`.edit-input`): text inputs for Name and Username
- **Textarea** (`.edit-textarea`): 3 rows, for Bio
- **Save Changes** button (`.btn-save`): yellow background `#f59e0b`, black text
- **Cancel** button (`.btn-cancel`): outlined/transparent

### 3d. Action Buttons (`.profile-actions`)

Positioned in the header flex row, aligned to the right. Flex column, gap `12px`, `padding-bottom: 15px`.

**Edit Profile** (`.btn-edit`):
- `background: #f59e0b`, `color: black`, `border: none`
- padding `12px 24px`, border-radius `14px`, font `15px / 700`
- min-width `190px`, flex row with gap `10px`
- Hover: background `#fbbf24`

**Share Profile** (`.btn-share`):
- `background: rgba(255,255,255,0.05)`, `color: white`
- `border: 1px solid rgba(255,255,255,0.1)`
- `backdrop-filter: blur(10px)`
- Same padding/sizing as btn-edit
- Uses `navigator.share()` if available, else copies URL to clipboard

---

## 4. Profile Container — Main Content Body

`.profile-container2`: `max-width: 1400px`, `margin: 0 auto`, `padding: 40px`

### 4a. Overview Stats (`.initial` grid)

`.initial` — CSS Grid, **2 columns** (`2fr 1fr`), gap `32px`, `margin-top: 40px`

Left column (`.overview`):
- background `rgba(255,255,255,0.02)`, border `1px solid rgba(255,255,255,0.08)`, border-radius `24px`, padding `32px`, `backdrop-filter: blur(10px)`

**Section header** (`.overview-header`):
- font-size `24px`, weight `800`, color `white`
- Has a pseudo-element `::before`: `4px x 24px` yellow bar `#f59e0b`

**Stats Grid** (`.stats-grid`): `repeat(4, 1fr)`, gap `20px`

**8 stat cards displayed** (`.stat-card`):
- background `rgba(255,255,255,0.03)`, padding `20px`, border-radius `18px`, border `1px solid rgba(255,255,255,0.05)`, text-align center
- **Number** (`.stat-number`): `2rem`, weight `800`, color `#f59e0b`, displayed as block
- **Label** (`.stat-label`): `0.75rem`, color `#64748b`, uppercase, weight `700`

| # | Label | Data field |
|---|---|---|
| 1 | Anime Watching | `stats.currentlyWatching` |
| 2 | Anime Watched | `stats.animeWatched` |
| 3 | Anime Planned | `stats.animePlanned` |
| 4 | Anime Dropped | `stats.animeDropped` |
| 5 | Total Hours | `stats.hoursWatched` |
| 6 | Total Episodes | `stats.totalEpisodes` |
| 7 | Mean Score | `stats.meanScore` |
| 8 | Favorites | `stats.favorites` |

Right column (`.recent-activity-column`): Same card styling. Currently renders a placeholder/empty area with min-height `300px`.

---

### 4b. Recently Watched & Favorite Anime

`.recently-watched-section`: CSS Grid, **2 columns** (`1fr 1fr`), gap `40px`, `margin: 40px 0`

**Section title** (`.section-title`): `22px`, weight `800`, color `white`

**Anime grids** (`.recently-watched-grid`, `.favorite-grid`):
- `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`, gap `20px`

**Anime card** (`.watched-item`, `.favorite-item`):
- border-radius `16px`, overflow hidden
- **aspect-ratio: 2/3** (portrait poster shape)
- position relative
- Hover: `translateY(-8px)` (transition 0.3s)
- Image: `width: 100%; height: 100%; object-fit: cover`

**Title overlay** (`.watched-info`, `.favorite-info`):
- position absolute, bottom 0, left/right 0
- padding `15px 10px`
- background `linear-gradient(0deg, rgba(0,0,0,0.9), transparent)`
- h3: `0.9rem`, white, weight `600`, single-line truncated with ellipsis

**Empty state**: Shows two `<p>` tags encouraging the user to start watching/rating.

---

### 4c. Badges & Awards Section (`.badges-showcase`)

`margin-top: 40px`, same glass-card style as overview: background `rgba(255,255,255,0.02)`, border `1px solid rgba(255,255,255,0.08)`, border-radius `24px`, padding `32px`, `backdrop-filter: blur(10px)`

#### Header Row (`.badges-header-row`)
Flex row, space-between, flex-wrap, gap `16px`, `margin-bottom: 20px`

- **Left side** (`.badges-title-block`): flex row, gap `14px`
  - Section title text: "Badges & Awards"
  - **Count pill** (`.badges-count-pill`): "X / Y" format, gradient background `#f59e0b -> #ef4444`, white text, `13px / 800 weight`, padding `4px 14px`, border-radius `100px`
- **Right side** (`.check-badges-btn`):
  - background `rgba(245,158,11,0.12)`, border `1px solid rgba(245,158,11,0.35)`, color `#f59e0b`
  - padding `10px 20px`, border-radius `50px`, `14px / 700`
  - Shows "Checking..." text when loading, disabled during check
  - Hover (not disabled): slightly brighter background + `translateY(-1px)`

#### Progress Bar (`.badges-progress-wrap`)
Flex row, gap `14px`, `margin-bottom: 20px`
- **Track** (`.badges-progress-bar`): flex 1, height `8px`, background `rgba(255,255,255,0.07)`, border-radius `100px`
- **Fill** (`.badges-progress-fill`): gradient `#f59e0b -> #ef4444 -> #c084fc`, animated width with `0.8s cubic-bezier(0.25,1,0.5,1)`
- **Percentage text** (`.badges-progress-pct`): `13px / 700`, color `#94a3b8`, e.g. "42% complete"

#### Rarity Legend Row (`.rarity-legend`)
Flex row, flex-wrap, gap `16px`, padding `10px 16px`, background `rgba(255,255,255,0.03)`, border-radius `12px`, border `1px solid rgba(255,255,255,0.05)`, `margin-bottom: 20px`

5 rarity tiers, each a `.rarity-pip` (colored 8px dot + uppercase label):

| Tier | Dot/Text color |
|---|---|
| Common | `#94a3b8` (slate) |
| Uncommon | `#4ade80` (green) |
| Rare | `#60a5fa` (blue) |
| Epic | `#c084fc` (purple) |
| Legendary | `#fbbf24` (gold) |

#### Controls Row
Flex row, space-between, `margin-bottom: 20px`, flex-wrap, gap `15px`

**Category Filter Tabs** (`.badge-category-tabs` / `.badge-cat-tab`):
- "All" + each unique `badge.category` value from badge definitions
- Pill buttons: padding `7px 16px`, border-radius `100px`, `13px / 600`
- Default: background `rgba(255,255,255,0.04)`, color `rgba(255,255,255,0.55)`, border `1px solid rgba(255,255,255,0.1)`
- Active: background `linear-gradient(135deg, #f59e0b22, #ef444422)`, border `#f59e0b`, color `#fbbf24`

**Sort Dropdown** (`.badge-sort-control`):
- Label: "SORT BY" (uppercase, `0.85rem`, `#94a3b8`, letter-spacing `1px`, bold)
- `<select>` styled dark: background `rgba(30,41,59,0.7)`, color white, border `1px solid rgba(255,255,255,0.1)`, padding `8px 12px`, border-radius `8px`
- Options: Rarity (Highest) — default, Rarity (Lowest), Date (Newest), Date (Oldest), Name (A-Z), Name (Z-A)

**Sort Logic:**
- All non-alphabetical sorts push **unearned badges to the bottom**
- Alphabetical sorts ignore earned/locked grouping

#### Badge Grid (`.badges-grid-new`)
`grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`, gap `16px`

**Individual Badge Card** (`.badge-card-new`):
- border-radius `18px`, padding `18px 16px`, flex column, gap `10px`, cursor default
- position relative, overflow hidden
- transition: `transform 0.22s, box-shadow 0.22s`

**Earned state** (`.badge-card-new.earned`):
- background `rgba(15,20,40,0.75)`
- border: `1px solid {rarity.border}` (rarity-specific color from table below)
- box-shadow: `0 0 18px {rarity.glow}, inset 0 0 12px {rarity.glow}`
- Hover: `translateY(-5px) scale(1.02)`

**Rarity border/glow colors for earned cards:**

| Rarity | Border | Glow |
|---|---|---|
| Common | `rgba(148,163,184,0.35)` | `rgba(148,163,184,0.15)` |
| Uncommon | `rgba(74,222,128,0.45)` | `rgba(74,222,128,0.15)` |
| Rare | `rgba(96,165,250,0.5)` | `rgba(96,165,250,0.18)` |
| Epic | `rgba(192,132,252,0.55)` | `rgba(192,132,252,0.2)` |
| Legendary | `rgba(251,191,36,0.65)` | `rgba(251,191,36,0.25)` |

**Locked state** (`.badge-card-new.locked`):
- background `rgba(255,255,255,0.025)`, border `1px solid rgba(255,255,255,0.07)`
- `filter: saturate(0.3)`, `opacity: 0.55`
- Hover: opacity `0.7`, `filter: saturate(0.5)`

**Badge card anatomy (top to bottom):**

1. **Icon wrapper** (`.badge-icon-wrap`): `52px x 52px`
   - `.badge-emoji`: `40px` emoji, displayed as block
   - If locked: overlay (`.badge-lock-overlay`): absolute inset, centered lock emoji, background `rgba(0,0,0,0.55)`, `backdrop-filter: blur(2px)`, border-radius `8px`
2. **Info block** (`.badge-info`): flex column, gap `4px`
   - `.badge-card-title`: `14px / 800`, white, line-height `1.2`
   - `.badge-card-desc`: `12px`, `rgba(255,255,255,0.5)`, line-height `1.4`
   - `.badge-rarity-label`: `10px / 800`, uppercase, letter-spacing `1px`, colored by rarity label color
   - `.badge-earned-date` (earned only, if earnedDate exists): `11px / 600`, color `#4ade80`, shows "checkmark [Month Day, Year]"

**Tooltip** on each card: HTML `title` attribute — "Earned: [localized date]" for earned, "Locked" for locked

---

### 4d. Genre Breakdown Section (`.genre-section`)

`margin-top: 40px`, same glass-card style, border-radius `24px`, padding `32px`

**Title:** `"Genre Breakdown - 19 Genres"` — 19 is always the count of AniList official genres

#### Pie Chart (`.pie-chart-wrapper`)
Uses Recharts `PieChart` inside `ResponsiveContainer` — width `100%`, height `400px`

- **Donut chart**: `outerRadius={200}`, `innerRadius={80}`
- Only slices where `value > 0` are rendered as segments
- Labels rendered inside slices only for genres `> 3%`: white, `12px bold`, text-shadow `0 2px 4px rgba(0,0,0,0.8)`
- Custom tooltip on hover: shows genre name, percentage (1 decimal place), and `(X anime)` count

**Donut center SVG text:**
- Line 1 (y=48%): count of genres watched — `32px bold white`
- Line 2 (y=56%): label "Genres Watched" — `14px #999`

**19 Genre colors in index order:**
`#FF6B6B, #4ECDC4, #FFD166, #06D6A0, #118AB2, #EF476F, #073B4C, #7209B7, #3A86FF, #FB5607, #8338EC, #FF006E, #FFBE0B, #3A86FF, #FB5607, #FF595E, #8AC926, #1982C4, #6A4C93`

**19 Official AniList genres (in display order — sorted by user % descending, 0% alphabetically last):**
Action, Adventure, Avant Garde, Award Winning, Boys Love, Comedy, Drama, Fantasy, Girls Love, Gourmet, Horror, Mystery, Romance, Sci-Fi, Slice of Life, Sports, Supernatural, Suspense, Thriller

#### Chart Summary Stats (`.chart-summary`)
`grid-template-columns: repeat(4, 1fr)`, gap `15px`, `margin-top: 24px`

Each item (`.summary-item`): background `rgba(255,255,255,0.03)`, padding `12px`, border-radius `12px`
- `.summary-label`: `10px`, uppercase, color `#64748b`
- `.summary-value`: `16px / 700`, color `#f59e0b`

| Label | Value |
|---|---|
| Total Genres: | 19 (always static) |
| Genres Watched: | Count of genres where % > 0 |
| Top Percentage: | Highest single genre % (1 decimal) |
| Coverage: | (watchedGenres / 19 * 100)% |

#### Genre Legend (`.legend-container`)
Background `rgba(0,0,0,0.1)`, border-radius `20px`, padding `24px`

`.custom-legend`: `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`, gap `12px`

**Legend item** (`.legend-item`):
- flex row, gap `10px`, padding `10px`, background `rgba(255,255,255,0.02)`, border-radius `10px`
- If value is 0: `.inactive` class -> `opacity: 0.3`

Each item contains:
- **Color swatch** (`.legend-color`): `10px x 10px`, border-radius `2px`, background = genre color (opacity 0.3 if zero)
- **Info block** (`.legend-info`):
  - `.legend-text`: `0.85rem`, white — genre name
  - `.legend-percentage`: `0.75rem`, `#94a3b8` — shows "0.0%" for genres with no data
  - `.legend-count` (only if count > 0): `11px`, `#888` — "(X anime)"

---

## 5. Loading State (before data resolves)

If `profileData` is null, the page shows a full-screen overlay (not the PageLoader):
- `position: fixed`, full viewport, z-index `9999`
- Background: `linear-gradient(180deg, #0a0f1e 0%, #161b2e 100%)`
- Centered content (`.loading-content`):
  - `.loading-spinner` — animated spinner div
  - `h2.loading-text` — "Loading Your Anime Journey"
  - `p.loading-subtext` — "Preparing your stats, favorites, and anime collection..."

---

## 6. Color System Summary

| Token | Color | Usage |
|---|---|---|
| Page background | `#030712` | Global app bg |
| Accent yellow | `#f59e0b` | Primary brand, stat numbers, left borders |
| Accent yellow hover | `#fbbf24` | Button hover, count pill gradient end |
| Dark navy (loading) | `#0a0f1e -> #161b2e` | Loading state bg |
| Card bg | `rgba(255,255,255,0.02-0.03)` | All glass cards |
| Card border | `rgba(255,255,255,0.08)` | All glass card borders |
| Body text | `white / #cbd5e1` | Primary copy |
| Subtext / labels | `#94a3b8 / #64748b` | Labels, secondary text |
| Success green | `#4ade80` | Earned badge date |
| Error red | `#ef4444` | Toast error, badge gradient end |

---

## 7. Responsive Breakpoints

### max-width: 768px
- `.profile-cover` height: `280px`
- `.profile-header`: flex column, centered, `padding: 20px 5%`, `bottom: -16px`
- `.profile-avatar-large`: `110px x 110px`, border-radius `28px`
- `h1`: fluid `clamp(1.6rem, 7vw, 2.8rem)`, centered
- `.username-section`: justify-content center, flex-wrap
- `.profile-container2`: `padding: 50px 16px 100px`
- `.stats-grid`: 2 columns
- `.badges-grid-new`: `minmax(155px, 1fr)`, gap `12px`
- `.badges-header-row`: flex column, align left

### max-width: 480px
- `.profile-cover` height: `220px`
- `.profile-avatar-large`: `90px x 90px`, border-radius `22px`
- `h1`: `clamp(1.4rem, 6.5vw, 2rem)`
- `.profile-container2`: `padding: 40px 12px 100px`

### max-width: 380px
- `.profile-cover` height: `180px`
- `.profile-avatar-large`: `78px x 78px`, border-radius `20px`
- `h1`: `clamp(1.2rem, 6vw, 1.6rem)`
- `.profile-container2`: `padding: 36px 10px 90px`

---

## 8. Key Interactions & Behaviors

| Action | Behavior |
|---|---|
| Click "Change Cover" | Opens file picker, images only, max **5MB**, POSTs to `/api/profile/:id/upload-cover` |
| Click "Change Photo" | Opens file picker, images only, max **2MB**, POSTs to `/api/profile/:id/upload-photo` |
| Click "Edit Profile" | Replaces name/bio/username display with inline edit form |
| Click "Save Changes" | PUTs to `/api/profile/:id`, updates local state, shows success toast, reloads data |
| Click "Cancel" | Restores previous values, exits edit mode |
| Click "Share Profile" | Uses `navigator.share()` if available, else copies profile URL to clipboard |
| Click "Check Badges" | POSTs to `/api/badges/evaluate/:id`, refreshes badge list if new badges awarded, shows toast |
| Click badge category tab | Filters badge grid to that category, "All" shows everything |
| Change sort dropdown | Re-sorts badge grid client-side (no network request) |
| Hover anime card | `translateY(-8px)` lift effect |
| Hover avatar frame | `translateY(-5px)` + border turns gold `#f59e0b` |

---

## 9. Data Sources (API Endpoints)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/profile/:userId` | GET | Loads all profile data: name, username, bio, avatar, coverImage, stats, recentlyWatched, favoriteAnime, badges, favoriteGenres |
| `/api/profile/:userId` | PUT | Saves edited name, bio, username |
| `/api/profile/:userId/upload-photo` | POST multipart/form-data | Avatar image upload (field name: `photo`) |
| `/api/profile/:userId/upload-cover` | POST multipart/form-data | Cover image upload (field name: `cover`) |
| `/api/badges/all` | GET | Loads all badge definitions (id, title, description, icon emoji, rarity, category) |
| `/api/badges/evaluate/:userId` | POST | Triggers badge evaluation, returns `{ newBadges: [] }` |

---

## 10. Sections Render Order (Top to Bottom on Screen)

1. `<PageLoader>` — full-screen cinematic overlay, fades out after load
2. `<Header showSearch={false}>` — global nav, search bar hidden on profile
3. `.profile-cover` — full-width hero (520px tall) with cover photo, gradient, avatar, name, bio, action buttons
4. `.profile-container2` (max-width 1400px centered, padding 40px):
   - a. `.initial` — 2-col grid: **Overview stats** card (left 2/3) + recent activity placeholder (right 1/3)
   - b. `.recently-watched-section` — **Recently Watched** + **Favorite Anime** side by side (2 cols)
   - c. `.badges-showcase` — **Badges & Awards** full width
   - d. `.genre-section` — **Genre Breakdown** (donut chart + stats + legend) full width
5. `<BottomNavBar>` — fixed bottom mobile nav, always on top
