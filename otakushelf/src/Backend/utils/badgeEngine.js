/**
 * OtakuShelf — Badge Evaluation Engine
 *
 * evaluateBadges(userId)
 *   → loads AnimeList + User from DB
 *   → computes derived stats once
 *   → runs all 100 badge checks (pure, no DB inside)
 *   → pushes newly earned badges into user.profile.badges
 *   → saves user
 *   → returns { newBadges, totalEarned }
 *
 * This is designed to be called fire-and-forget after any list mutation.
 * It is safe to call multiple times — deduplication is done via badge id.
 */

import User from '../models/User.js';
import AnimeList from '../models/AnimeList.js';
import BADGES from './badgeDefinitions.js';
import badgeEvents from './badgeEvents.js';

// All 19 official AniList genres (for uniqueGenresWatched counting)
const ALL_GENRES = [
  'Action', 'Adventure', 'Avant Garde', 'Award Winning',
  'Boys Love', 'Comedy', 'Drama', 'Fantasy', 'Girls Love',
  'Gourmet', 'Horror', 'Mystery', 'Romance', 'Sci-Fi',
  'Slice of Life', 'Sports', 'Supernatural', 'Suspense', 'Thriller'
];

/**
 * Compute all derived stats from the raw DB documents.
 * This is a pure computation — no async calls.
 *
 * @param {Object} animeList  — Mongoose AnimeList document (or null)
 * @param {Object} user       — Mongoose User document
 * @returns {Object}          — stats object consumed by badge check() fns
 */
function computeStats(animeList, user) {
  const watching   = animeList?.watching  || [];
  const completed  = animeList?.completed || [];
  const planned    = animeList?.planned   || [];
  const dropped    = animeList?.dropped   || [];

  const allAnime = [...watching, ...completed, ...planned, ...dropped];

  // ── Episode & hour totals ──────────────────────────────────────
  let totalEpisodes = 0;
  allAnime.forEach(a => { totalEpisodes += (a.episodesWatched || 0); });
  // 24-minute average per episode → convert to hours
  const hoursWatched = parseFloat((totalEpisodes * 24 / 60).toFixed(2));

  // ── Genre counts (across all lists) ──────────────────────────
  const genreCounts = {};
  const seenGenresPerAnime = new Set(); // track per-anime to avoid double-counting genres
  allAnime.forEach(anime => {
    if (!Array.isArray(anime.genres)) return;
    const perAnimeKey = anime._id?.toString() || anime.animeId || anime.title;
    if (seenGenresPerAnime.has(perAnimeKey)) return;
    seenGenresPerAnime.add(perAnimeKey);
    anime.genres.forEach(g => {
      const name = typeof g === 'string' ? g : g?.name;
      if (name) genreCounts[name] = (genreCounts[name] || 0) + 1;
    });
  });

  const uniqueGenresWatched = Object.keys(genreCounts).filter(g =>
    ALL_GENRES.includes(g) && genreCounts[g] > 0
  ).length;

  // ── Rating stats ──────────────────────────────────────────────
  let ratedCount     = 0;
  let ratingSum      = 0;
  let perfectRatings = 0; // 5/5
  let lowestRatings  = 0; // 1/5
  allAnime.forEach(a => {
    if (a.userRating && a.userRating > 0) {
      ratedCount++;
      ratingSum += a.userRating;
      if (a.userRating >= 5) perfectRatings++;
      if (a.userRating <= 1) lowestRatings++;
    }
  });
  const avgRating = ratedCount > 0 ? ratingSum / ratedCount : 0;

  // ── Account info ─────────────────────────────────────────────
  const accountAgeDays = user.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // ── Profile completeness ─────────────────────────────────────
  const hasBio        = !!(user.profile?.bio && user.profile.bio.trim().length > 0);
  const hasUsername   = !!(user.profile?.username && user.profile.username.trim().length > 0);
  const hasCoverImage = !!(user.profile?.coverImage && user.profile.coverImage.trim().length > 0);

  // ── hasMalImport: check if 'mal_importer' badge already earned OR
  //    user has list entries with malId (meaning they imported).
  //    This flag is also set to true externally by the MAL import route.
  const existingBadgeIds = new Set((user.profile?.badges || []).map(b => b.id).filter(Boolean));
  const hasMalImport = existingBadgeIds.has('mal_importer') || allAnime.some(a => a.malId && !a.malId.startsWith('mal_'));

  return {
    // List counts
    totalAnime : allAnime.length,
    watching   : watching.length,
    completed  : completed.length,
    planned    : planned.length,
    dropped    : dropped.length,

    // Episodes & time
    totalEpisodes,
    hoursWatched,

    // Genre data
    genreCounts,
    uniqueGenresWatched,

    // Rating data
    ratedCount,
    avgRating,
    perfectRatings,
    lowestRatings,

    // Account
    accountAgeDays,
    hasGoogleAuth  : user.authType === 'google',
    isMfaEnabled   : !!user.isMfaEnabled,
    hasBio,
    hasUsername,
    hasCoverImage,
    hasMalImport,
  };
}

/**
 * Main export: evaluate all badges for a user and persist newly earned ones.
 *
 * @param {string}  userId         — MongoDB ObjectId string
 * @param {boolean} forceMalImport — Set true when called from the MAL import route
 *                                   to guarantee the mal_importer badge is awarded.
 * @returns {{ newBadges: Array, totalEarned: number }}
 */
async function evaluateBadges(userId, forceMalImport = false) {
  try {
    const [user, animeList] = await Promise.all([
      User.findById(userId),
      AnimeList.findOne({ userId }),
    ]);

    if (!user) {
      console.warn(`[BadgeEngine] User ${userId} not found — skipping evaluation`);
      return { newBadges: [], totalEarned: 0 };
    }

    // Ensure profile.badges is an array
    if (!user.profile) user.profile = {};
    if (!Array.isArray(user.profile.badges)) user.profile.badges = [];

    // Build set of already-earned badge IDs for O(1) deduplication
    const earnedIds = new Set(user.profile.badges.map(b => b.id).filter(Boolean));

    // Compute stats
    const stats = computeStats(animeList, user);

    // Honour the forceMalImport override
    if (forceMalImport) stats.hasMalImport = true;

    const now = new Date();
    const newBadges = [];

    for (const badge of BADGES) {
      // Skip already earned
      if (earnedIds.has(badge.id)) continue;

      // Run the pure check
      let earned = false;
      try {
        earned = badge.check(stats);
      } catch (checkErr) {
        console.error(`[BadgeEngine] check() threw for badge "${badge.id}":`, checkErr);
      }

      if (earned) {
        const badgeEntry = {
          id          : badge.id,
          title       : badge.title,
          description : badge.description,
          icon        : badge.icon,
          rarity      : badge.rarity,
          category    : badge.category,
          earnedDate  : now,
        };
        user.profile.badges.push(badgeEntry);
        earnedIds.add(badge.id);
        newBadges.push(badgeEntry);
      }
    }

    if (newBadges.length > 0) {
      // Mark the subdocument as modified so Mongoose saves it
      user.markModified('profile.badges');
      await user.save();
      console.log(`[BadgeEngine] ✅ Awarded ${newBadges.length} new badge(s) to user ${userId}:`,
        newBadges.map(b => b.title).join(', '));

      // Emit event so WebSocket can broadcast it to frontend
      badgeEvents.emit('awarded', userId.toString(), newBadges);
    }

    return {
      newBadges,
      totalEarned: user.profile.badges.length,
    };

  } catch (err) {
    // Never let badge evaluation crash the calling route
    console.error(`[BadgeEngine] ❌ Evaluation failed for user ${userId}:`, err.message);
    return { newBadges: [], totalEarned: 0 };
  }
}

export { evaluateBadges, computeStats, BADGES };
export default evaluateBadges;
