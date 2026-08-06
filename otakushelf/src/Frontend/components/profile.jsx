import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "../Stylesheets/profile.css";
import "../Stylesheets/settings.css";
import "../Stylesheets/home.css";
import api from "../api.js";
import { Header } from "../components/header";
import BottomNavBar from "../components/bottom.jsx";
import { useAuth } from "../components/AuthContext";
import { Link } from "react-router-dom";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import AnimeCardUI from "./AnimeCardUI.jsx";
import Modal from "./modal.jsx";
import { getBadgeImage } from "../badgeImages.js";
import lockedBadgeImg from "../images/lockedbadge_result.webp";
import { usePageLoader } from "./PageLoaderContext.jsx";

const ProfilePage = () => {
  const { user, loading: authLoading, updateProfile, checkAuthStatus, updateUserState } = useAuth();

  // Profile data
  const [profileData, setProfileData] = useState({
    name: "Anime Lover",
    username: "",
    bio: "Anime enthusiast exploring new worlds through animation",
    joinDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    avatar: null,
    coverImage: null,
    email: "",
    lastOnline: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  });
  const [loading, setLoading] = useState(true);
  const { finishLoading } = usePageLoader();
  useEffect(() => {
    if (!mountedRef.current) return;
    if (!loading) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (mountedRef.current) finishLoading();
        });
      });
    }
  }, [loading, finishLoading]);
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
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, state: "idle", message: "" });
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allBadgeDefs, setAllBadgeDefs]   = useState([]);
  const [badgeFilter, setBadgeFilter]     = useState('All');
  const [badgeSort, setBadgeSort]         = useState('rarity-desc');
  const [badgeView, setBadgeView]         = useState('labels');
  const [checkingBadges, setCheckingBadges] = useState(false);
  const loadProfileDataRef = useRef(false);
  const loadProfileDataUserIdRef = useRef(null);
  const hasLoadedProfileRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Anime detail modal state
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

  // Toast helper
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3500,
    );
  };

  const API = import.meta.env.VITE_API_BASE_URL;

  const PROFILE_CACHE_KEY = 'profileData_cache';
  const PROFILE_CACHE_TIME_KEY = `${PROFILE_CACHE_KEY}_time`;
  const PROFILE_CACHE_STALE_TIME = 1000 * 60 * 60;

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

  const userId = user?._id || user?.id;
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      finishLoading();
      return;
    }

    let initializedFromCache = false;
    try {
      const cachedRaw = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        const cacheAge = Date.now() - (parseInt(localStorage.getItem(PROFILE_CACHE_TIME_KEY)) || 0);
        if (cacheAge < PROFILE_CACHE_STALE_TIME && cached.profileData) {
          setProfileData(cached.profileData);
          setStats(cached.stats || {});
          setRecentlyWatched(cached.recentlyWatched || []);
          setFavoriteAnime(cached.favoriteAnime || []);
          setBadges(cached.badges || []);
          setGenres(cached.genres || []);
          setEditForm({
            name: cached.profileData.name || "",
            bio: cached.profileData.bio || "",
            username: cached.profileData.username || "",
          });
          hasLoadedProfileRef.current = true;
          initializedFromCache = true;
        }
      }
    } catch (e) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      localStorage.removeItem(PROFILE_CACHE_TIME_KEY);
    }

    loadProfileData();
    loadAllBadgeDefs();
  }, [userId, finishLoading]);

  const loadProfileData = async () => {
    const currentUserId = userId;
    if (loadProfileDataRef.current && loadProfileDataUserIdRef.current === currentUserId) return;
    loadProfileDataRef.current = true;
    loadProfileDataUserIdRef.current = currentUserId;
    try {
      setLoading(true);
      let response;
      try {
        response = await api.get(`${API}/api/profile/${currentUserId}`);
      } catch (err) {
        if (!mountedRef.current) return;
        if (err.response) throw err;
        await new Promise(r => setTimeout(r, 1500));
        response = await api.get(`${API}/api/profile/${currentUserId}`);
      }
      if (!mountedRef.current) return;
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

        const userData    = data.user    || data;
        const profileData = data.profile || {};
        const statsData   = data.stats   || {};

        const nextProfileData = {
          name: userData.name || "Anime Lover",
          username: profileData.username || `@user_${currentUserId.toString().slice(-6)}`,
          bio: profileData.bio || "Anime enthusiast exploring new worlds through animation",
          joinDate: new Date(profileData.joinDate || userData.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          avatar: fixImageUrl(userData.photo),
          coverImage: fixImageUrl(profileData.coverImage),
          email: userData.email,
          lastOnline: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        };

        const nextStats = {
          animeWatched:      statsData.animeWatched      ?? 0,
          hoursWatched:      statsData.hoursWatched      ?? 0,
          currentlyWatching: statsData.currentlyWatching ?? 0,
          favorites:         statsData.favorites         ?? 0,
          animePlanned:      statsData.animePlanned       ?? 0,
          animeDropped:      statsData.animeDropped       ?? 0,
          totalEpisodes:     statsData.totalEpisodes      ?? 0,
          meanScore:         statsData.meanScore          ?? 0,
        };

        setProfileData(nextProfileData);
        setStats(nextStats);
        setRecentlyWatched(data.recentlyWatched || []);
        setFavoriteAnime(data.favorites || []);
        setBadges(profileData.badges || []);
        setGenres(profileData.favoriteGenres || []);

        enrichWithScores(data.recentlyWatched || [], setRecentlyWatched);
        enrichWithScores((data.favorites || []).slice(0, 10), setFavoriteAnime);

        setEditForm({
          name: userData.name || "",
          bio: profileData.bio || "",
          username: profileData.username || `@user_${currentUserId.toString().slice(-6)}`,
        });

        try {
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
            profileData: nextProfileData,
            stats: nextStats,
            recentlyWatched: data.recentlyWatched || [],
            favoriteAnime: data.favorites || [],
            badges: profileData.badges || [],
            genres: profileData.favoriteGenres || [],
          }));
          localStorage.setItem(PROFILE_CACHE_TIME_KEY, Date.now().toString());
        } catch (e) { /* ignore cache errors */ }
        hasLoadedProfileRef.current = true;
      }
    } catch (error) {
      if (!mountedRef.current) return;
      console.error("Error loading profile:", error);
      if (hasLoadedProfileRef.current) {
        showToast("Could not refresh your profile. Showing saved data.", "error");
        return;
      }
      setProfileData({
        name: "Anime Lover",
        username: `@user_${currentUserId?.toString().slice(-6) || "000000"}`,
        bio: "Anime enthusiast exploring new worlds through animation",
        joinDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        avatar: null, coverImage: null, email: "",
        lastOnline: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      });
      setStats({ animeWatched: 0, hoursWatched: 0, currentlyWatching: 0, favorites: 0, animePlanned: 0, animeDropped: 0, totalEpisodes: 0, meanScore: 0 });
      setRecentlyWatched([]); setFavoriteAnime([]); setBadges([]); setGenres([]);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadProfileDataRef.current = false;
    }
  };

  const isVideoUrl = (url) => !!(url && typeof url === 'string' && url.startsWith('data:video'));

  const validateMediaFile = async (file) => {
    if (!file) return { ok: false, msg: "No file selected" };
    if (file.size > 15 * 1024 * 1024) return { ok: false, msg: "File too large. Max 15MB." };
    if (file.type.startsWith("image/")) return { ok: true };
    if (file.type.startsWith("video/")) {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const vid = document.createElement("video");
        vid.preload = "metadata";
        vid.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          if (vid.duration > 5) resolve({ ok: false, msg: "Video must be 5 seconds or shorter." });
          else resolve({ ok: true });
        };
        vid.onerror = () => { URL.revokeObjectURL(url); resolve({ ok: false, msg: "Could not read video file." }); };
        vid.src = url;
      });
    }
    return { ok: false, msg: "Please select an image, GIF, or short video." };
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?._id) return;
    try {
      const check = await validateMediaFile(file);
      if (!check.ok) { showToast(check.msg, "error"); e.target.value = ""; return; }
      setUploadingCover(true);
      const formData = new FormData();
      formData.append("cover", file);
      const response = await api.post(`${API}/api/profile/${user._id}/upload-cover`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      const data = response.data.data;
      if (data.coverImage) {
        let coverUrl = data.coverImage;
        if (coverUrl && coverUrl.startsWith("/uploads/")) coverUrl = `${API.replace("/api", "")}${coverUrl}`;
        setProfileData((prev) => ({ ...prev, coverImage: coverUrl }));
        showToast("Cover updated!");
      }
    } catch (error) {
      showToast("Failed to upload cover.", "error");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleEditProfile = () => setIsEditing(true);

  const handleSaveProfile = async () => {
    try {
      const username = (editForm.username || "").trim().replace(/^@/, "");
      if (username && usernameStatus.state === "taken") {
        showToast("Username is already taken.", "error");
        return;
      }
      if (username && usernameStatus.state === "invalid") {
        showToast(usernameStatus.message, "error");
        return;
      }
      setSaving(true);
      const updateData = { name: editForm.name, profile: { bio: editForm.bio, username } };
      await api.put(`${API}/api/profile/${user._id}`, updateData);
      if (updateProfile) await updateProfile(updateData);
      setProfileData((prev) => ({ ...prev, name: editForm.name, bio: editForm.bio, username: username || prev.username }));
      setIsEditing(false);
      showToast("Profile updated successfully!");
      await loadProfileData();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to update profile.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({ name: profileData?.name || "", bio: profileData?.bio || "", username: profileData?.username || "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    if (name === "username") {
      setUsernameSuggestions([]);
      setShowSuggestions(false);
      checkUsernameDebounced(value);
    }
  };

  const checkUsernameDebounced = useMemo(() => {
    let timer;
    return (value) => {
      clearTimeout(timer);
      const username = (value || "").trim();
      if (!username) {
        setUsernameStatus({ checking: false, state: "idle", message: "" });
        return;
      }
      setUsernameStatus((prev) => ({ ...prev, checking: true }));
      timer = setTimeout(async () => {
        try {
          const res = await api.get(`${API}/api/profile/check-username/${encodeURIComponent(username)}`);
          const data = res.data.data || {};
          if (data.valid) {
            setUsernameStatus({
              checking: false,
              state: data.available ? "available" : "taken",
              message: data.available ? "Username is available" : "Username is already taken",
            });
          } else {
            setUsernameStatus({ checking: false, state: "invalid", message: data.reason || "Invalid username" });
          }
        } catch {
          setUsernameStatus({ checking: false, state: "idle", message: "" });
        }
      }, 400);
    };
  }, [API]);

  const handleSuggestUsernames = async () => {
    const base = (editForm.username || "").trim().replace(/^@/, "");
    if (!base) { showToast("Type a base username to get suggestions.", "error"); return; }
    setShowSuggestions(false);
    setUsernameStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await api.get(`${API}/api/profile/suggest-usernames/${encodeURIComponent(base)}`);
      const suggestions = (res.data.data?.suggestions || []).slice(0, 8);
      setUsernameSuggestions(suggestions);
      setShowSuggestions(true);
      if (!suggestions.length) showToast("Could not generate suggestions.", "error");
    } catch {
      showToast("Failed to load suggestions.", "error");
    } finally {
      setUsernameStatus((prev) => ({ ...prev, checking: false }));
    }
  };

  const pickSuggestion = (name) => {
    setEditForm((prev) => ({ ...prev, username: name }));
    setShowSuggestions(false);
    checkUsernameDebounced(name);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    const userId = user?._id || localStorage.getItem("user_id") || JSON.parse(localStorage.getItem("user"))?.id;
    if (!userId) { showToast("Please log in to upload images", "error"); return; }
    if (!file) { showToast("Please select an image or short video", "error"); return; }
    try {
      const check = await validateMediaFile(file);
      if (!check.ok) { showToast(check.msg, "error"); e.target.value = ""; return; }
      const formData = new FormData();
      formData.append("photo", file);
      setUploadingPhoto(true);
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
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleShareProfile = () => {
    const profileUrl = `${window.location.origin}/profile/${user?._id}`;
    if (navigator.share) {
      navigator.share({ title: `${profileData?.name}'s Anime Profile`, text: `Check out ${profileData?.name}'s anime profile on AnimeRegistry!`, url: profileUrl });
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

  if (!profileData) {
    return null;
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
  if (loading && !profileData) {
    return (
      <div className="profile-loading">
        <div className="loading-content">
          <div className="loading-spinner" />
          <p className="loading-text">Loading your shelf...</p>
          <p className="loading-subtext">Fetching your anime profile</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BottomNavBar />

      {/* Toast */}
      {toast.show && (
        <div className={`settings-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.message}
        </div>
      )}

      {/* Hidden file inputs */}
      <input type="file" accept="image/*,video/mp4,video/webm" id="cover-upload"  style={{ display: 'none' }} onChange={handleCoverUpload} />
      <input type="file" accept="image/*,video/mp4,video/webm" id="avatar-upload" style={{ display: 'none' }} onChange={handleImageUpload} />

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
                {profileData.coverImage ? (
                  isVideoUrl(profileData.coverImage) ? (
                    <video
                      src={profileData.coverImage}
                      className="phc-cover-img"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={profileData.coverImage}
                      alt="Cover"
                      className="phc-cover-img"
                      fetchpriority="high"
                      decoding="async"
                    />
                  )
                ) : (
                  <div className="phc-cover-empty">No cover photo yet</div>
                )}
                <div className="phc-cover-gradient" />
                <label htmlFor="cover-upload" className="phc-cover-btn">
                  {uploadingCover ? (<><span className="btn-spinner" />Uploading...</>) : "Change Cover"}
                </label>
              </div>

              {/* Main content layer */}
              <div className="phc-content">
                {/* Left content pane */}
                <div className="phc-left">
                  {/* Avatar */}
                  <div className="phc-avatar-zone">
                    <div className="phc-avatar">
                      {profileData.avatar
                        ? isVideoUrl(profileData.avatar)
                          ? <video src={profileData.avatar} autoPlay muted loop playsInline />
                          : <img src={profileData.avatar} alt="Avatar" />
                        : <div className="phc-avatar-placeholder">{profileData.name.charAt(0)}</div>
                      }
                    </div>
                    <label htmlFor="avatar-upload" className="phc-avatar-change">
                      {uploadingPhoto ? (<><span className="btn-spinner" />Uploading...</>) : "CHANGE PHOTO"}
                    </label>
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
                        <div className="username-input-wrap">
                          <input
                            type="text"
                            name="username"
                            value={editForm.username}
                            onChange={handleInputChange}
                            className="edit-input"
                            placeholder="your_username"
                          />
                          <button type="button" className="btn-suggest" onClick={handleSuggestUsernames} disabled={usernameStatus.checking}>
                            {usernameStatus.checking ? (<><span className="btn-spinner btn-spinner-sm" />Loading...</>) : "Suggest"}
                          </button>
                        </div>
                        {usernameStatus.checking && <p className="username-hint checking">Checking availability…</p>}
                        {!usernameStatus.checking && usernameStatus.state === "available" && (
                          <p className="username-hint available">Username is available</p>
                        )}
                        {!usernameStatus.checking && usernameStatus.state === "taken" && (
                          <p className="username-hint taken">Username is already taken</p>
                        )}
                        {!usernameStatus.checking && usernameStatus.state === "invalid" && (
                          <p className="username-hint taken">{usernameStatus.message}</p>
                        )}
                        {showSuggestions && usernameSuggestions.length > 0 && (
                          <div className="username-suggestions">
                            {usernameSuggestions.map((name) => (
                              <button key={name} type="button" className="username-suggestion-chip" onClick={() => pickSuggestion(name)}>
                                @{name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="edit-form-group">
                        <label>Bio</label>
                        <textarea name="bio" value={editForm.bio} onChange={handleInputChange} className="edit-textarea" rows="3" />
                      </div>
                      <div className="edit-actions">
                        <button className="btn-save" onClick={handleSaveProfile} disabled={saving}>
                          {saving ? (<><span className="btn-spinner" />Saving...</>) : "Save Changes"}
                        </button>
                        <button className="btn-cancel" onClick={handleCancelEdit} disabled={saving}>Cancel</button>
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
                        style={{ borderColor: rc.border }}
                        title={badge.description}
                      >
                        <span className="ach-recent-icon">
                          {getBadgeImage(badge.id) ? (
                            <img src={getBadgeImage(badge.id)} alt={badge.title} className="ach-recent-img" />
                          ) : badge.icon}
                        </span>
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
                  <button
                    className={`badge-view-toggle ${badgeView === 'icons' ? 'active' : ''}`}
                    onClick={() => setBadgeView(badgeView === 'labels' ? 'icons' : 'labels')}
                    title={badgeView === 'labels' ? 'Switch to badges only' : 'Switch to labels'}
                  >
                    {badgeView === 'labels' ? '◈' : '☷'}
                  </button>
                </div>
              </div>

              {badgeView === 'labels' ? (
                <div className="ach-pills-grid">
                  {sortedBadges.map((badge) => {
                    const rc = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
                    return (
                      <div
                        key={badge.id}
                        className={`ach-pill-toggle ${badge.earned ? 'earned' : 'locked'}`}
                        style={badge.earned ? { borderColor: rc.border } : {}}
                        title={badge.description}
                      >
                        <span className="apt-icon">
                          {badge.earned ? (
                            getBadgeImage(badge.id) ? (
                              <img src={getBadgeImage(badge.id)} alt={badge.title} className="apt-img" />
                            ) : badge.icon
                          ) : (
                            <img src={lockedBadgeImg} alt="Locked badge" className="apt-img apt-img-locked" />
                          )}
                        </span>
                        <span className="apt-name">{badge.title}</span>
                        {badge.earned && <span className="apt-rarity" style={{ color: rc.label }}>●</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ach-icons-grid">
                  {sortedBadges.map((badge) => {
                    const rc = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
                    return (
                      <div
                        key={badge.id}
                        className={`ach-icon-cell ${badge.earned ? 'earned' : 'locked'}`}
                        style={badge.earned ? {} : {}}
                        title={`${badge.title} — ${badge.description}`}
                      >
                        {badge.earned ? (
                          getBadgeImage(badge.id) ? (
                            <img src={getBadgeImage(badge.id)} alt={badge.title} className="ach-icon-img" />
                          ) : (
                            <span className="apt-icon">{badge.icon}</span>
                          )
                        ) : (
                          <img src={lockedBadgeImg} alt="Locked badge" className="ach-icon-img ach-icon-locked" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

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
                    anime={toAnimeShape(anime)}
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
                     <ResponsiveContainer width="100%" height={300}>
                       <PieChart>
                         <Pie
                           data={chartData.filter((d) => d.value > 0)}
                           cx="50%" cy="50%"
                           labelLine={false}
                           outerRadius={140} innerRadius={55}
                           dataKey="value" nameKey="name"
                           label={renderCustomizedLabel}
                         >
                           {chartData.filter((d) => d.value > 0).map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
                           ))}
                         </Pie>
                         <Tooltip content={<CustomTooltip />} />
                         <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '24px', fontWeight: 'bold', fill: '#fff' }}>{watchedGenres}</text>
                         <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '11px', fill: '#64748b' }}>Genres</text>
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
