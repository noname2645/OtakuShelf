import React, { useState, useEffect, useMemo, useCallback } from "react";
import "../Stylesheets/profilescreen.css";
import api from "../api.js";
import { useAuth } from "./AuthContext";
import { useParams } from "react-router-dom";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import BottomNavBar from "./bottom.jsx";
import AnimeCardUI from "./AnimeCardUI.jsx";
import Modal from "./modal.jsx";
import { getBadgeImage } from "../badgeImages.js";

const API = import.meta.env.VITE_API_BASE_URL;

const ALL_ANIME_GENRES = [
  "Action","Adventure","Avant Garde","Award Winning",
  "Boys Love","Comedy","Drama","Fantasy","Girls Love",
  "Gourmet","Horror","Mystery","Romance","Sci-Fi",
  "Slice of Life","Sports","Supernatural","Suspense","Thriller",
];

const RARITY_ORDER = ['common','uncommon','rare','epic','legendary'];
const RARITY_COLORS = {
  common:    { border: 'rgba(148,163,184,0.35)', glow: 'rgba(148,163,184,0.15)', label: '#94a3b8' },
  uncommon:  { border: 'rgba(74,222,128,0.45)',  glow: 'rgba(74,222,128,0.15)',  label: '#4ade80' },
  rare:      { border: 'rgba(96,165,250,0.5)',   glow: 'rgba(96,165,250,0.18)',  label: '#60a5fa' },
  epic:      { border: 'rgba(192,132,252,0.55)', glow: 'rgba(192,132,252,0.2)',  label: '#c084fc' },
  legendary: { border: 'rgba(251,191,36,0.65)',  glow: 'rgba(251,191,36,0.25)',  label: '#fbbf24' },
};

const GENRE_COLORS = [
  "#FF6B6B","#4ECDC4","#FFD166","#06D6A0","#118AB2",
  "#EF476F","#073B4C","#7209B7","#3A86FF","#FB5607",
  "#8338EC","#FF006E","#FFBE0B","#3A86FF","#FB5607",
  "#FF595E","#8AC926","#1982C4","#6A4C93",
];

const prepareChartData = (userGenres) => {
  if (!userGenres) userGenres = [];
  const userGenreMap = {};
  userGenres.forEach((genre) => {
    if (genre && genre.name) {
      userGenreMap[genre.name.toLowerCase()] = {
        percentage: genre.percentage || 0,
        count: genre.count || 0,
      };
    }
  });
  return ALL_ANIME_GENRES.map((name, index) => {
    const ug = userGenreMap[name.toLowerCase()];
    return {
      name,
      value: ug ? ug.percentage : 0,
      count: ug ? ug.count : 0,
      color: GENRE_COLORS[index % GENRE_COLORS.length],
    };
  }).sort((a, b) => {
    if (a.value === 0 && b.value === 0) return a.name.localeCompare(b.name);
    if (a.value === 0) return 1;
    if (b.value === 0) return -1;
    return b.value - a.value;
  });
};

const fixImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) return `${API.replace("/api","")}${url}`;
  return url;
};

const normalizeTitle = (anime) => {
  if (!anime) return "Unknown";
  const t = anime.title;
  if (typeof t === "object") return t.english || t.romaji || t.native || "Unknown";
  return t || "Unknown";
};

const extractImage = (anime) => {
  return anime?.coverImage?.extraLarge || anime?.coverImage?.large || anime?.image || "/placeholder-anime.jpg";
};

const toAnimeShape = (entry) => {
  if (!entry) return entry;
  const img = entry.coverImage?.extraLarge || entry.coverImage?.large || entry.image || '';
  const t = entry.title;
  const title = typeof t === 'object' ? (t.english || t.romaji || t.native || '') : (t || '');
  return {
    ...entry,
    id: entry.animeId || entry.id,
    animeId: entry.animeId || entry.id,
    title,
    image: img,
    coverImage: entry.coverImage && typeof entry.coverImage === 'object'
      ? entry.coverImage
      : (img ? { extraLarge: img, large: img, medium: img } : undefined),
    genres: Array.isArray(entry.genres) ? entry.genres : [],
    episodes: entry.totalEpisodes || entry.episodes || undefined,
    status: entry.status,
  };
};

// Fetch AniList community score for a batch of entries (cached endpoint used by the Modal)
const enrichWithScores = async (entries, setter) => {
  if (!Array.isArray(entries) || entries.length === 0) return;
  const results = await Promise.all(
    entries.map(async (entry) => {
      const rawId = entry.animeId || entry.id;
      const idNum = parseInt(String(rawId), 10);
      if (!idNum) return { ...entry };
      const isMalImport = entry.malId && entry.animeId && String(entry.malId) === String(entry.animeId);
      try {
        const res = await api.get(`${API}/api/anime/anime/${idNum}${isMalImport ? '?mal=1' : ''}`);
        const media = res.data?.data;
        if (media?.averageScore) {
          return { ...entry, averageScore: media.averageScore };
        }
      } catch (e) {}
      return { ...entry };
    })
  );
  setter(results);
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="ps-tooltip">
        <p className="ps-tooltip-genre">{d.name}</p>
        <p className="ps-tooltip-pct">{d.value.toFixed(1)}%</p>
        <p className="ps-tooltip-count">({d.count} anime)</p>
      </div>
    );
  }
  return null;
};

const ActivityHeatmap = ({ watchLog }) => {
  const logMap = useMemo(() => {
    const m = {};
    watchLog.forEach(e => { m[e.date] = e.count; });
    return m;
  }, [watchLog]);

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 363);
    const dow = start.getDay();
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));

    const days = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const ds = cursor.toISOString().split('T')[0];
      const dayIdx = cursor.getDay();
      const weekIdx = Math.floor((cursor - start) / (7 * 86400000));
      days.push({ date: ds, dayIdx, weekIdx, count: logMap[ds] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const grouped = {};
    days.forEach(d => {
      if (!grouped[d.weekIdx]) grouped[d.weekIdx] = [];
      grouped[d.weekIdx].push(d);
    });

    const w = Object.keys(grouped).sort((a, b) => a - b).map(k => {
      const week = grouped[k];
      const filled = [];
      for (let i = 0; i < 7; i++) {
        filled.push(week.find(d => d.dayIdx === i) || null);
      }
      return filled;
    });

    const labels = [];
    let last = '';
    w.forEach((week, i) => {
      if (!week[0]) return;
      const m = new Date(week[0].date + 'T00:00:00').toLocaleString('en-US', { month: 'short' });
      if (m !== last) { labels.push({ label: m, idx: i }); last = m; }
    });

    return { weeks: w, monthLabels: labels };
  }, [logMap]);

  const getColor = (count) => {
    if (count === 0) return 'var(--hm-0, #1a1f35)';
    if (count <= 2) return 'var(--hm-1, #0e4429)';
    if (count <= 5) return 'var(--hm-2, #006d32)';
    if (count <= 10) return 'var(--hm-3, #26a641)';
    return 'var(--hm-4, #39d353)';
  };

  const dayLabels = ['Mon','','Wed','','Fri','',''];

  return (
    <div className="ps-heatmap">
      <div className="ps-hm-scroll">
        <div className="ps-hm-month-row">
          <span className="ps-hm-spacer" />
          {monthLabels.map((m, i) => (
            <span key={i} className="ps-hm-month" style={{ marginLeft: `${m.idx * 15}px` }}>{m.label}</span>
          ))}
        </div>
        <div className="ps-hm-body">
          <div className="ps-hm-days">
            {dayLabels.map((l, i) => <span key={i} className="ps-hm-day">{l}</span>)}
          </div>
          <div className="ps-hm-weeks">
            {weeks.map((week, wi) => (
              <div key={wi} className="ps-hm-week">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    className="ps-hm-cell"
                    style={{ backgroundColor: cell ? getColor(cell.count) : 'transparent' }}
                    title={cell ? `${cell.date}: ${cell.count} entries` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileScreen = () => {
  const { user } = useAuth();
  const { userId: paramUserId } = useParams();
  const targetUserId = paramUserId || user?._id;

  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentlyWatched, setRecentlyWatched] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [badges, setBadges] = useState([]);
  const [genres, setGenres] = useState([]);
  const [allBadgeDefs, setAllBadgeDefs] = useState([]);
  const [watchLog, setWatchLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedAnime, setSelectedAnime] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAnimeModal = useCallback((anime) => {
    if (!anime) return;
    setSelectedAnime(anime);
    setIsModalOpen(true);
  }, []);

  const closeAnimeModal = useCallback(() => {
    setSelectedAnime(null);
    setIsModalOpen(false);
  }, []);

  const chartData = useMemo(() => prepareChartData(genres), [genres]);

  const enrichedBadges = useMemo(() => {
    const earnedIds = new Set(badges.map(b => b.id).filter(Boolean));
    return allBadgeDefs.map(def => ({
      ...def,
      earned: earnedIds.has(def.id),
      earnedDate: badges.find(b => b.id === def.id)?.earnedDate || null,
    }));
  }, [allBadgeDefs, badges]);

  const earnedBadgeCount = enrichedBadges.filter(b => b.earned).length;
  const totalBadgeDefs = enrichedBadges.length;
  const badgePct = totalBadgeDefs > 0 ? Math.round((earnedBadgeCount / totalBadgeDefs) * 100) : 0;

  const recentBadges = useMemo(() => {
    return enrichedBadges
      .filter(b => b.earned && b.earnedDate)
      .sort((a, b) => new Date(b.earnedDate) - new Date(a.earnedDate))
      .slice(0, 3);
  }, [enrichedBadges]);

  const genresWithData = chartData.filter(g => g.value > 0);
  const topGenreName = genresWithData.length > 0 ? genresWithData[0].name : '';
  const topGenreColor = genresWithData.length > 0 ? genresWithData[0].color : 'rgba(255,255,255,0.02)';
  const top5Genres = genresWithData.slice(0, 5);
  const watchedGenres = genresWithData.length;
  const totalGenres = ALL_ANIME_GENRES.length;
  const topPercentage = genresWithData.length > 0 ? Math.max(...genresWithData.map(g => g.value)).toFixed(1) : "0";
  const coveragePct = totalGenres > 0 ? ((watchedGenres / totalGenres) * 100).toFixed(1) : "0";

  const formatLastActive = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    if (targetUserId) loadData();
    else setLoading(false);
  }, [targetUserId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [profileRes, badgeRes, wlRes] = await Promise.all([
        api.get(`${API}/api/profile/${targetUserId}`),
        api.get(`${API}/api/badges/all`),
        api.get(`${API}/api/profile/${targetUserId}/watchLog`),
      ]);

      const d = profileRes.data.data;
      const badgeDefs = badgeRes.data?.data || [];

      setProfileData({
        name: d.user?.name || "Anime Lover",
        username: d.profile?.username || `@user_${String(targetUserId).slice(-6)}`,
        bio: d.profile?.bio || "Anime enthusiast exploring new worlds through animation",
        joinDate: new Date(d.profile?.joinDate || d.user?.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        avatar: fixImageUrl(d.user?.photo),
        coverImage: fixImageUrl(d.profile?.coverImage),
        lastActiveAt: d.profile?.lastActiveAt || null,
      });

      setStats(d.stats || {});
      setRecentlyWatched(d.recentlyWatched || []);
      setFavorites(d.favorites || []);
      setBadges(d.profile?.badges || []);
      setGenres(d.profile?.favoriteGenres || []);
      setAllBadgeDefs(badgeDefs);
      setWatchLog(wlRes.data?.data || []);

      enrichWithScores(d.recentlyWatched || [], setRecentlyWatched);
      enrichWithScores((d.favorites || []).slice(0, 10), setFavorites);
    } catch (err) {
      console.error("Error loading profile screen:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, payload }) => {
    if (payload.value > 3) {
      const RADIAN = Math.PI / 180;
      const mr = (innerRadius + outerRadius) / 2;
      const x = cx + mr * Math.cos(-midAngle * RADIAN);
      const y = cy + mr * Math.sin(-midAngle * RADIAN);
      return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight="bold" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
          {`${payload.value.toFixed(1)}%`}
        </text>
      );
    }
    return null;
  };

  if (loading || !profileData) {
    return (
      <div className="ps-loading">
        <BottomNavBar />
        <div className="ps-loading-inner">
          <div className="ps-loading-spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-container">
      <BottomNavBar />

      {/* ─── SECTION 1: HERO BLOCK ─── */}
      <section className="ps-section ps-hero">
        <div className="ps-hero-bg">
          <img
            src={profileData.coverImage || 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1600&q=80'}
            alt=""
            className="ps-hero-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="ps-hero-gradient" />
        </div>

        <div className="ps-hero-content">
          <div className="ps-avatar">
            {profileData.avatar
              ? <img src={profileData.avatar} alt="" />
              : <div className="ps-avatar-placeholder">{profileData.name.charAt(0)}</div>
            }
          </div>

          <div className="ps-hero-info">
            <h1 className="ps-name">{profileData.name}</h1>
            <span className="ps-username">{profileData.username}</span>
            <p className="ps-bio">{profileData.bio}</p>
            <div className="ps-meta-row">
              <span className="ps-join">Joined {profileData.joinDate}</span>
              <span className="ps-meta-dot">·</span>
              <span className="ps-last">Last seen {formatLastActive(profileData.lastActiveAt)}</span>
            </div>
          </div>

          <div className="ps-stats-row">
            <div className="ps-stat-item">
              <span className="ps-stat-num">{stats?.animeWatched ?? 0}</span>
              <span className="ps-stat-label">Watched</span>
            </div>
            <div className="ps-stat-item">
              <span className="ps-stat-num">{stats?.hoursWatched ?? 0}</span>
              <span className="ps-stat-label">Hours</span>
            </div>
            <div className="ps-stat-item">
              <span className="ps-stat-num">{stats?.meanScore ?? 0}</span>
              <span className="ps-stat-label">Score</span>
            </div>
            <div className="ps-stat-item">
              <span className="ps-stat-num">{stats?.favorites ?? 0}</span>
              <span className="ps-stat-label">Favs</span>
            </div>
            <div className="ps-stat-item">
              <span className="ps-stat-num">{stats?.currentlyWatching ?? 0}</span>
              <span className="ps-stat-label">Watchi</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: ACHIEVEMENTS PROGRESS ─── */}
      <section className="ps-section ps-card">
        <div className="ps-section-header">
          <h2>Achievements</h2>
          <span className="ps-badge-count">{earnedBadgeCount}/{totalBadgeDefs}</span>
        </div>
        <div className="ps-progress-wrap">
          <div className="ps-progress-bar">
            <div className="ps-progress-fill" style={{ width: `${badgePct}%` }} />
          </div>
          <span className="ps-progress-label">{badgePct}% complete</span>
        </div>
      </section>

      {/* ─── SECTION 3: RECENT ACHIEVEMENTS ─── */}
      <section className="ps-section ps-card">
        <div className="ps-section-header">
          <h2>Recent Achievements</h2>
        </div>
        {recentBadges.length > 0 ? (
          <div className="ps-recent-badges">
            {recentBadges.map(badge => {
              const rc = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
              return (
                <div
                  key={badge.id}
                  className="ps-recent-badge"
                  style={{ borderColor: rc.border }}
                >
                  <span className="ps-recent-icon">{badge.icon}</span>
                  <div className="ps-recent-info">
                    <span className="ps-recent-title">{badge.title}</span>
                    <span className="ps-recent-rarity" style={{ color: rc.label }}>
                      {(badge.rarity || '').toUpperCase()}
                    </span>
                    {badge.earnedDate && (
                      <span className="ps-recent-date">
                        {new Date(badge.earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="ps-empty">No achievements yet. Keep watching!</p>
        )}
      </section>

      {/* ─── SECTION 4: ACHIEVEMENTS GRID ─── */}
      <section className="ps-section ps-card">
        <div className="ps-section-header">
          <h2>Badges</h2>
          <span className="ps-badge-count">{earnedBadgeCount}/{totalBadgeDefs}</span>
        </div>
        <div className="ps-badge-scroll">
          {allBadgeDefs.map(badge => {
            const earned = badges.some(b => b.id === badge.id);
            const rc = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
            return (
              <div
                key={badge.id}
                className={`ps-badge-cell ${earned ? 'earned' : 'locked'}`}
                style={earned ? { borderColor: rc.border, '--glow-color': rc.glow } : {}}
                title={badge.title}
              >
                <span className="ps-cell-icon">
                  {earned ? (
                    getBadgeImage(badge.id) ? (
                      <img src={getBadgeImage(badge.id)} alt={badge.title} className="ps-cell-img" />
                    ) : badge.icon
                  ) : badge.icon}
                </span>
                {!earned && <div className="ps-cell-lock">🔒</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── SECTION 5: RECENTLY WATCHED ─── */}
      <section className="ps-section ps-card">
        <div className="ps-section-header">
          <h2>Recently Watched</h2>
        </div>
        {recentlyWatched.length > 0 ? (
          <div className="ps-asym-grid">
            {recentlyWatched.slice(0, 5).map((anime, idx) => (
              idx === 0 ? (
                <div
                  key={anime.animeId || idx}
                  className="ps-asym-card hero"
                  onClick={() => openAnimeModal(toAnimeShape(anime))}
                  role="button"
                  tabIndex={0}
                >
                  <img src={extractImage(anime)} alt={normalizeTitle(anime)} />
                  <div className="ps-asym-overlay">
                    <span className="ps-asym-title">{normalizeTitle(anime)}</span>
                  </div>
                </div>
              ) : (
                <AnimeCardUI
                  key={anime.animeId || idx}
                  anime={toAnimeShape(anime)}
                  index={idx}
                  isGrid
                  onClick={openAnimeModal}
                />
              )
            ))}
          </div>
        ) : (
          <p className="ps-empty">Nothing watched yet.</p>
        )}
      </section>

      {/* ─── SECTION 6: FAVOURITES ─── */}
      <section className="ps-section ps-card">
        <div className="ps-section-header">
          <h2>Favourites</h2>
        </div>
        {favorites.length > 0 ? (
          <div className="ps-fav-grid">
            {favorites.slice(0, 10).map((anime, idx) => (
              <AnimeCardUI
                key={anime.animeId || idx}
                anime={toAnimeShape(anime)}
                index={idx}
                isGrid
                onClick={openAnimeModal}
              />
            ))}
          </div>
        ) : (
          <p className="ps-empty">No favourites yet.</p>
        )}
      </section>

      {/* ─── SECTION 7: GENRE BREAKDOWN ─── */}
      <section className="ps-section ps-card">
        <div className="ps-section-header">
          <h2>Genre Breakdown</h2>
        </div>

        {genresWithData.length > 0 ? (
          <>
            <div className="ps-genre-pills">
              {top5Genres.map((genre, i) => (
                <div
                  key={i}
                  className="ps-genre-pill"
                  style={{ flexBasis: `${Math.max(genre.value, 6)}%`, backgroundColor: genre.color }}
                >
                  <span className="ps-pill-name">{genre.name}</span>
                  <span className="ps-pill-pct">{genre.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>

            <div className="ps-genre-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={genresWithData}
                    cx="50%" cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    innerRadius={50}
                    dataKey="value"
                    nameKey="name"
                    label={renderCustomizedLabel}
                  >
                    {genresWithData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '22px', fontWeight: 'bold', fill: '#fff' }}>
                    {watchedGenres}
                  </text>
                  <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '11px', fill: '#64748b' }}>
                    Genres
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="ps-genre-legend">
              {genresWithData.map((genre, i) => (
                <div key={i} className="ps-legend-row">
                  <span className="ps-legend-dot" style={{ backgroundColor: genre.color }} />
                  <span className="ps-legend-name">{genre.name}</span>
                  <span className="ps-legend-pct">{genre.value.toFixed(1)}%</span>
                  <span className="ps-legend-count">{genre.count}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="ps-empty">No genre data yet.</p>
        )}
      </section>

      {/* ─── SECTION 8: ACTIVITY HEATMAP ─── */}
      <section className="ps-section ps-card">
        <div className="ps-section-header">
          <h2>Activity</h2>
        </div>
        <ActivityHeatmap watchLog={watchLog} />
      </section>

      {selectedAnime && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeAnimeModal}
          anime={selectedAnime}
          onOpenAnime={setSelectedAnime}
        />
      )}
    </div>
  );
};

export default ProfileScreen;
