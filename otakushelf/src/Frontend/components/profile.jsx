import React, { useState, useEffect } from 'react';
import '../Stylesheets/profile.css';
import { Header } from '../components/header';
import BottomNavBar from "../components/bottom.jsx";
import { useAuth } from '../components/AuthContext';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';

const ProfilePage = () => {
  const { user, updateProfile, checkAuthStatus } = useAuth();

  // Profile data
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentlyWatched, setRecentlyWatched] = useState([]);
  const [favoriteAnime, setFavoriteAnime] = useState([]);
  const [badges, setBadges] = useState([]);
  const [genres, setGenres] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    username: ''
  });

  const API = import.meta.env.VITE_API_BASE_URL;

  // Anime Genres Array - All 19 genres
  const ANIME_GENRES = [
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

  // Add this function to prepare data for pie chart - FIXED to show all genres
  const prepareChartData = (userGenres) => {
    if (!userGenres) userGenres = [];

    const userGenreMap = {};
    userGenres.forEach(genre => {
      userGenreMap[genre.name] = {
        percentage: genre.percentage || 0,
        count: genre.count || 0
      };
    });

    return ANIME_GENRES.map((genreName, index) => {
      const colors = [
        '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2',
        '#EF476F', '#073B4C', '#7209B7', '#3A86FF', '#FB5607',
        '#8338EC', '#FF006E', '#FFBE0B', '#3A86FF', '#FB5607',
        '#FF595E', '#8AC926', '#1982C4', '#6A4C93'
      ];

      const userGenre = userGenreMap[genreName];
      const actualValue = userGenre ? userGenre.percentage : 0;

      return {
        name: genreName,
        value: actualValue,  // Actual percentage (0 for unwatched)
        displayValue: actualValue > 0 ? actualValue : 0.001, // Tiny value for pie rendering
        count: userGenre ? userGenre.count : 0,
        color: colors[index % colors.length]
      };
    });
  };

  // Add chart data state
  const [chartData, setChartData] = useState([]);

  // Update the useEffect or loadProfileData to set chart data
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
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      // Fetch profile data
      const response = await fetch(`${API}/api/profile/${user._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();

      if (data) {
        // Helper function to fix image URLs
        const fixImageUrl = (url) => {
          if (!url) return null;
          if (url.startsWith('http') || url.startsWith('data:')) {
            return url; // Already absolute
          }
          if (url.startsWith('/uploads/')) {
            const backendBaseUrl = API.replace('/api', '');
            return `${backendBaseUrl}${url}`;
          }
          return url;
        };

        setProfileData({
          name: data.name || 'Anime Lover',
          username: data.profile?.username || `@user_${user._id.toString().slice(-6)}`,
          bio: data.profile?.bio || 'Anime enthusiast exploring new worlds through animation',
          joinDate: new Date(data.profile?.joinDate || data.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          avatar: fixImageUrl(data.photo),
          coverImage: fixImageUrl(data.profile?.coverImage), // ADD THIS LINE
          email: data.email
        });

        setStats(data.profile?.stats || {
          animeWatched: 0,
          hoursWatched: 0,
          currentlyWatching: 0,
          favorites: 0,
          animePlanned: 0,
          animeDropped: 0,
          totalEpisodes: 0,
          meanScore: 0
        });

        setRecentlyWatched(data.recentlyWatched || []);
        setFavoriteAnime(data.favoriteAnime || []);
        setBadges(data.profile?.badges || []);
        setGenres(data.profile?.favoriteGenres || []);

        // Initialize edit form
        setEditForm({
          name: data.name || '',
          bio: data.profile?.bio || '',
          username: data.profile?.username || `@user_${user._id.toString().slice(-6)}`
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfileData({
        name: 'Anime Lover',
        username: `@user_${user?._id.toString().slice(-6) || '000000'}`,
        bio: 'Anime enthusiast exploring new worlds through animation',
        joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        avatar: null,
        coverImage: null, // ADD THIS
        email: ''
      });
      setStats({
        animeWatched: 0,
        hoursWatched: 0,
        currentlyWatching: 0,
        favorites: 0,
        animePlanned: 0,
        animeDropped: 0,
        totalEpisodes: 0,
        meanScore: 0
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
      console.log('DEBUG: handleCoverUpload triggered');
      console.log('User ID:', user._id);
      console.log('API URL:', API);
      console.log('File:', file.name, file.size, 'bytes', file.type);

      if (!file.type.startsWith("image/")) {
        alert("Invalid image type. Please select an image file (JPEG, PNG, WebP)");
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB max
        alert("Image too large. Maximum size is 5MB");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to upload images");
        return;
      }

      const formData = new FormData();
      formData.append("cover", file);

      console.log('Sending request to:', `${API}/api/profile/${user._id}/upload-cover`);

      const response = await fetch(`${API}/api/profile/${user._id}/upload-cover`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      console.log('Response status:', response.status);

      // Check if response is OK
      if (!response.ok) {
        let errorMsg = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
          console.error('Server error response:', errorData);
        } catch (e) {
          errorMsg = `Server error: ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('Cover upload response:', data);

      if (data.coverImage) {
        // Fix the URL like you do for profile photos
        let coverUrl = data.coverImage;

        // If it's a relative path starting with /uploads
        if (coverUrl && coverUrl.startsWith('/uploads/')) {
          const backendBaseUrl = API.replace('/api', '');
          coverUrl = `${backendBaseUrl}${coverUrl}`;
        }

        console.log('Final cover URL:', coverUrl);

        setProfileData(prev => ({
          ...prev,
          coverImage: coverUrl
        }));

        alert('Cover image updated successfully!');
      } else {
        alert('Upload completed but no cover image URL returned');
      }

    } catch (error) {
      console.error('Cover upload error:', error);
      alert('Failed to upload cover: ' + error.message);
    }
  };


  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      const updateData = {
        name: editForm.name,
        profile: {
          bio: editForm.bio,
          username: editForm.username
        }
      };

      const response = await fetch(`${API}/api/profile/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      if (updateProfile) {
        await updateProfile(updateData);
      }

      // Update local state
      setProfileData(prev => ({
        ...prev,
        name: editForm.name,
        bio: editForm.bio,
        username: editForm.username
      }));

      setIsEditing(false);
      alert('Profile updated successfully!');

      // Reload profile data to get fresh data from server
      await loadProfileData();

    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to current profile data
    setEditForm({
      name: profileData?.name || '',
      bio: profileData?.bio || '',
      username: profileData?.username || ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];

    // Get user ID safely from multiple sources
    const userId = user?._id || localStorage.getItem("user_id") || JSON.parse(localStorage.getItem("user"))?.id;

    if (!userId) {
      alert('Please log in to upload images');
      return;
    }

    if (!file) {
      alert('Please select an image file');
      return;
    }

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, WebP, or GIF)');
        return;
      }

      if (file.size > 2 * 1024 * 1024) { // 2MB max
        alert('Image size should be less than 2MB');
        return;
      }

      // Create FormData
      const formData = new FormData();
      formData.append('photo', file);

      // Get token safely
      const token = localStorage.getItem("token") || '';

      // Show loading state
      setLoading(true);

      console.log('Uploading image for user:', userId);

      // Upload to server
      const response = await fetch(`${API}/api/profile/${userId}/upload-photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      if (!response.ok) {
        let errorMsg = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          errorMsg = `Server error: ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log('Upload successful:', result);

      // FIX: Construct the full absolute URL
      let photoUrl = result.photo;

      // If it's a relative path starting with /uploads
      if (photoUrl && photoUrl.startsWith('/uploads/')) {
        // Extract the backend base URL from your API URL
        // If API is "http://localhost:5000/api", we want "http://localhost:5000"
        const backendBaseUrl = API.replace('/api', '');
        photoUrl = `${backendBaseUrl}${photoUrl}`;
      }

      console.log('Final photo URL:', photoUrl);

      // Update UI with the URL from server
      setProfileData(prev => ({
        ...prev,
        avatar: photoUrl
      }));

      // Update auth context
      if (updateProfile) {
        await updateProfile({ photo: photoUrl });
      }

      alert('Profile picture updated successfully!');

    } catch (error) {
      console.error('Upload error details:', error);
      alert('Failed to upload image: ' + error.message);

      // Revert by reloading
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
      alert('Profile link copied to clipboard!');
    }
  };

  // Function to render custom label that shows 0% as empty
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
    name,
    value,
    payload
  }) => {
    // Get the actual value from payload
    const actualValue = payload.value;

    // Only show label if actual value > 0
    if (actualValue > 0) {
      const RADIAN = Math.PI / 180;

      // Calculate position in the MIDDLE of the slice (between inner and outer radius)
      const middleRadius = (innerRadius + outerRadius) / 2;
      const x = cx + middleRadius * Math.cos(-midAngle * RADIAN);
      const y = cy + middleRadius * Math.sin(-midAngle * RADIAN);

      return (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor="middle"  // Always center the text
          dominantBaseline="middle"  // Vertically center
          fontSize={14}
          fontWeight="bold"
          textShadow="0 2px 4px rgba(0,0,0,0.8)"
        >
          {`${actualValue.toFixed(1)}%`}
        </text>
      );
    }
    return null;
  };

if (loading) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'linear-gradient(180deg, #0a0f1e 0%, #161b2e 100%)' }}>
      <Header showSearch={false} />
      <BottomNavBar />
      {/* Simple Loading Preview - Full screen overlay */}
      <div className="profile-loading" style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 9999,
        background: 'linear-gradient(180deg, #0a0f1e 0%, #161b2e 100%)'
      }}>
        <div className="loading-icons">
          <div className="loading-icon">🎬</div>
          <div className="loading-icon">🌟</div>
          <div className="loading-icon">🎨</div>
          <div className="loading-icon">🔥</div>
          <div className="loading-icon">✨</div>
        </div>
        
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h2 className="loading-text">Loading Your Anime Journey</h2>
          <p className="loading-subtext">
            Preparing your stats, favorites, and anime collection...
          </p>
        </div>
      </div>
    </div>
  );
}

  if (!profileData) {
    return (
      <>
        <BottomNavBar />
        <div className="profile-page">
          <Header showSearch={false} />
        </div>
      </>
    );
  }

  return (
    <>
      <BottomNavBar />
      <div className="profile-page">
        <Header showSearch={false} />
        {/* PROFILE COVER */}
        <div className="profile-cover">

          {/* Hidden input */}
          <input
            type="file"
            accept="image/*"
            id="cover-upload"
            style={{ display: "none" }}
            onChange={handleCoverUpload}
          />

          {/* Change cover button */}
          <label htmlFor="cover-upload" className="cover-upload-btn">
            Change Cover
          </label>

          <img
            src={
              profileData?.coverImage ||
              "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1600&q=80"
            }
            alt="Profile Cover"
            className="profile-cover-img"
          />

          <div className="profile-cover-fade"></div>
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar-section">
              <div className="profile-avatar-large">
                {profileData.avatar ? (
                  <img src={profileData.avatar} alt="Profile" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {profileData.name.charAt(0)}
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                id="avatar-upload"
              />
              <label htmlFor="avatar-upload" className="upload-label">
                Change Photo
              </label>
            </div>

            {isEditing ? (
              <div className="profile-edit-section">
                <div className="edit-form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                </div>
                <div className="edit-form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    name="username"
                    value={editForm.username}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                </div>
                <div className="edit-form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={editForm.bio}
                    onChange={handleInputChange}
                    className="edit-textarea"
                    rows="3"
                  />
                </div>
                <div className="edit-actions">
                  <button className="btn-save" onClick={handleSaveProfile}>
                    Save Changes
                  </button>
                  <button className="btn-cancel" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-name-section">
                <h1>{profileData.name}</h1>
                <div className="username-section">
                  <span className="username">{profileData.username}</span>
                  {profileData.email && (
                    <span className="email">({profileData.email})</span>
                  )}
                </div>
                <p className="profile-bio">
                  {profileData.bio}
                </p>
                <div className="join-date">
                  <span>Joined {profileData.joinDate}</span>
                </div>
              </div>
            )}

            <div className="profile-actions">
              {!isEditing && (
                <>
                  <button className="btn-edit" onClick={handleEditProfile}>
                    Edit Profile
                  </button>
                  <button className="btn-share" onClick={handleShareProfile}>
                    Share Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="profile-container2">


          <div className="initial">
            <div className="overview">
              <h2 className="overview-header">Overview</h2>
              {/* Overview Section */}
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-number">{stats?.currentlyWatching || 0}</span>
                  <span className="stat-label">Anime Watching</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stats?.animeWatched || 0}</span>
                  <span className="stat-label">Anime Watched</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stats?.animePlanned || 0}</span>
                  <span className="stat-label">Anime Planned</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stats?.animeDropped || 0}</span>
                  <span className="stat-label">Anime Dropped</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stats?.hoursWatched || 0}</span>
                  <span className="stat-label">Total Hours</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stats?.totalEpisodes || 0}</span>
                  <span className="stat-label">Total Episodes</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stats?.meanScore || 0}</span>
                  <span className="stat-label">Mean Score</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stats?.favorites || 0}</span>
                  <span className="stat-label">Favorites</span>
                </div>
              </div>
            </div>

            <div className="recent-activity-column">
              <h2 className="overview-header">Recent Activity</h2>
              <div className="recentact">
                <div className="activity-placeholder">
                  <div className="activity-icon">📊</div>
                  <p className="activity-message">
                    {recentlyWatched.length > 0
                      ? 'Feature coming soon'
                      : 'Start watching anime to see your activity here!'}
                  </p>
                  {/* <p className="activity-subtext">
                    Track your latest anime additions, episode progress, and ratings here.
                  </p> */}
                </div>
              </div>
            </div>
          </div>

          {/* Recently Watched & Favorite Anime Section */}
          <div className="recently-watched-section">
            <div>
              <h3 className="section-title">Recently Watched</h3>
              <div className="recently-watched-grid">
                {recentlyWatched.length > 0 ? (
                  recentlyWatched.map(anime => (
                    <div key={anime.id} className="watched-item">
                      <img src={anime.image} alt={anime.title} />
                      <div className="watched-info">
                        <h3>{anime.title}</h3>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No recently watched anime yet.</p>
                    <p>Start watching to build your profile!</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="section-title">Favorite Anime</h3>
              <div className="favorite-grid">
                {favoriteAnime.length > 0 ? (
                  favoriteAnime.map(anime => (
                    <div key={anime.id} className="favorite-item">
                      <img src={anime.image} alt={anime.title} />
                      <div className="favorite-info">
                        <h3>{anime.title}</h3>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No favorite anime yet.</p>
                    <p>Rate some anime to see them here!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Badges Section */}
          <div className="badges-section">
            <h3 className="section-title">Badges</h3>
            <div className="badges-grid">
              {badges.length > 0 ? (
                badges.map(badge => (
                  <div key={badge.id} className="badge-card">
                    <div className="badge-icon">{badge.icon}</div>
                    <div className="badge-title">{badge.title}</div>
                    <div className="badge-desc">{badge.description}</div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>No badges earned yet.</p>
                  <p>Complete achievements to earn badges!</p>
                </div>
              )}
            </div>
          </div>

          {/* Genre Breakdown Section - UPDATED WITH PIE CHART AND TOP GENRES */}
          <div className="genre-section">
            <h3 className="section-title">Genre Breakdown</h3>

            <div className="genre-breakdown-container">
              {/* Pie Chart Column with Legend Below */}
              <div className="pie-chart-column">
                {chartData.length > 0 ? (
                  <>
                    <div className="pie-chart-wrapper">
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={180}
                            innerRadius={70}
                            fill="#8884d8"
                            dataKey="displayValue"  // Use displayValue for sizing
                            nameKey="name"
                            label={renderCustomizedLabel}  // This will hide 0% labels
                          >
                            {chartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                opacity={entry.value === 0 ? 0.3 : 1}
                                stroke="rgba(0, 0, 0, 0.3)"
                                strokeWidth={1}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />

                          {/* Donut Center Text */}
                          <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="donut-total"
                          >
                            {ANIME_GENRES.length}
                          </text>
                          <text
                            x="50%"
                            y="57%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="donut-label"
                          >
                            Total Genres
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Chart Stats Summary */}
                    <div className="chart-summary">
                      <div className="summary-item">
                        <span className="summary-label">Total Genres:</span>
                        <span className="summary-value">{ANIME_GENRES.length}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Genres Watched:</span>
                        <span className="summary-value">
                          {chartData.filter(g => g.value > 0).length}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Top Percentage:</span>
                        <span className="summary-value">
                          {chartData.length > 0 ?
                            `${Math.max(...chartData.map(g => g.value)).toFixed(1)}%` :
                            '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-chart">
                    <div className="chart-placeholder">
                      <div className="placeholder-icon">📊</div>
                      <p>No genre data available yet.</p>
                      <p>Complete more anime to see your genre breakdown!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Legend Below Pie Chart */}
              <div className="legend-container">
                <div className="custom-legend">
                  {chartData.map((genre, index) => (
                    <div
                      key={`legend-${index}`}
                      className={`legend-item ${genre.value === 0 ? 'inactive' : ''}`}
                    >
                      <div
                        className="legend-color"
                        style={{
                          backgroundColor: genre.color,
                          opacity: genre.value === 0 ? 0.5 : 1
                        }}
                      />
                      <div className="legend-info">
                        <p className="legend-text">{genre.name}</p>
                        <p className="legend-percentage">
                          {genre.value < 0.01 ? '0%' : `${genre.value.toFixed(1)}%`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;