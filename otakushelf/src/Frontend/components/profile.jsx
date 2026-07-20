import React, { useState, useEffect } from "react";
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
    "Action",
    "Adventure",
    "Avant Garde",
    "Award Winning",
    "Boys Love",
    "Comedy",
    "Drama",
    "Fantasy",
    "Girls Love",
    "Gourmet",
    "Horror",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Suspense",
    "Thriller",
  ];

  // Backfill genres function — no longer shown in UI but kept for admin use
  const backfillGenres = async () => {
    try {
      setBackfilling(true);
      const response = await api.post(
        `${API}/api/list/${user._id}/backfill-genres`,
      );
      const data = response.data;
      if (data.success) {
        showToast(`Genres updated for ${data.updated} anime!`);
        await loadProfileData();
      } else {
        showToast(
          "Failed to backfill genres: " + (data.message || "Unknown error"),
          "error",
        );
      }
    } catch (error) {
      showToast("Error backfilling genres: " + error.message, "error");
    } finally {
      setBackfilling(false);
    }
  };

  // Load all 100 badge definitions for the locked/earned grid
  const loadAllBadgeDefs = async () => {
    try {
      const res = await api.get(`${API}/api/badges/all`);
      setAllBadgeDefs(res.data?.data?.badges || []);
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
        await loadProfileData(); // refresh badge list
      }
    } catch (e) {
      showToast('Failed to check badges', 'error');
    } finally {
      setCheckingBadges(false);
    }
  };

  // Prepare chart data - show ALL genres including 0%
  const prepareChartData = (userGenres) => {
    if (!userGenres) userGenres = [];

    // Create a map for fast lookup of user data
    const userGenreMap = {};
    userGenres.forEach((genre) => {
      if (genre && genre.name) {
        userGenreMap[genre.name.toLowerCase()] = {
          percentage: genre.percentage || 0,
          count: genre.count || 0,
        };
      }
    });

    // Color palette
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#FFD166",
      "#06D6A0",
      "#118AB2",
      "#EF476F",
      "#073B4C",
      "#7209B7",
      "#3A86FF",
      "#FB5607",
      "#8338EC",
      "#FF006E",
      "#FFBE0B",
      "#3A86FF",
      "#FB5607",
      "#FF595E",
      "#8AC926",
      "#1982C4",
      "#6A4C93",
    ];

    // Create array with ALL genres
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

    // Sort by percentage (highest first), but keep 0% at the end
    return allGenresData.sort((a, b) => {
      if (a.value === 0 && b.value === 0) return a.name.localeCompare(b.name);
      if (a.value === 0) return 1;
      if (b.value === 0) return -1;
      return b.value - a.value;
    });
  };

  // Add chart data state
  const [chartData, setChartData] = useState([]);

  // Update chart data when genres change
  useEffect(() => {
    setChartData(prepareChartData(genres));
  }, [genres]);

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

      // Fetch profile data
      const response = await api.get(`${API}/api/profile/${user._id}`);
      const data = response.data.data;

      if (data) {
        // Helper function to fix image URLs
        const fixImageUrl = (url) => {
          if (!url) return null;
          if (url.startsWith("http") || url.startsWith("data:")) {
            return url;
          }
          if (url.startsWith("/uploads/")) {
            const backendBaseUrl = API.replace("/api", "");
            return `${backendBaseUrl}${url}`;
          }
          return url;
        };

        setProfileData({
          name: data.name || "Anime Lover",
          username:
            data.profile?.username || `@user_${user._id.toString().slice(-6)}`,
          bio:
            data.profile?.bio ||
            "Anime enthusiast exploring new worlds through animation",
          joinDate: new Date(
            data.profile?.joinDate || data.createdAt,
          ).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          avatar: fixImageUrl(data.photo),
          coverImage: fixImageUrl(data.profile?.coverImage),
          email: data.email,
        });

        setStats(
          data.profile?.stats || {
            animeWatched: 0,
            hoursWatched: 0,
            currentlyWatching: 0,
            favorites: 0,
            animePlanned: 0,
            animeDropped: 0,
            totalEpisodes: 0,
            meanScore: 0,
          },
        );

        setRecentlyWatched(data.recentlyWatched || []);
        setFavoriteAnime(data.favoriteAnime || []);
        setBadges(data.profile?.badges || []);
        setGenres(data.profile?.favoriteGenres || []);

        // Initialize edit form
        setEditForm({
          name: data.name || "",
          bio: data.profile?.bio || "",
          username:
            data.profile?.username || `@user_${user._id.toString().slice(-6)}`,
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfileData({
        name: "Anime Lover",
        username: `@user_${user?._id.toString().slice(-6) || "000000"}`,
        bio: "Anime enthusiast exploring new worlds through animation",
        joinDate: new Date().toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        avatar: null,
        coverImage: null,
        email: "",
      });
      setStats({
        animeWatched: 0,
        hoursWatched: 0,
        currentlyWatching: 0,
        favorites: 0,
        animePlanned: 0,
        animeDropped: 0,
        totalEpisodes: 0,
        meanScore: 0,
      });
      setRecentlyWatched([]);
      setFavoriteAnime([]);
      setBadges([]);
      setGenres([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?._id) return;

    try {
      if (!file.type.startsWith("image/")) {
        showToast(
          "Invalid image type. Please select a JPEG, PNG, or WebP file.",
          "error",
        );
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast("Image too large. Maximum size is 5MB.", "error");
        return;
      }

      const formData = new FormData();
      formData.append("cover", file);

      const response = await api.post(
        `${API}/api/profile/${user._id}/upload-cover`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const data = response.data.data;

      if (data.coverImage) {
        let coverUrl = data.coverImage;
        if (coverUrl && coverUrl.startsWith("/uploads/")) {
          const backendBaseUrl = API.replace("/api", "");
          coverUrl = `${backendBaseUrl}${coverUrl}`;
        }
        setProfileData((prev) => ({ ...prev, coverImage: coverUrl }));
        showToast("Cover image updated successfully!");
      }
    } catch (error) {
      console.error("Cover upload error:", error);
      showToast("Failed to upload cover image.", "error");
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      const updateData = {
        name: editForm.name,
        profile: {
          bio: editForm.bio,
          username: editForm.username,
        },
      };

      await api.put(`${API}/api/profile/${user._id}`, updateData);

      if (updateProfile) {
        await updateProfile(updateData);
      }

      setProfileData((prev) => ({
        ...prev,
        name: editForm.name,
        bio: editForm.bio,
        username: editForm.username,
      }));

      setIsEditing(false);
      showToast("Profile updated successfully!");
      await loadProfileData();
    } catch (error) {
      console.error("Profile update error:", error);
      showToast("Failed to update profile.", "error");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: profileData?.name || "",
      bio: profileData?.bio || "",
      username: profileData?.username || "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    const userId =
      user?._id ||
      localStorage.getItem("user_id") ||
      JSON.parse(localStorage.getItem("user"))?.id;

    if (!userId) {
      showToast("Please log in to upload images", "error");
      return;
    }
    if (!file) {
      showToast("Please select an image file", "error");
      return;
    }

    try {
      if (!file.type.startsWith("image/")) {
        showToast("Please select a JPEG, PNG, WebP, or GIF file.", "error");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast("Image size must be less than 2MB.", "error");
        return;
      }

      const formData = new FormData();
      formData.append("photo", file);
      setLoading(true);

      const response = await api.post(
        `${API}/api/profile/${userId}/upload-photo`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const result = response.data.data;
      let photoUrl = result.photo;
      if (photoUrl && photoUrl.startsWith("/uploads/")) {
        const backendBaseUrl = API.replace("/api", "");
        photoUrl = `${backendBaseUrl}${photoUrl}`;
      }

      setProfileData((prev) => ({ ...prev, avatar: photoUrl }));
      if (updateUserState) updateUserState({ photo: photoUrl });
      showToast("Profile picture updated!");
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Failed to upload image.", "error");
      await loadProfileData();
    } finally {
      setLoading(false);
    }
  };

  const handleShareProfile = () => {
    const profileUrl = `${window.location.origin}/profile/${user?._id}`;

    if (navigator.share) {
      navigator.share({
        title: `${profileData?.name}'s Anime Profile`,
        text: `Check out ${profileData?.name}'s anime profile on OtakuShelf!`,
        url: profileUrl,
      });
    } else {
      navigator.clipboard.writeText(profileUrl);
      alert("Profile link copied to clipboard!");
    }
  };

  // Custom label renderer for pie chart
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    payload,
  }) => {
    const actualValue = payload.value;

    // Only show label if value > 3% (to avoid cluttering)
    if (actualValue > 3) {
      const RADIAN = Math.PI / 180;
      const middleRadius = (innerRadius + outerRadius) / 2;
      const x = cx + middleRadius * Math.cos(-midAngle * RADIAN);
      const y = cy + middleRadius * Math.sin(-midAngle * RADIAN);

      return (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fontWeight="bold"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
        >
          {`${actualValue.toFixed(1)}%`}
        </text>
      );
    }
    return null;
  };

  if (!profileData) {
    return (
      <>
        {showLoader && <PageLoader onFinish={() => setShowLoader(false)} />}
        <BottomNavBar />
        <div className="profile-page" style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0f1e 0%, #161b2e 100%)" }}>
          <Header showSearch={false} />
          {!showLoader && (
            <div
              className="profile-loading"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "linear-gradient(180deg, #0a0f1e 0%, #161b2e 100%)",
              }}
            >
              <div className="loading-content">
                <div className="loading-spinner"></div>
                <h2 className="loading-text">Loading Your Anime Journey</h2>
                <p className="loading-subtext">
                  Preparing your stats, favorites, and anime collection...
                </p>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // Calculate stats for display
  const genresWithData = chartData.filter((g) => g.value > 0);
  const totalGenres = ALL_ANIME_GENRES.length;
  const watchedGenres = genresWithData.length;
  const topPercentage =
    genresWithData.length > 0
      ? Math.max(...genresWithData.map((g) => g.value)).toFixed(1)
      : "0";

  // --- Badge calculations ---
  const earnedIds = new Set(badges.map(b => b.id).filter(Boolean));
  const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const RARITY_COLORS = {
    common: { border: 'rgba(148,163,184,0.35)', glow: 'rgba(148,163,184,0.15)', label: '#94a3b8' },
    uncommon: { border: 'rgba(74,222,128,0.45)', glow: 'rgba(74,222,128,0.15)', label: '#4ade80' },
    rare: { border: 'rgba(96,165,250,0.5)', glow: 'rgba(96,165,250,0.18)', label: '#60a5fa' },
    epic: { border: 'rgba(192,132,252,0.55)', glow: 'rgba(192,132,252,0.2)', label: '#c084fc' },
    legendary: { border: 'rgba(251,191,36,0.65)', glow: 'rgba(251,191,36,0.25)', label: '#fbbf24' },
  };

  const enrichedBadges = allBadgeDefs.map(def => ({
    ...def,
    earned: earnedIds.has(def.id),
    earnedDate: badges.find(b => b.id === def.id)?.earnedDate || null,
  }));

  const badgeCategories = ['All', ...new Set(enrichedBadges.map(b => b.category))];
  const filteredBadges = badgeFilter === 'All'
    ? enrichedBadges
    : enrichedBadges.filter(b => b.category === badgeFilter);

  const sortedBadges = [...filteredBadges].sort((a, b) => {
    if (badgeSort !== 'alpha-asc' && badgeSort !== 'alpha-desc') {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
    }
    switch (badgeSort) {
      case 'date-desc':
        if (!a.earnedDate) return 1;
        if (!b.earnedDate) return -1;
        return new Date(b.earnedDate) - new Date(a.earnedDate);
      case 'date-asc':
        if (!a.earnedDate) return 1;
        if (!b.earnedDate) return -1;
        return new Date(a.earnedDate) - new Date(b.earnedDate);
      case 'rarity-asc':
        return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      case 'alpha-asc':
        return a.title.localeCompare(b.title);
      case 'alpha-desc':
        return b.title.localeCompare(a.title);
      case 'rarity-desc':
      default:
        return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    }
  });

  const totalBadgeDefs = enrichedBadges.length;
  const earnedBadgeCount = enrichedBadges.filter(b => b.earned).length;
  const badgePct = totalBadgeDefs > 0 ? Math.round((earnedBadgeCount / totalBadgeDefs) * 100) : 0;

  // Spotlight Epic/Legendary badges
  const spotlightBadges = enrichedBadges.filter(b => b.earned && (b.rarity === 'epic' || b.rarity === 'legendary'));

  // Separate earned vs locked for standard grid
  const earnedBadgesGrid = sortedBadges.filter(b => b.earned);
  const lockedBadgesGrid = sortedBadges.filter(b => !b.earned);

  // --- Genre breakdown calculations ---
  const topGenre = genresWithData.length > 0 ? genresWithData[0] : null;
  const topGenreName = topGenre ? topGenre.name : '';
  const topGenreColor = topGenre ? topGenre.color : 'rgba(255,255,255,0.02)';
  const top5Genres = genresWithData.slice(0, 5);
  const coveragePct = totalGenres > 0 ? ((watchedGenres / totalGenres) * 100).toFixed(1) : "0";

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

      <div className="profile-page">
        <Header showSearch={false} />

        {/* ════════════════════════════════════════════════════════
            SECTION 1 — CINEMATIC ENTRANCE
        ════════════════════════════════════════════════════════ */}
        <section className="profile-entrance">
          {/* Hidden file inputs */}
          <input type="file" accept="image/*" id="cover-upload" style={{ display: 'none' }} onChange={handleCoverUpload} />
          <input type="file" accept="image/*" id="avatar-upload" style={{ display: 'none' }} onChange={handleImageUpload} />

          {/* Cover image */}
          <img
            src={profileData.coverImage || 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1600&q=80'}
            alt="Cover"
            className="entrance-cover-img"
          />

          {/* Gradient overlays */}
          <div className="entrance-gradient-lr" />
          <div className="entrance-gradient-bottom" />

          {/* Change cover label */}
          <label htmlFor="cover-upload" className="cover-change-btn">Change Cover</label>

          {/* Content block: avatar + identity */}
          <div className="entrance-content">
            {/* Avatar */}
            <div className="entrance-avatar-zone">
              <div className="entrance-avatar">
                {profileData.avatar
                  ? <img src={profileData.avatar} alt="Avatar" />
                  : <div className="entrance-avatar-placeholder">{profileData.name.charAt(0)}</div>
                }
              </div>
              <label htmlFor="avatar-upload" className="avatar-change-label">CHANGE PHOTO</label>
            </div>

            {/* Identity or edit form */}
            {isEditing ? (
              <div className="entrance-edit-form">
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
              <div className="entrance-identity">
                <h1 className="entrance-name">{profileData.name}</h1>
                <div className="entrance-meta">
                  <span className="entrance-username">{profileData.username}</span>
                  <span className="entrance-meta-dot">·</span>
                  <span className="entrance-joindate">Joined {profileData.joinDate}</span>
                </div>
                <p className="entrance-bio">{profileData.bio}</p>
                {profileData.email && <span className="entrance-email">{profileData.email}</span>}
                <div className="entrance-actions">
                  <button className="btn-edit-new" onClick={handleEditProfile}>Edit Profile</button>
                  <button className="btn-share-new" onClick={handleShareProfile} aria-label="Share Profile">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {/* HUD Ticker (placed to the right of identity details) */}
            <div className="hud-ticker">
              {/* Row 1: Primary Stats */}
              <div className="hud-primary-row">
                <div className="hud-stat">
                  <span className="hud-number">{stats?.animeWatched ?? 0}</span>
                  <span className="hud-label">ANIME WATCHED</span>
                </div>
                <div className="hud-divider" />
                <div className="hud-stat">
                  <span className="hud-number">{stats?.hoursWatched ?? 0}</span>
                  <span className="hud-label">HOURS WATCHED</span>
                </div>
                <div className="hud-divider" />
                <div className="hud-stat">
                  <span className="hud-number">{stats?.meanScore ?? 0}</span>
                  <span className="hud-label">MEAN SCORE</span>
                </div>
              </div>

              {/* Row Divider */}
              <div className="hud-row-divider" />

              {/* Row 2: Secondary Stats */}
              <div className="hud-secondary-row">
                <div className="ss-stat">
                  <span className="ss-number">{stats?.currentlyWatching ?? 0}</span>
                  <span className="ss-label">WATCHING</span>
                </div>
                <div className="ss-divider" />
                <div className="ss-stat">
                  <span className="ss-number">{stats?.animePlanned ?? 0}</span>
                  <span className="ss-label">PLANNED</span>
                </div>
                <div className="ss-divider" />
                <div className="ss-stat">
                  <span className="ss-number">{stats?.animeDropped ?? 0}</span>
                  <span className="ss-label">DROPPED</span>
                </div>
                <div className="ss-divider" />
                <div className="ss-stat">
                  <span className="ss-number">{stats?.totalEpisodes ?? 0}</span>
                  <span className="ss-label">EPISODES</span>
                </div>
                <div className="ss-divider" />
                <div className="ss-stat">
                  <span className="ss-number">{stats?.favorites ?? 0}</span>
                  <span className="ss-label">FAVORITES</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="scroll-indicator">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 2 — THE WALL (BADGES)
        ════════════════════════════════════════════════════════ */}
        <section className="the-wall">
          <div className="wall-inner">
            {/* Section Eyebrow */}
            <div className="wall-eyebrow">
              <span className="wall-eyebrow-line" />
              <span className="wall-eyebrow-text">ACHIEVEMENTS</span>
              <span className="wall-eyebrow-line" />
            </div>

            {/* XP progress bar */}
            <div className="xp-wrap">
              <div className="xp-bar-full">
                <div className="xp-fill" style={{ width: `${badgePct}%` }} />
              </div>
              <span className="xp-label">
                {earnedBadgeCount} / {totalBadgeDefs} Badges · {badgePct}% Complete
              </span>
            </div>

            {/* Check Badges CTA */}
            <button
              className={`check-badges-cta ${checkingBadges ? 'loading' : ''}`}
              onClick={checkBadgesNow}
              disabled={checkingBadges}
            >
              {checkingBadges ? 'Checking...' : '⚡ Check for New Badges'}
            </button>

            {/* Rarity Legend */}
            <div className="rarity-legend">
              {Object.entries(RARITY_COLORS).map(([r, c]) => (
                <span key={r} className="rarity-pip" style={{ color: c.label }}>
                  <span className="rarity-dot" style={{ background: c.label }} />
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </span>
              ))}
            </div>

            {/* Spotlight Row */}
            {spotlightBadges.length > 0 && (
              <>
                <div className="spotlight-header">✦ FEATURED</div>
                <div className="spotlight-row">
                  {spotlightBadges.map((badge) => {
                    const rc = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
                    return (
                      <div
                        key={badge.id}
                        className="spotlight-card"
                        style={{
                          border: `1px solid ${rc.border}`,
                          boxShadow: `0 0 40px ${rc.glow}, inset 0 0 20px ${rc.glow}`,
                        }}
                      >
                        <div className="spotlight-emoji">{badge.icon}</div>
                        <div className="spotlight-info">
                          <div className="spotlight-title">{badge.title}</div>
                          <div className="spotlight-desc">{badge.description}</div>
                          <div className="spotlight-rarity" style={{ color: rc.label }}>
                            {(badge.rarity || '').toUpperCase()}
                          </div>
                          {badge.earnedDate && (
                            <div className="spotlight-date">
                              ✅ {new Date(badge.earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Filter and Sort controls */}
            <div className="badge-controls-row">
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
                <label>Sort by</label>
                <select value={badgeSort} onChange={(e) => setBadgeSort(e.target.value)}>
                  <option value="rarity-desc">Rarity (Highest)</option>
                  <option value="rarity-asc">Rarity (Lowest)</option>
                  <option value="date-desc">Date (Newest)</option>
                  <option value="date-asc">Date (Oldest)</option>
                  <option value="alpha-asc">Name (A-Z)</option>
                  <option value="alpha-desc">Name (Z-A)</option>
                </select>
              </div>
            </div>

            {/* Badges Grid - Earned */}
            {earnedBadgesGrid.length > 0 && (
              <div className="badges-grid-new">
                {earnedBadgesGrid.map((badge) => {
                  const rc = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
                  return (
                    <div
                      key={badge.id}
                      className="badge-card-new earned"
                      title={badge.earnedDate ? `Earned: ${new Date(badge.earnedDate).toLocaleDateString()}` : 'Earned'}
                      style={{
                        border: `1px solid ${rc.border}`,
                        boxShadow: `0 0 18px ${rc.glow}, inset 0 0 12px ${rc.glow}`,
                      }}
                    >
                      <div className="badge-icon-wrap">
                        <span className="badge-emoji">{badge.icon}</span>
                      </div>
                      <div className="badge-info">
                        <div className="badge-card-title">{badge.title}</div>
                        <div className="badge-card-desc">{badge.description}</div>
                        <div className="badge-rarity-label" style={{ color: rc.label }}>
                          {(badge.rarity || '').toUpperCase()}
                        </div>
                        {badge.earnedDate && (
                          <div className="badge-earned-date">
                            ✅ {new Date(badge.earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty filter message */}
            {earnedBadgesGrid.length === 0 && lockedBadgesGrid.length === 0 && (
              <div className="badges-empty">
                <span>🔍</span>
                <p>No badges in this category yet.</p>
              </div>
            )}

            {/* Locked badges list */}
            {lockedBadgesGrid.length > 0 && (
              <>
                <div className="locked-separator">
                  <span className="locked-sep-line" />
                  <span className="locked-sep-text">LOCKED — {lockedBadgesGrid.length} REMAINING</span>
                  <span className="locked-sep-line" />
                </div>
                <div className="badges-grid-new">
                  {lockedBadgesGrid.map((badge) => {
                    const rc = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
                    return (
                      <div key={badge.id} className="badge-card-new locked" title="Locked">
                        <div className="badge-icon-wrap">
                          <span className="badge-emoji">{badge.icon}</span>
                          <div className="badge-lock-overlay">🔒</div>
                        </div>
                        <div className="badge-info">
                          <div className="badge-card-title">{badge.title}</div>
                          <div className="badge-card-desc">{badge.description}</div>
                          <div className="badge-rarity-label" style={{ color: rc.label }}>
                            {(badge.rarity || '').toUpperCase()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 3 — THE STORY ZONE
        ════════════════════════════════════════════════════════ */}
        <section className="story-zone">
          {/* Left Column: Recently Watched */}
          <div className="story-left">
            <span className="story-label">RECENTLY WATCHED</span>

            {recentlyWatched.length > 0 ? (
              <div className="recently-watched-grid masonry-grid">
                {recentlyWatched.slice(0, 8).map((anime, idx) => {
                  const displayTitle = typeof anime?.title === 'object'
                    ? (anime.title.english || anime.title.romaji || anime.title.native || String(anime.title))
                    : (anime?.title || "Unknown Title");
                  const imageSrc = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.image || '/placeholder-anime.jpg';
                  return (
                    <div key={anime.id || anime.title || idx} className="masonry-card">
                      <img src={imageSrc} alt={displayTitle} />
                      <div className="masonry-overlay">
                        <span className="masonry-title">{displayTitle}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="story-empty">
                Nothing here yet. Your watch history will appear as you explore.
              </div>
            )}
          </div>

          {/* Section Divider */}
          <div className="story-divider" />

          {/* Right Column: Favorites */}
          <div className="story-right">
            <span className="story-label">FAVORITES</span>

            {favoriteAnime.length > 0 ? (
              <div className="masonry-grid">
                {favoriteAnime.slice(0, 8).map((anime) => (
                  <div key={anime.id || anime.title} className="masonry-card">
                    <img src={anime.image} alt={anime.title} />
                    <div className="masonry-overlay">
                      <span className="masonry-title">{anime.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="story-empty">
                No favorites yet. Rate some anime to see them here.
              </div>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            SECTION 4 — GENRE IDENTITY
        ════════════════════════════════════════════════════════ */}
        <section className="genre-identity">
          {/* Ambient Glow */}
          <div className="genre-ambient" style={{ backgroundColor: topGenreColor }} />

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
                  style={{
                    flexBasis: `${Math.max(genre.value, 6)}%`,
                    backgroundColor: genre.color,
                  }}
                >
                  <span className="genre-pill-name">{genre.name}</span>
                  <span className="genre-pill-pct">{genre.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Chart + legend content block */}
          <div className="genre-content">
            {/* Chart column */}
            <div className="genre-chart-col">
              {chartData.filter((d) => d.value > 0).length > 0 ? (
                <div className="pie-chart-wrapper">
                  <ResponsiveContainer width="100%" height={380}>
                    <PieChart>
                      <Pie
                        data={chartData.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={175}
                        innerRadius={70}
                        dataKey="value"
                        nameKey="name"
                        label={renderCustomizedLabel}
                      >
                        {chartData
                          .filter((d) => d.value > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
                          ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <text
                        x="50%"
                        y="47%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '30px', fontWeight: 'bold', fill: '#fff' }}
                      >
                        {watchedGenres}
                      </text>
                      <text
                        x="50%"
                        y="55%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '13px', fill: '#64748b' }}
                      >
                        Genres
                      </text>
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
                <div className="gt-stat">
                  <span className="gt-number">{totalGenres}</span>
                  <span className="gt-label">TOTAL</span>
                </div>
                <div className="gt-divider" />
                <div className="gt-stat">
                  <span className="gt-number">{watchedGenres}</span>
                  <span className="gt-label">WATCHED</span>
                </div>
                <div className="gt-divider" />
                <div className="gt-stat">
                  <span className="gt-number">{topPercentage}%</span>
                  <span className="gt-label">TOP GENRE</span>
                </div>
                <div className="gt-divider" />
                <div className="gt-stat">
                  <span className="gt-number">{coveragePct}%</span>
                  <span className="gt-label">COVERAGE</span>
                </div>
              </div>
            </div>

            {/* Legend column */}
            <div className="genre-legend-col">
              {chartData
                .filter((g) => g.value > 0)
                .map((genre, i) => (
                  <div key={i} className="genre-legend-item">
                    <span className="gli-name">{genre.name}</span>
                    <div className="gli-bar-wrap">
                      <div
                        className="gli-bar"
                        style={{ width: `${genre.value}%`, backgroundColor: genre.color }}
                      />
                    </div>
                    <span className="gli-meta">
                      {genre.value.toFixed(1)}%{genre.count > 0 ? ` · ${genre.count} anime` : ''}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ProfilePage;
