import React, { useState } from 'react';
import '../Stylesheets/profile.css';
import {Header} from '../components/header';

const ProfilePage = () => {
  // Profile data
  const [profileData, setProfileData] = useState({
    name: 'Anime Lover',
    username: '@otaku_legend',
    bio: 'Anime enthusiast exploring new worlds through animation',
    joinDate: 'April 2020',
    avatar: null
  });

  // Stats data
  const [stats] = useState({
    animeWatched: 324,
    hoursWatched: 2564,
    currentlyWatching: 18,
    favorites: 56
  });

  // Recently watched anime
  const [recentlyWatched] = useState([
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
  ]);

  // Favorite anime
  const [favoriteAnime] = useState([
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
  ]);

  // Badges
  const [badges] = useState([
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
  ]);

  // Genre breakdown
  const [genres] = useState([
    { name: 'Action', percentage: 35 },
    { name: 'Fantasy', percentage: 25 },
    { name: 'Comedy', percentage: 20 },
    { name: 'Romance', percentage: 15 },
    { name: 'Sci-Fi', percentage: 5 }
  ]);

  const handleEditProfile = () => {
    // Open edit profile modal or navigate to edit page
    alert('Edit profile feature coming soon!');
  };

  const handleShareProfile = () => {
    // Share profile functionality
    if (navigator.share) {
      navigator.share({
        title: `${profileData.name}'s Anime Profile`,
        text: `Check out ${profileData.name}'s anime profile on OtakuShelf!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Profile link copied to clipboard!');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({
          ...prev,
          avatar: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="profile-page">
      <Header showSearch={false} />
      
      <div className="profile-container">
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
              style={{ 
                display: 'none' 
              }}
              id="avatar-upload"
            />
            <label 
              htmlFor="avatar-upload"
              style={{
                display: 'block',
                textAlign: 'center',
                color: '#ff6b6b',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Change Photo
            </label>
          </div>
          
          <div className="profile-name-section">
            <h1>{profileData.name}</h1>
            
            <div className="username-section">
              <span className="username">{profileData.username}</span>
            </div>
            
            <div className="profile-actions">
              <button className="btn-edit" onClick={handleEditProfile}>
                Edit Profile
              </button>
              <button className="btn-share" onClick={handleShareProfile}>
                Share Profile
              </button>
            </div>
            
            <p className="profile-bio">
              {profileData.bio}
            </p>
            
            <div className="join-date">
              <span>Joined {profileData.joinDate}</span>
            </div>
          </div>
        </div>

        {/* Divider Line */}
        <div className="divider-line"></div>

        {/* Overview Section */}
        <h2 className="overview-header">Overview</h2>
        
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{stats.animeWatched}</span>
            <span className="stat-label">Anime Watched</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.hoursWatched}</span>
            <span className="stat-label">Hours Watched</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.currentlyWatching}</span>
            <span className="stat-label">Currently Watching</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.favorites}</span>
            <span className="stat-label">Favorites</span>
          </div>
        </div>

        {/* Recently Watched & Favorite Anime Section */}
        <div className="recently-watched-section">
          <div>
            <h3 className="section-title">Recently Watched</h3>
            <div className="recently-watched-grid">
              {recentlyWatched.map(anime => (
                <div key={anime.id} className="watched-item">
                  <img src={anime.image} alt={anime.title} />
                  <div className="watched-info">
                    <h3>{anime.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="section-title">Favorite Anime</h3>
            <div className="favorite-grid">
              {favoriteAnime.map(anime => (
                <div key={anime.id} className="favorite-item">
                  <img src={anime.image} alt={anime.title} />
                  <div className="favorite-info">
                    <h3>{anime.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="badges-section">
          <h3 className="section-title">Badges</h3>
          <div className="badges-grid">
            {badges.map(badge => (
              <div key={badge.id} className="badge-card">
                <div className="badge-icon">{badge.icon}</div>
                <div className="badge-title">{badge.title}</div>
                <div className="badge-desc">{badge.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Genre Breakdown Section */}
        <div className="genre-section">
          <div>
            <h3 className="section-title">Genre Breakdown</h3>
            <div className="genre-grid">
              {genres.map((genre, index) => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;