import React, { useState, useEffect, useMemo, useCallback } from "react";
import "../Stylesheets/profile.css";
import "../Stylesheets/settings.css";
import "../Stylesheets/home.css";
import api from "../api.js";
import { Header } from "../components/header";
import BottomNavBar from "../components/bottom.jsx";
import { useAuth } from "../components/AuthContext";
import { Link } from "react-router-dom";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import PageLoader from "./PageLoader.jsx";
import AnimeCardUI from "./AnimeCardUI.jsx";
import Modal from "./modal.jsx";

const ProfilePage = () => {
  const { user, updateProfile, checkAuthStatus, updateUserState } = useAuth();

  // Profile data
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentlyWatched, setRecentlyWatched] = useState([]);
  const [favoriteAnime, setFavoriteAnime] = useState([]);
  const [badges, setBadges] = useState([]);
  const [genres, setGenres] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    username: "",
  });
  const [allBadgeDefs, setAllBadgeDefs]   = useState([]);
  const [badgeFilter, setBadgeFilter]     = useState('All');
  const [badgeSort, setBadgeSort]         = useState('rarity-desc');
  const [checkingBadges, setCheckingBadges] = useState(false);

  // Anime detail modal state
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAnimeModal = useCallback((anime) => {
    setSelectedAnime(anime);
    setIsModalOpen(true);
  }, []);

  const closeAnimeModal = useCallback(() => {
    setSelectedAnime(null);
    setIsModalOpen(false);
  }, []);

  // Toast helper
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3500,
    );
  };

  const API = import.meta.env.VITE_API_BASE_URL;

  // Official 19 AniList genres
  const ALL_ANIME_GENRES = [
    "Action", "Adventure", "Avant Garde", "Award Winning", "Boys Love",
    "Comedy", "Drama", "Fantasy", "Girls Love", "Gourmet", "Horror",
    "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports",
    "Supernatural", "Suspense", "Thriller",
  ];

  // Backfill genres function — no longer shown in UI but kept for admin use
  const backfillGenres = async () => {
    try {
      setBackfilling(true);
      const response = await api.post(`${API}/api/list/${user._id}/backfill-genres`);
      const data = response.data;
      if (data.success) {
        showToast(`Genres updated for ${data.updated} anime!`);
        await loadProfileData();
      } else {
        showToast("Failed to backfill genres: " + (data.message || "Unknown error"), "error");
      }
    } catch (error) {
      showToast("Error backfilling genres: " + error.message, "error");
    } finally {
      setBackfilling(false);
    }
  };

  // Load all badge definitions
  const loadAllBadgeDefs = async () => {
    try {
      const res = await api.get(`${API}/api/badges/all`);
      setAllBadgeDefs(res.data?.data || []);
    } catch (e) {
      console.error('Failed to load badge definitions:', e);
    }
  };

  // Manually trigger badge evaluation
  const checkBadgesNow = async () => {
    if (!user?._id || checkingBadges) return;
    try {
      setCheckingBadges(true);
      const res = await api.post(
        `${API}/api/badges/evaluate/${user._id}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const data = res.data?.data;
      showToast(res.data?.message || 'Badges checked!');
      if (data?.newBadges?.length > 0) {
        await loadProfileData();
      }
    } catch (e) {
      showToast('Failed to check badges', 'error');
    } finally {
      setCheckingBadges(false);
    }
  };

  // Prepare chart data
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

    const colors = [
      "#FF6B6B","#4ECDC4","#FFD166","#06D6A0","#118AB2",
      "#EF476F","#073B4C","#7209B7","#3A86FF","#FB5607",
      "#8338EC","#FF006E","#FFBE0B","#3A86FF","#FB5607",
      "#FF595E","#8AC926","#1982C4","#6A4C93",
    ];

    const allGenresData = ALL_ANIME_GENRES.map((genreName, index) => {
      const userGenre = userGenreMap[genreName.toLowerCase()];
      const actualValue = userGenre ? userGenre.percentage : 0;
      return {
        name: genreName,
        value: actualValue,
        count: userGenre ? userGenre.count : 0,
        color: colors[index % colors.length],
      };
    });

    return allGenresData.sort((a, b) => {
      if (a.value === 0 && b.value === 0) return a.name.localeCompare(b.name);
      if (a.value === 0) return 1;
      if (b.value === 0) return -1;
      return b.value - a.value;
    });
  };

  const [chartData, setChartData] = useState([]);
  useEffect(() => { setChartData(prepareChartData(genres)); }, [genres]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <div className="tooltip-content">
            <p className="tooltip-genre">{data.name}</p>
            <p className="tooltip-percentage">{data.value.toFixed(1)}%</p>
            <p className="tooltip-count">({data.count} anime)</p>
          </div>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    if (user?._id) {
      loadProfileData();
      loadAllBadgeDefs();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await api.get(`${API}/api/profile/${user._id}`);
      const data = response.data.data;

      if (data) {
        const fixImageUrl = (url) => {
          if (!url) return null;
          if (url.startsWith("http") || url.startsWith("data:")) return url;
          if (url.startsWith("/uploads/")) {
            const backendBaseUrl = API.replace("/api", "");
            return `${backendBaseUrl}${url}`;
          }
          return url;
        };

        // API shape: { user, profile, stats, recentlyWatched, favorites, topGenres, badgeInfo }
        const userData    = data.user    || data;          // user info is under data.user
        const profileData = data.profile || {};            // profile sub-object
        const statsData   = data.stats   || {};            // stats is top-level

        setProfileData({
          name: userData.name || "Anime Lover",
          username: profileData.username || `@user_${user._id.toString().slice(-6)}`,
          bio: profileData.bio || "Anime enthusiast exploring new worlds through animation",
          joinDate: new Date(profileData.joinDate || userData.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          avatar: fixImageUrl(userData.photo),
          coverImage: fixImageUrl(profileData.coverImage),
          email: userData.email,
          lastOnline: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        });

        setStats({
          animeWatched:      statsData.animeWatched      ?? 0,
          hoursWatched:      statsData.hoursWatched      ?? 0,
          currentlyWatching: statsData.currentlyWatching ?? 0,
          favorites:         statsData.favorites         ?? 0,
          animePlanned:      statsData.animePlanned       ?? 0,
          animeDropped:      statsData.animeDropped       ?? 0,
          totalEpisodes:     statsData.totalEpisodes      ?? 0,
          meanScore:         statsData.meanScore          ?? 0,
        });

        setRecentlyWatched(data.recentlyWatched || []);
        setFavoriteAnime(data.favorites || []);            // API key is "favorites" not "favoriteAnime"
        setBadges(profileData.badges || []);
        setGenres(profileData.favoriteGenres || []);

        setEditForm({
          name: userData.name || "",
          bio: profileData.bio || "",
          username: profileData.username || `@user_${user._id.toString().slice(-6)}`,
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfileData({
        name: "Anime Lover",
        username: `@user_${user?._id.toString().slice(-6) || "000000"}`,
        bio: "Anime enthusiast exploring new worlds through animation",
        joinDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        avatar: null, coverImage: null, email: "",
        lastOnline: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      });
      setStats({ animeWatched: 0, hoursWatched: 0, currentlyWatching: 0, favorites: 0, animePlanned: 0, animeDropped: 0, totalEpisodes: 0, meanScore: 0 });
      setRecentlyWatched([]); setFavoriteAnime([]); setBadges([]); setGenres([]);
      // Note: API returns { user, profile, stats, recentlyWatched, favorites } structure
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?._id) return;
    try {
      if (!file.type.startsWith("image/")) { showToast("Invalid image type.", "error"); return; }
      if (file.size > 5 * 1024 * 1024) { showToast("Image too large. Max 5MB.", "error"); return; }
      const formData = new FormData();
      formData.append("cover", file);
      const response = await api.post(`${API}/api/profile/${user._id}/upload-cover`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      const data = response.data.data;
      if (data.coverImage) {
        let coverUrl = data.coverImage;
        if (coverUrl && coverUrl.startsWith("/uploads/")) coverUrl = `${API.replace("/api", "")}${coverUrl}`;
        setProfileData((prev) => ({ ...prev, coverImage: coverUrl }));
        showToast("Cover image updated!");
      }
    } catch (error) {
      showToast("Failed to upload cover image.", "error");
    }
  };

  const handleEditProfile = () => setIsEditing(true);

  const handleSaveProfile = async () => {
    try {
      const updateData = { name: editForm.name, profile: { bio: editForm.bio, username: editForm.username } };
      await api.put(`${API}/api/profile/${user._id}`, updateData);
      if (updateProfile) await updateProfile(updateData);
      setProfileData((prev) => ({ ...prev, name: editForm.name, bio: editForm.bio, username: editForm.username }));
      setIsEditing(false);
      showToast("Profile updated successfully!");
      await loadProfileData();
    } catch (error) {
      showToast("Failed to update profile.", "error");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({ name: profileData?.name || "", bio: profileData?.bio || "", username: profileData?.username || "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    const userId = user?._id || localStorage.getItem("user_id") || JSON.parse(localStorage.getItem("user"))?.id;
    if (!userId) { showToast("Please log in to upload images", "error"); return; }
    if (!file) { showToast("Please select an image file", "error"); return; }
    try {
      if (!file.type.startsWith("image/")) { showToast("Please select a valid image file.", "error"); return; }
      if (file.size > 2 * 1024 * 1024) { showToast("Image size must be less than 2MB.", "error"); return; }
      const formData = new FormData();
      formData.append("photo", file);
      setLoading(true);
      const response = await api.post(`${API}/api/profile/${userId}/upload-photo`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      const result = response.data.data;
      let photoUrl = result.photo;
      if (photoUrl && photoUrl.startsWith("/uploads/")) photoUrl = `${API.replace("/api", "")}${photoUrl}`;
      setProfileData((prev) => ({ ...prev, avatar: photoUrl }));
      if (updateUserState) updateUserState({ photo: photoUrl });
      showToast("Profile picture updated!");
    } catch (error) {
      showToast("Failed to upload image.", "error");
      await loadProfileData();
    } finally {
      setLoading(false);
    }
  };

  const handleShareProfile = () => {
    const profileUrl = `${window.location.origin}/profile/${user?._id}`;
    if (navigator.share) {
      navigator.share({ title: `${profileData?.name}'s Anime Profile`, text: `Check out ${profileData?.name}'s anime profile on OtakuShelf!`, url: profileUrl });
    } else {
      navigator.clipboard.writeText(profileUrl);
      showToast("Profile link copied to clipboard!");
    }
  };

  // Custom label renderer for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, payload }) => {
    const actualValue = payload.value;
    if (actualValue > 3) {
      const RADIAN = Math.PI / 180;
      const middleRadius = (innerRadius + outerRadius) / 2;
      const x = cx + middleRadius * Math.cos(-midAngle * RADIAN);
      const y = cy + middleRadius * Math.sin(-midAngle * RADIAN);
      return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight="bold" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
          {`${actualValue.toFixed(1)}%`}
        </text>
      );
    }
    return null;
  };

  // --- Activity Heatmap (client-side derived) ---
  const heatmapData = useMemo(() => {
    // Build a map of date -> count from recentlyWatched
    const activityMap = {};
    recentlyWatched.forEach((anime) => {
      const ts = anime.updatedAt || anime.addedAt || anime.watchedAt;
      if (ts) {
        const dateKey = new Date(ts).toISOString().split('T')[0];
        activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
      }
    });

    // Build 52-week grid (364 days back from today)
    const today = new Date();
    const weeks = [];
    // Start from the Sunday 52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 363);
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    let current = new Date(startDate);
    while (current <= today) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const dateKey = current.toISOString().split('T')[0];
        week.push({ date: dateKey, count: activityMap[dateKey] || 0, future: current > today });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [recentlyWatched]);

  const getHeatmapColor = (count) => {
    if (count === 0) return 'rgba(255,255,255,0.05)';
    if (count === 1) return 'rgba(245,158,11,0.25)';
    if (count === 2) return 'rgba(245,158,11,0.50)';
    if (count === 3) return 'rgba(245,158,11,0.72)';
    return '#f59e0b';
  };

  const totalActivityDays = useMemo(() => {
    return heatmapData.flat().filter(d => d.count > 0).length;
  }, [heatmapData]);

  if (!profileData) {
    return (
      <>
        {showLoader && <PageLoader onFinish={() => setShowLoader(false)} />}
        <BottomNavBar />
        <div className="profile-page" style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0f1e 0%, #161b2e 100%)" }}>
          <Header showSearch={false} />
          {!showLoader && (
            <div className="profile-loading" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(180deg, #0a0f1e 0%, #161b2e 100%)" }}>
              <div className="loading-content">
                <div className="loading-spinner"></div>
                <h2 className="loading-text">Loading Your Anime Journey</h2>
                <p className="loading-subtext">Preparing your stats, favorites, and anime collection...</p>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // --- Badge calculations ---
  const earnedIds = new Set(badges.map(b => b.id).filter(Boolean));
  const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const RARITY_COLORS = {
    common:    { border: 'rgba(148,163,184,0.35)', glow: 'rgba(148,163,184,0.15)', label: '#94a3b8' },
    uncommon:  { border: 'rgba(74,222,128,0.45)',  glow: 'rgba(74,222,128,0.15)',  label: '#4ade80' },
    rare:      { border: 'rgba(96,165,250,0.5)',   glow: 'rgba(96,165,250,0.18)',  label: '#60a5fa' },
    epic:      { border: 'rgba(192,132,252,0.55)', glow: 'rgba(192,132,252,0.2)', label: '#c084fc' },
    legendary: { border: 'rgba(251,191,36,0.65)',  glow: 'rgba(251,191,36,0.25)', label: '#fbbf24' },
  };

  const enrichedBadges = allBadgeDefs.map(def => ({
    ...def,
    earned: earnedIds.has(def.id),
    earnedDate: badges.find(b => b.id === def.id)?.earnedDate || null,
  }));

  const badgeCategories = ['All', ...new Set(enrichedBadges.map(b => b.category))];
  const filteredBadges = badgeFilter === 'All' ? enrichedBadges : enrichedBadges.filter(b => b.category === badgeFilter);

  const sortedBadges = [...filteredBadges].sort((a, b) => {
    if (badgeSort !== 'alpha-asc' && badgeSort !== 'alpha-desc') {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
    }
    switch (badgeSort) {
      case 'date-desc': if (!a.earnedDate) return 1; if (!b.earnedDate) return -1; return new Date(b.earnedDate) - new Date(a.earnedDate);
      case 'date-asc':  if (!a.earnedDate) return 1; if (!b.earnedDate) return -1; return new Date(a.earnedDate) - new Date(b.earnedDate);
      case 'rarity-asc':  return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      case 'alpha-asc':   return a.title.localeCompare(b.title);
      case 'alpha-desc':  return b.title.localeCompare(a.title);
      case 'rarity-desc': default: return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    }
  });

  const totalBadgeDefs   = enrichedBadges.length;
  const earnedBadgeCount = enrichedBadges.filter(b => b.earned).length;
  const badgePct = totalBadgeDefs > 0 ? Math.round((earnedBadgeCount / totalBadgeDefs) * 100) : 0;

  // Recent achievements = last 6 earned (by date)
  const recentAchievements = enrichedBadges
    .filter(b => b.earned && b.earnedDate)
    .sort((a, b) => new Date(b.earnedDate) - new Date(a.earnedDate))
    .slice(0, 6);

  const earnedBadgesGrid  = sortedBadges.filter(b => b.earned);
  const lockedBadgesGrid  = sortedBadges.filter(b => !b.earned);

  // --- Genre breakdown ---
  const genresWithData = chartData.filter((g) => g.value > 0);
  const totalGenres    = ALL_ANIME_GENRES.length;
  const watchedGenres  = genresWithData.length;
  const topPercentage  = genresWithData.length > 0 ? Math.max(...genresWithData.map((g) => g.value)).toFixed(1) : "0";
  const topGenre       = genresWithData.length > 0 ? genresWithData[0] : null;
  const topGenreName   = topGenre ? topGenre.name : '';
  const topGenreColor  = topGenre ? topGenre.color : 'rgba(255,255,255,0.02)';
  const top5Genres     = genresWithData.slice(0, 5);
  const coveragePct    = totalGenres > 0 ? ((watchedGenres / totalGenres) * 100).toFixed(1) : "0";

  // Recently watched display — normalized shapes defined above


  const getTitle = (anime) => {
    if (!anime) return "";
    if (typeof anime.title === 'object') return anime.title.english || anime.title.romaji || anime.title.native || '';
    return anime.title || '';
  };
  const getImage = (anime) => {
    if (!anime) return '';
    return anime.coverImage?.extraLarge || anime.coverImage?.large || anime.image || '';
  };

  // Normalize list entries (animeId/image keys) into the shared anime shape used by AnimeCardUI + Modal
  const toAnimeShape = (entry) => {
    if (!entry) return entry;
    const img = entry.coverImage?.extraLarge || entry.coverImage?.large || entry.image || '';
    return {
      ...entry,
      id: entry.animeId || entry.id,
      animeId: entry.animeId || entry.id,
      title: getTitle(entry),
      image: img,
      coverImage: entry.coverImage && typeof entry.coverImage === 'object'
        ? entry.coverImage
        : (img ? { extraLarge: img, large: img, medium: img } : undefined),
      genres: Array.isArray(entry.genres) ? entry.genres : [],
      episodes: entry.totalEpisodes || entry.episodes || undefined,
      status: entry.status,
    };
  };

  // Featured + grid derived from normalized shapes
  const featuredAnime = toAnimeShape(recentlyWatched[0] || null);
  const gridAnime = recentlyWatched.slice(1, 5).map(toAnimeShape);

  // ── Main Render ────────────────────────────────────────────────
  return (
    <>
      {showLoader && <PageLoader onFinish={() => setShowLoader(false)} />}
      <BottomNavBar />

      {/* Toast */}
      {toast.show && (
        <div className={`settings-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.message}
        </div>
      )}

      {/* Hidden file inputs */}
      <input type="file" accept="image/*" id="cover-upload"  style={{ display: 'none' }} onChange={handleCoverUpload} />
      <input type="file" accept="image/*" id="avatar-upload" style={{ display: 'none' }} onChange={handleImageUpload} />

      <div className="profile-page">
        <Header showSearch={false} />

        {/* ════════════════════════════════════════════════════════
            SECTION 1 — PROFILE HEADER CARD
        ════════════════════════════════════════════════════════ */}
        <section className="profile-header-section">
          <div className="phc-inner">
            <div className="phc-card">
              {/* Cover image — right side */}
              <div className="phc-cover-zone">
                <img
                  src={profileData.coverImage || 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1600&q=80'}
                  alt="Cover"
                  className="phc-cover-img"
                />
                <div className="phc-cover-gradient" />
                <label htmlFor="cover-upload" className="phc-cover-btn">Change Cover</label>
              </div>

              {/* Main content layer */}
              <div className="phc-content">
                {/* Left content pane */}
                <div className="phc-left">
                  {/* Avatar */}
                  <div className="phc-avatar-zone">
                    <div className="phc-avatar">
                      {profileData.avatar
                        ? <img src={profileData.avatar} alt="Avatar" />
                        : <div className="phc-avatar-placeholder">{profileData.name.charAt(0)}</div>
                      }
                    </div>
                    <label htmlFor="avatar-upload" className="phc-avatar-change">CHANGE PHOTO</label>
                  </div>

                  {/* Identity or Edit Form */}
                  {isEditing ? (
                    <div className="phc-edit-form">
                      <div className="edit-form-group">
                        <label>Name</label>
                        <input type="text" name="name" value={editForm.name} onChange={handleInputChange} className="edit-input" />
                      </div>
                      <div className="edit-form-group">
                        <label>Username</label>
                        <input type="text" name="username" value={editForm.username} onChange={handleInputChange} className="edit-input" />
                      </div>
                      <div className="edit-form-group">
                        <label>Bio</label>
                        <textarea name="bio" value={editForm.bio} onChange={handleInputChange} className="edit-textarea" rows="3" />
                      </div>
                      <div className="edit-actions">
                        <button className="btn-save" onClick={handleSaveProfile}>Save Changes</button>
                        <button className="btn-cancel" onClick={handleCancelEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="phc-identity">
                      <h1 className="phc-name">{profileData.name}</h1>
                      <p className="phc-username">{profileData.username}</p>
                      <p className="phc-bio">{profileData.bio}</p>

                      <div className="phc-chips">
                        <span className="phc-chip">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          Last Online {profileData.lastOnline}
                        </span>
                        <span className="phc-chip">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          Joined {profileData.joinDate}
                        </span>
                      </div>

                      <div className="phc-actions">
                        <button className="phc-btn-edit" onClick={handleEditProfile}>Edit Profile</button>
                        <button className="phc-btn-share" onClick={handleShareProfile} aria-label="Share Profile">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right stats pane floating inside card */}
                <div className="phc-right-stats">
                  <div className="phc-stat">
                    <span className="phc-stat-num">{stats?.animeWatched ?? 0}</span>
                    <span className="phc-stat-lbl">ANIME WATCHED</span>
                  </div>
                  <div className="phc-stat">
                    <span className="phc-stat-num">{stats?.hoursWatched ?? 0}</span>
                    <span className="phc-stat-lbl">HOURS WATCHED</span>
                  </div>
                  <div className="phc-stat">
                    <span className="phc-stat-num">{stats?.meanScore ?? 0}</span>
                    <span className="phc-stat-lbl">MEAN SCORE</span>
                  </div>
                  <div className="phc-stat">
                    <span className="phc-stat-num">{stats?.totalEpisodes ?? 0}</span>
                    <span className="phc-stat-lbl">EPISODES</span>
                  </div>
                  <div className="phc-stat">
                    <span className="phc-stat-num">{stats?.favorites ?? 0}</span>
                    <span className="phc-stat-lbl">FAVORITES</span>
                  </div>
                  <div className="phc-stat">
                    <span className="phc-stat-num">{stats?.currentlyWatching ?? 0}</span>
                    <span className="phc-stat-lbl">WATCHING</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 2 — ACHIEVEMENTS PROGRESS
        ════════════════════════════════════════════════════════ */}
        <section className="ach-section">
          <div className="ach-inner">
            <div className="section-eyebrow">
              <span className="eyebrow-line" />
              <span className="eyebrow-text">ACHIEVEMENTS</span>
              <span className="eyebrow-line" />
            </div>

            {/* Progress */}
            <div className="ach-progress-block">
              <div className="ach-progress-header">
                <span className="ach-progress-label">Achievements progress</span>
                <span className="ach-progress-count">{earnedBadgeCount} / {totalBadgeDefs}</span>
              </div>
              <div className="ach-progress-bar-track">
                <div className="ach-progress-bar-fill" style={{ width: `${badgePct}%` }} />
              </div>
              <button
                className={`ach-check-btn ${checkingBadges ? 'loading' : ''}`}
                onClick={checkBadgesNow}
                disabled={checkingBadges}
              >
                {checkingBadges ? 'Checking...' : '⚡ Check for New Badges'}
              </button>
            </div>

            {/* Recent Achievements */}
            {recentAchievements.length > 0 && (
              <div className="ach-recent-block">
                <span className="ach-sub-label">Recent Achievements</span>
                <div className="ach-recent-row">
                  {recentAchievements.map((badge) => {
                    const rc = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
                    return (
                      <div
                        key={badge.id}
                        className="ach-recent-pill"
                        style={{ borderColor: rc.border, boxShadow: `0 0 14px ${rc.glow}` }}
                        title={badge.description}
                      >
                        <span className="ach-recent-icon">{badge.icon}</span>
                        <span className="ach-recent-name">{badge.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Achievements Badge Grid — pill toggles */}
            <div className="ach-badges-block">
              <div className="ach-badges-header">
                <span className="ach-sub-label">Achievements</span>
                <div className="ach-badge-controls">
                  <div className="badge-category-tabs">
                    {badgeCategories.map((cat) => (
                      <button
                        key={cat}
                        className={`badge-cat-tab ${badgeFilter === cat ? 'active' : ''}`}
                        onClick={() => setBadgeFilter(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="badge-sort-control">
                    <label>Sort</label>
                    <select value={badgeSort} onChange={(e) => setBadgeSort(e.target.value)}>
                      <option value="rarity-desc">Rarity ↓</option>
                      <option value="rarity-asc">Rarity ↑</option>
                      <option value="date-desc">Newest</option>
                      <option value="date-asc">Oldest</option>
                      <option value="alpha-asc">A–Z</option>
                      <option value="alpha-desc">Z–A</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pill-style badge toggles */}
              <div className="ach-pills-grid">
                {sortedBadges.map((badge) => {
                  const rc = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
                  return (
                    <div
                      key={badge.id}
                      className={`ach-pill-toggle ${badge.earned ? 'earned' : 'locked'}`}
                      style={badge.earned ? { borderColor: rc.border, boxShadow: `0 0 10px ${rc.glow}` } : {}}
                      title={badge.description}
                    >
                      <span className="apt-icon">{badge.earned ? badge.icon : '🔒'}</span>
                      <span className="apt-name">{badge.title}</span>
                      {badge.earned && <span className="apt-rarity" style={{ color: rc.label }}>●</span>}
                    </div>
                  );
                })}
              </div>

              {sortedBadges.length === 0 && (
                <div className="badges-empty">
                  <span>🔍</span>
                  <p>No badges in this category yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 3 — RECENTLY WATCHED
        ════════════════════════════════════════════════════════ */}
        <section className="rw-section">
          <div className="rw-inner">
            <div className="section-eyebrow">
              <span className="eyebrow-line" />
              <span className="eyebrow-text">RECENTLY WATCHED</span>
              <span className="eyebrow-line" />
            </div>

            {recentlyWatched.length > 0 ? (
              <div className="rw-layout">
                {/* Featured — large left */}
                {featuredAnime && (
                  <div className="rw-featured" onClick={() => openAnimeModal(featuredAnime)} role="button" tabIndex={0}>
                    <img src={getImage(featuredAnime)} alt={getTitle(featuredAnime)} className="rw-featured-img" />
                    <div className="rw-featured-overlay">
                      <span className="rw-featured-badge">LATEST</span>
                      <h3 className="rw-featured-title">{getTitle(featuredAnime)}</h3>
                    </div>
                  </div>
                )}

                {/* 2×2 grid — right */}
                <div className="rw-grid">
                  {gridAnime.map((anime, idx) => (
                    <AnimeCardUI
                      key={anime.animeId || anime.id || idx}
                      anime={anime}
                      index={idx + 1}
                      isGrid
                      onClick={openAnimeModal}
                    />
                  ))}
                  {gridAnime.length < 4 && Array.from({ length: 4 - gridAnime.length }).map((_, i) => (
                    <div key={`ph-${i}`} className="rw-grid-card rw-grid-placeholder" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="section-empty">
                <span>👁️</span>
                <p>Nothing here yet. Your watch history will appear as you explore.</p>
              </div>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 4 — FAVOURITES
        ════════════════════════════════════════════════════════ */}
        <section className="fav-section">
          <div className="fav-inner">
            <div className="section-eyebrow">
              <span className="eyebrow-line" />
              <span className="eyebrow-text">FAVOURITES</span>
              <span className="eyebrow-line" />
            </div>

            {favoriteAnime.length > 0 ? (
              <div className="fav-grid">
                {favoriteAnime.slice(0, 10).map((anime, idx) => (
                  <AnimeCardUI
                    key={anime.animeId || anime.id || idx}
                    anime={{ ...toAnimeShape(anime), averageScore: anime.userRating ? anime.userRating * 20 : 0 }}
                    index={idx}
                    isGrid
                    onClick={openAnimeModal}
                  />
                ))}
                {/* Placeholder slots */}
                {favoriteAnime.length < 10 && Array.from({ length: 10 - Math.min(favoriteAnime.length, 10) }).map((_, i) => (
                  <div key={`fph-${i}`} className="fav-card fav-placeholder" />
                ))}
              </div>
            ) : (
              <div className="section-empty">
                <span>⭐</span>
                <p>No favourites yet. Rate some anime to see them here.</p>
              </div>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 5 — GENRE BREAKDOWN (unchanged)
        ════════════════════════════════════════════════════════ */}
        <section className="genre-identity">
          {/* Ambient Glow */}
          <div className="genre-ambient" style={{ backgroundColor: topGenreColor }} />

          <div className="genre-inner">
            {/* Editorial header */}
            <div className="genre-header-block">
              <div className="genre-watermark">{topGenreName || 'ANIME'}</div>
              <span className="genre-eyebrow">YOUR TASTE</span>
              <h2 className="genre-title-large">
                {topGenreName ? topGenreName : 'Start watching to discover your taste'}
              </h2>
            </div>

            {/* Proportional genre pills row */}
            {top5Genres.length > 0 && (
              <div className="genre-pills-row">
                {top5Genres.map((genre, i) => (
                  <div
                    key={i}
                    className="genre-pill"
                    style={{ flexBasis: `${Math.max(genre.value, 6)}%`, backgroundColor: genre.color }}
                  >
                    <span className="genre-pill-name">{genre.name}</span>
                    <span className="genre-pill-pct">{genre.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}

            {/* Chart + legend content block */}
            <div className="genre-content">
              <div className="genre-chart-col">
                {chartData.filter((d) => d.value > 0).length > 0 ? (
                  <div className="pie-chart-wrapper">
                    <ResponsiveContainer width="100%" height={380}>
                      <PieChart>
                        <Pie
                          data={chartData.filter((d) => d.value > 0)}
                          cx="50%" cy="50%"
                          labelLine={false}
                          outerRadius={175} innerRadius={70}
                          dataKey="value" nameKey="name"
                          label={renderCustomizedLabel}
                        >
                          {chartData.filter((d) => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '30px', fontWeight: 'bold', fill: '#fff' }}>{watchedGenres}</text>
                        <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '13px', fill: '#64748b' }}>Genres</text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="genre-empty">
                    <span>📊</span>
                    <p>No genre data yet. Keep watching to see your breakdown.</p>
                  </div>
                )}

                {/* Genre ticker under donut */}
                <div className="genre-ticker">
                  <div className="gt-stat"><span className="gt-number">{totalGenres}</span><span className="gt-label">TOTAL</span></div>
                  <div className="gt-divider" />
                  <div className="gt-stat"><span className="gt-number">{watchedGenres}</span><span className="gt-label">WATCHED</span></div>
                  <div className="gt-divider" />
                  <div className="gt-stat"><span className="gt-number">{topPercentage}%</span><span className="gt-label">TOP GENRE</span></div>
                  <div className="gt-divider" />
                  <div className="gt-stat"><span className="gt-number">{coveragePct}%</span><span className="gt-label">COVERAGE</span></div>
                </div>
              </div>

              {/* Legend column */}
              <div className="genre-legend-col">
                {chartData.filter((g) => g.value > 0).map((genre, i) => (
                  <div key={i} className="genre-legend-item">
                    <span className="gli-name">{genre.name}</span>
                    <div className="gli-bar-wrap">
                      <div className="gli-bar" style={{ width: `${genre.value}%`, backgroundColor: genre.color }} />
                    </div>
                    <span className="gli-meta">{genre.value.toFixed(1)}%{genre.count > 0 ? ` · ${genre.count} anime` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 6 — ACTIVITY HEATMAP
        ════════════════════════════════════════════════════════ */}
        <section className="heatmap-section">
          <div className="heatmap-inner">
            <div className="section-eyebrow">
              <span className="eyebrow-line" />
              <span className="eyebrow-text">ACTIVITY HEATMAP</span>
              <span className="eyebrow-line" />
            </div>

            <div className="heatmap-header">
              <span className="heatmap-subtitle">Watch activity over the last 52 weeks</span>
              <span className="heatmap-total">{totalActivityDays} active days</span>
            </div>

            <div className="heatmap-scroll">
              <div className="heatmap-grid">
                {heatmapData.map((week, wIdx) => (
                  <div key={wIdx} className="heatmap-col">
                    {week.map((day, dIdx) => (
                      <div
                        key={dIdx}
                        className={`heatmap-cell ${day.future ? 'future' : ''}`}
                        style={{ backgroundColor: day.future ? 'transparent' : getHeatmapColor(day.count) }}
                        title={day.count > 0 ? `${day.date}: ${day.count} anime` : day.date}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="heatmap-legend">
              <span className="heatmap-legend-label">Less</span>
              <div className="heatmap-cell" style={{ backgroundColor: getHeatmapColor(0) }} />
              <div className="heatmap-cell" style={{ backgroundColor: getHeatmapColor(1) }} />
              <div className="heatmap-cell" style={{ backgroundColor: getHeatmapColor(2) }} />
              <div className="heatmap-cell" style={{ backgroundColor: getHeatmapColor(3) }} />
              <div className="heatmap-cell" style={{ backgroundColor: getHeatmapColor(4) }} />
              <span className="heatmap-legend-label">More</span>
            </div>
          </div>
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
    </>
  );
};

export default ProfilePage;
