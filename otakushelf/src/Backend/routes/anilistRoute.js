// routes/anilistRoute.js
import express from 'express';
import axios from 'axios';
import { success, error } from '../utils/responseHandler.js';

const router = express.Router();

const ANILIST_URL = "https://graphql.anilist.co";

const axiosConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://anilist.co',
    'Referer': 'https://anilist.co',
    'User-Agent': 'Mozilla/5.0'
  }
};

// Cache - initialized immediately
let heroCache = { data: null, timestamp: 0 };
const HERO_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Helper to fetch from AniList
async function fetchAniList(query, variables = {}) {
  try {
    const response = await axios.post(
      ANILIST_URL,
      { query, variables },
      axiosConfig
    );
    return response.data.data;
  } catch (error) {
    console.error("AniList API error:", error.message);
    throw error;
  }
}

// ──────────────────────────────────────────────
//  ERA DEFINITIONS  (FuzzyDateInt = YYYYMMDD as Int)
//  golden   : ≤ 31 Dec 1999  — true classics / forgotten masterpieces
//  millen   : 1 Jan 2000 – 31 Dec 2012 — peak cult era
//  bridge   : 1 Jan 2013 – 31 Dec 2019 — modern-era golden bridge
//  current  : 2020+ airing / recent hits
//  upcoming : announced but not yet released
// ──────────────────────────────────────────────

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  description(asHtml: false)
  status
  season
  seasonYear
  episodes
  averageScore
  popularity
  trending
  bannerImage
  coverImage { large extraLarge medium color }
  genres
  format
  startDate { year month day }
  endDate { year month day }
  studios {
    nodes { name isAnimationStudio }
  }
  trailer { id site thumbnail }
`;

// 🏺 Golden Era  ≤ 1999-12-31
const goldenQuery = `
  query {
    Page(page: 1, perPage: 40) {
      media(
        sort: [SCORE_DESC]
        type: ANIME
        isAdult: false
        startDate_lesser: 19991231
        averageScore_greater: 72
        format_in: [TV, MOVIE, OVA, ONA]
      ) { ${MEDIA_FIELDS} }
    }
  }
`;

// 💎 Millennium Era  2000-01-01 → 2012-12-31
const millenQuery = `
  query {
    Page(page: 1, perPage: 40) {
      media(
        sort: [SCORE_DESC]
        type: ANIME
        isAdult: false
        startDate_greater: 19991231
        startDate_lesser: 20121231
        averageScore_greater: 72
        format_in: [TV, MOVIE, OVA, ONA]
      ) { ${MEDIA_FIELDS} }
    }
  }
`;

// ⚡ Bridge / Cult Era  2013-01-01 → 2019-12-31
const bridgeQuery = `
  query {
    Page(page: 1, perPage: 40) {
      media(
        sort: [SCORE_DESC]
        type: ANIME
        isAdult: false
        startDate_greater: 20121231
        startDate_lesser: 20191231
        averageScore_greater: 72
        format_in: [TV, MOVIE, OVA, ONA]
      ) { ${MEDIA_FIELDS} }
    }
  }
`;

// 🔥 Modern / Trending Now  — currently releasing
const releasingQuery = `
  query {
    Page(page: 1, perPage: 40) {
      media(
        sort: [TRENDING_DESC, POPULARITY_DESC]
        type: ANIME
        isAdult: false
        status: RELEASING
        format_in: [TV, ONA]
      ) { ${MEDIA_FIELDS} }
    }
  }
`;

// 🚀 Upcoming — announced but not yet aired
const upcomingQuery = `
  query {
    Page(page: 1, perPage: 20) {
      media(
        sort: [POPULARITY_DESC]
        type: ANIME
        isAdult: false
        status: NOT_YET_RELEASED
        format_in: [TV, ONA, MOVIE]
      ) { ${MEDIA_FIELDS} }
    }
  }
`;


// ──────────────────────────────────────────────
//  HIDDEN GEM SCORE
//  Rewards high averageScore AND punishes very high popularity
//  (if everyone already knows it, it's not a "hidden gem")
//  Score range: 0–100
// ──────────────────────────────────────────────
const hiddenGemScore = (anime) => {
  const score = anime.averageScore || 0;          // 0-100
  const pop   = anime.popularity   || 1;

  // Popularity penalty: log scale so it's not brutal
  // A show with pop=500 gets ~0 penalty; pop=50000 gets ~0.4 penalty
  const popPenalty = Math.min(Math.log10(pop / 500) * 0.15, 0.5);
  return score * (1 - popPenalty);
};

// Generic quality score for modern/releasing (pure quality + trending)
const modernScore = (anime) => {
  const score    = (anime.averageScore || 0) * 0.45;
  const pop      = Math.min((anime.popularity  || 0) / 1000, 30) * 0.3; // cap contribution
  const trending = Math.min((anime.trending    || 0) / 10,   25) * 0.25;
  return score + pop + trending;
};

// ──────────────────────────────────────────────
//  MAIN FETCH FUNCTION
// ──────────────────────────────────────────────
const fetchHeroAnime = async () => {
  try {
    console.log("Fetching era-diverse hero trailers...");

    // Fire all queries in parallel
    const [
      goldenData,
      millenData,
      bridgeData,
      currentData,
      upcomingData,
    ] = await Promise.all([
      fetchAniList(goldenQuery).catch(e  => { console.error('Golden era query failed:', e.message); return { Page: { media: [] } }; }),
      fetchAniList(millenQuery).catch(e  => { console.error('Millennium query failed:', e.message); return { Page: { media: [] } }; }),
      fetchAniList(bridgeQuery).catch(e  => { console.error('Bridge query failed:',     e.message); return { Page: { media: [] } }; }),
      fetchAniList(releasingQuery).catch(e => { console.error('Releasing query failed:', e.message); return { Page: { media: [] } }; }),
      fetchAniList(upcomingQuery).catch(e  => { console.error('Upcoming query failed:',  e.message); return { Page: { media: [] } }; }),
    ]);

    const golden   = goldenData?.Page?.media   || [];
    const millen   = millenData?.Page?.media   || [];
    const bridge   = bridgeData?.Page?.media   || [];
    const current  = currentData?.Page?.media  || [];
    const upcoming = upcomingData?.Page?.media || [];

    console.log(`Raw counts — Golden: ${golden.length}, Millennium: ${millen.length}, Bridge: ${bridge.length}, Current: ${current.length}, Upcoming: ${upcoming.length}`);

    // ── Filter: must have YouTube trailer + image + title ──
    const requiresTrailerAndImage = (anime) => {
      const hasTrailer = anime.trailer?.id && anime.trailer?.site === 'youtube';
      const hasImage   = anime.bannerImage || anime.coverImage?.extraLarge;
      const hasTitle   = anime.title?.english || anime.title?.romaji;
      return hasTrailer && hasImage && hasTitle;
    };

    // ── Filter & sort each era bucket ──
    const goldenGems  = golden.filter(requiresTrailerAndImage)
                               .sort((a, b) => hiddenGemScore(b) - hiddenGemScore(a))
                               .slice(0, 5)
                               .map(a => ({ ...a, _era: 'golden', _eraLabel: '🏺 Golden Era Gem' }));

    const millenGems  = millen.filter(requiresTrailerAndImage)
                               .sort((a, b) => hiddenGemScore(b) - hiddenGemScore(a))
                               .slice(0, 5)
                               .map(a => ({ ...a, _era: 'millennium', _eraLabel: '💎 Hidden Gem' }));

    const bridgeGems  = bridge.filter(requiresTrailerAndImage)
                               .sort((a, b) => hiddenGemScore(b) - hiddenGemScore(a))
                               .slice(0, 4)
                               .map(a => ({ ...a, _era: 'bridge', _eraLabel: '⚡ Cult Classic' }));

    const modernHits  = current.filter(requiresTrailerAndImage)
                                .sort((a, b) => modernScore(b) - modernScore(a))
                                .slice(0, 6)
                                .map(a => ({ ...a, _era: 'modern', _eraLabel: '🔥 Trending Now' }));

    const upcomingHits = upcoming.filter(requiresTrailerAndImage)
                                  .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                                  .slice(0, 2)
                                  .map(a => ({ ...a, _era: 'upcoming', _eraLabel: '🚀 Coming Soon' }));

    console.log(`Filtered — Golden: ${goldenGems.length}, Millennium: ${millenGems.length}, Bridge: ${bridgeGems.length}, Modern: ${modernHits.length}, Upcoming: ${upcomingHits.length}`);

    // ── Interleave eras so the hero cycles through different eras smoothly ──
    // Target order: Modern → Golden → Millennium → Modern → Bridge → Upcoming → repeat
    const interleaved = [];
    const queues = {
      modern:     [...modernHits],
      golden:     [...goldenGems],
      millennium: [...millenGems],
      bridge:     [...bridgeGems],
      upcoming:   [...upcomingHits],
    };

    const pattern = ['modern', 'golden', 'millennium', 'modern', 'bridge', 'upcoming', 'modern', 'millennium', 'golden', 'bridge'];

    for (const era of pattern) {
      const item = queues[era]?.shift();
      if (item) interleaved.push(item);
    }

    // Append any remaining modern hits that didn't make the pattern
    for (const era of ['modern', 'golden', 'millennium', 'bridge']) {
      while (queues[era]?.length > 0) {
        interleaved.push(queues[era].shift());
      }
    }

    // Add display helper fields
    const enhanced = interleaved.map(anime => ({
      ...anime,
      displayTitle: anime.title.english || anime.title.romaji || anime.title.native,
      mainStudio: anime.studios?.nodes?.find(s => s.isAnimationStudio)?.name || 'Unknown Studio',
    }));

    // Remove duplicates by id (in case a show appears in multiple era buckets)
    const seen = new Set();
    const deduped = enhanced.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    console.log(`Final hero anime count: ${deduped.length} (era-interleaved)`);
    return deduped;

  } catch (err) {
    console.error("Error in fetchHeroAnime:", err.message);
    return [];
  }
};

// Warm up cache on server start
const warmUpCache = async () => {
  try {
    const data = await fetchHeroAnime();
    if (data.length > 0) {
      heroCache = { data, timestamp: Date.now() };
      console.log("Hero cache warmed up successfully!");
    }
  } catch (err) {
    console.error("Failed to warm up hero cache:", err);
  }
};

// Start warming up immediately (fire and forget)
warmUpCache();

// Route 1: GET /api/anilist/hero-trailers — Get hero trailer anime
router.get("/hero-trailers", async (req, res) => {
  const now = Date.now();

  // 1. Try Memory Cache
  if (heroCache.data && heroCache.data.length > 0 && now - heroCache.timestamp < HERO_TTL) {
    return success(res, "Hero trailers fetched from cache", heroCache.data);
  }

  // 2. Fetch Fresh
  const freshData = await fetchHeroAnime();

  // 3. Update Cache & Respond
  if (freshData.length > 0) {
    heroCache = { data: freshData, timestamp: now };
    return success(res, "Hero trailers fetched successfully", freshData);
  }

  // 4. Fallback: Return stale cache if available, else empty
  if (heroCache.data && heroCache.data.length > 0) {
    console.log("Returning stale cache due to fetch failure");
    return success(res, "Returning stale cache due to fetch failure", heroCache.data);
  }

  return success(res, "No hero trailers found", []);
});

// Route 2: GET /api/anilist/hero-trailers/debug — Cache debug info
router.get("/hero-trailers/debug", (req, res) => {
  const now = Date.now();
  const debugData = {
    hasData: !!heroCache.data,
    count: heroCache.data?.length || 0,
    ageMinutes: heroCache.timestamp ? (now - heroCache.timestamp) / 60000 : 0,
    expired: now - heroCache.timestamp > HERO_TTL,
    eraBreakdown: heroCache.data ? {
      golden:     heroCache.data.filter(a => a._era === 'golden').length,
      millennium: heroCache.data.filter(a => a._era === 'millennium').length,
      bridge:     heroCache.data.filter(a => a._era === 'bridge').length,
      modern:     heroCache.data.filter(a => a._era === 'modern').length,
      upcoming:   heroCache.data.filter(a => a._era === 'upcoming').length,
    } : null
  };
  return success(res, "Hero cache debug info fetched successfully", debugData);
});

// Route 3: POST /api/anilist/hero-trailers/refresh — Force cache refresh
router.post("/hero-trailers/refresh", async (req, res) => {
  try {
    const data = await fetchHeroAnime();
    if (data.length > 0) {
      heroCache = { data, timestamp: Date.now() };
      return success(res, "Hero cache refreshed successfully", { count: data.length });
    } else {
      return error(res, "No data fetched", 500);
    }
  } catch (err) {
    return error(res, err.message, 500);
  }
});

export default router;