import React, { useState, useEffect } from 'react';
import '../Stylesheets/profile.css';
import { Header } from '../components/header';
import BottomNavBar from "../components/bottom.jsx";
import { useAuth } from '../components/AuthContext';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  
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

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

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
      const response = await fetch(`${API_BASE}/api/profile/${user._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      
      if (data) {
        setProfileData({
          name: data.name || 'Anime Lover',
          username: data.profile?.username || `@user_${user._id.toString().slice(-6)}`,
          bio: data.profile?.bio || 'Anime enthusiast exploring new worlds through animation',
          joinDate: new Date(data.profile?.joinDate || data.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          avatar: data.photo || null,
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
        
        setRecentlyWatched(data.recentlyWatched || getDefaultRecentlyWatched());
        setFavoriteAnime(data.favoriteAnime || getDefaultFavoriteAnime());
        setBadges(data.profile?.badges || getDefaultBadges());
        setGenres(data.profile?.favoriteGenres || getDefaultGenres());
        
        // Initialize edit form
        setEditForm({
          name: data.name || '',
          bio: data.profile?.bio || '',
          username: data.profile?.username || `@user_${user._id.toString().slice(-6)}`
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setDefaultData();
    } finally {
      setLoading(false);
    }
  };

  // Default data functions
  const getDefaultRecentlyWatched = () => [
    {
      id: 1,
      title: 'Jujutsu Kaisen',
      image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=400&h=250&fit=crop'
    },
    {
      id: 2,
      title: 'Attack on Titan',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=250&fit=crop'
    },
    {
      id: 3,
      title: 'Demon Slayer',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=250&fit=crop'
    },
    {
      id: 4,
      title: 'Favorite Anime',
      image: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=400&h=250&fit=crop'
    }
  ];

  const getDefaultFavoriteAnime = () => [
    {
      id: 1,
      title: 'One Piece',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=250&fit=crop'
    },
    {
      id: 2,
      title: 'Naruto',
      image: 'https://images.unsplash.com/photo-1639322537506-86d2f06a43ff?w=400&h=250&fit=crop'
    },
    {
      id: 3,
      title: 'My Hero Academia',
      image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=400&h=250&fit=crop'
    },
    {
      id: 4,
      title: 'Fullmetal Alchemist',
      image: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=400&h=250&fit=crop'
    }
  ];

  const getDefaultBadges = () => [
    {
      id: 1,
      title: 'Binge King',
      description: 'Watched 10+ episodes in a day',
      icon: '🏆'
    },
    {
      id: 2,
      title: 'Seasonal Hunter',
      description: 'Completed 5+ seasonal anime',
      icon: '🎯'
    },
    {
      id: 3,
      title: 'Night Owl',
      description: 'Watched anime after 2 am',
      icon: '🦉'
    },
    {
      id: 4,
      title: 'Anime Veteran',
      description: 'Member for 2+ years',
      icon: '⚔️'
    }
  ];

  const getDefaultGenres = () => [
    { name: 'Action', percentage: 35 },
    { name: 'Fantasy', percentage: 25 },
    { name: 'Comedy', percentage: 20 },
    { name: 'Romance', percentage: 15 },
    { name: 'Sci-Fi', percentage: 5 }
  ];

  const setDefaultData = () => {
    setProfileData({
      name: user?.name || 'Anime Lover',
      username: `@user_${user?._id?.toString().slice(-6) || 'unknown'}`,
      bio: 'Anime enthusiast exploring new worlds through animation',
      joinDate: 'April 2020',
      avatar: user?.photo || null,
      email: user?.email || ''
    });
    
    setStats({
      animeWatched: 324,
      hoursWatched: 2564,
      currentlyWatching: 18,
      favorites: 56,
      animePlanned: 42,
      animeDropped: 12,
      totalEpisodes: 1200,
      meanScore: 8.2
    });
    
    setRecentlyWatched(getDefaultRecentlyWatched());
    setFavoriteAnime(getDefaultFavoriteAnime());
    setBadges(getDefaultBadges());
    setGenres(getDefaultGenres());
    
    setEditForm({
      name: user?.name || '',
      bio: 'Anime enthusiast exploring new worlds through animation',
      username: `@user_${user?._id?.toString().slice(-6) || 'unknown'}`
    });
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

      const response = await fetch(`${API_BASE}/api/profile/${user._id}`, {
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

      const result = await response.json();
      
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
    if (file && user?._id) {
      try {
        // Validate file
        if (!file.type.startsWith('image/')) {
          alert('Please select an image file');
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          alert('Image size should be less than 5MB');
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            // Update local state immediately for better UX
            setProfileData(prev => ({
              ...prev,
              avatar: reader.result
            }));
            
            // Upload to server
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append('photo', file);
            
            const response = await fetch(`${API_BASE}/api/profile/${user._id}/upload-photo`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              body: formData
            });
            
            if (!response.ok) {
              throw new Error('Upload failed');
            }
            
            const result = await response.json();
            
            // Update user in context if needed
            if (updateProfile) {
              await updateProfile({ photo: result.photo });
            }
            
            alert('Profile picture updated successfully!');
          } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
            
            // Revert to previous image by reloading
            await loadProfileData();
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Image upload error:', error);
        alert('Error uploading image: ' + error.message);
      }
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

  if (loading) {
    return (
      <>
        <BottomNavBar />
        <div className="profile-page">
          <Header showSearch={false} />
          <div className="profile-container2">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading profile...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!profileData) {
    return (
      <>
        <BottomNavBar />
        <div className="profile-page">
          <Header showSearch={false} />
          <div className="profile-container2">
            <div className="error-message">
              <h2>Profile Not Found</h2>
              <p>Please log in to view your profile.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <BottomNavBar />
      <div className="profile-page">
        <Header showSearch={false} />
        <div className="profile-container2">
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

          {/* Divider Line */}
          <div className="divider-line"></div>
          
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
                      ? 'Check your recently watched anime below!' 
                      : 'Start watching anime to see your activity here!'}
                  </p>
                  <p className="activity-subtext">
                    Track your latest anime additions, episode progress, and ratings here.
                  </p>
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
                        {anime.rating && (
                          <div className="anime-rating">⭐ {anime.rating}/5</div>
                        )}
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

          {/* Genre Breakdown Section */}
          <div className="genre-section">
            <div>
              <h3 className="section-title">Genre Breakdown</h3>
              <div className="genre-grid">
                {genres.length > 0 ? (
                  genres.map((genre, index) => (
                    <div key={index} className="genre-item">
                      <div className="genre-name">{genre.name}</div>
                      <div className="genre-bar">
                        <div
                          className="genre-fill"
                          style={{ width: `${genre.percentage}%` }}
                        ></div>
                      </div>
                      <div className="genre-percentage">{genre.percentage}%</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No genre data available.</p>
                    <p>Watch more anime to see your genre preferences!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;