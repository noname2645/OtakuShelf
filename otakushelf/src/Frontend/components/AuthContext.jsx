import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = import.meta.env.VITE_API_BASE_URL;

  const storeMinimalUser = useCallback((userData) => {
    try {
      let safePhoto = userData.photo;
      if (safePhoto && safePhoto.startsWith('data:image')) {
        safePhoto = null;
      }

      const minimalData = {
        id: userData._id,
        email: userData.email,
        name: userData.name || userData.email?.split('@')[0] || 'User',
        photo: safePhoto // This should be a URL or null
      };

      localStorage.setItem("user", JSON.stringify(minimalData));
    } catch (error) {
      console.error('Storage error, using minimal storage:', error);
      localStorage.setItem("user_id", userData._id);
    }
  }, []);

  // 2. LOAD FROM STORAGE - Safely restore minimal data
  const loadFromStorage = useCallback(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        return JSON.parse(userString);
      }

      // Fallback to separate fields
      const userId = localStorage.getItem("user_id");
      if (userId) {
        return {
          id: userId,
          email: localStorage.getItem("user_email") || '',
          name: localStorage.getItem("user_name") || 'User'
        };
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
      // Clear corrupted data
      localStorage.removeItem("user");
      localStorage.removeItem("user_profile");
    }
    return null;
  }, []);

  // 3. CLEAR ALL STORAGE
  const clearStorage = useCallback(() => {
    const keysToKeep = ['settings', 'theme']; // Keep non-auth data

    Object.keys(localStorage).forEach(key => {
      if (!keysToKeep.includes(key) && key.startsWith('user')) {
        localStorage.removeItem(key);
      }
    });

    localStorage.removeItem("token");
    setUser(null);
    setProfile(null);
  }, []);

  // 4. FETCH FRESH PROFILE DATA
  const fetchFreshProfile = useCallback(async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/profile/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 8000
      });

      return response.data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  }, [API]);

  // Helper to ensure photo URLs are absolute
  const fixPhotoUrl = useCallback((url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    if (url.startsWith('/uploads/')) {
      // Remove /api from the end of API URL if present to get base URL
      const backendBaseUrl = API.endsWith('/api')
        ? API.slice(0, -4)
        : API.replace('/api', '');
      return `${backendBaseUrl}${url}`;
    }
    return url;
  }, [API]);

  // 5. HANDLE TOKEN FROM URL (Google OAuth)
  const handleTokenFromUrl = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      console.log('Processing token from URL');
      localStorage.setItem("token", token);

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

      try {
        // Get user info
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.user) {
          const userData = response.data.user;
          // FIX URL
          userData.photo = fixPhotoUrl(userData.photo);

          const profileData = await fetchFreshProfile(userData._id);

          setUser(userData);
          setProfile(profileData);
          storeMinimalUser(userData);

          return true;
        }
      } catch (error) {
        console.error('URL token auth failed:', error);
        clearStorage();
      }
    }
    return false;
  }, [API, fetchFreshProfile, storeMinimalUser, clearStorage, fixPhotoUrl]);

  // 6. MAIN AUTH CHECK
  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        // No token, check for stored user (offline mode)
        let storedUser = loadFromStorage();
        if (storedUser) {
          // FIX URL for stored user too
          storedUser.photo = fixPhotoUrl(storedUser.photo);

          setUser(storedUser);
          // Try to fetch profile but don't fail if offline
          fetchFreshProfile(storedUser.id)
            .then(setProfile)
            .catch(() => console.log('Offline mode: using stored user only'));
        }
        setLoading(false);
        return;
      }

      // Validate token with server
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });

      if (response.data.user) {
        const userData = response.data.user;
        // FIX URL
        userData.photo = fixPhotoUrl(userData.photo);

        const profileData = await fetchFreshProfile(userData._id);

        setUser(userData);
        setProfile(profileData);
        storeMinimalUser(userData);
      } else {
        clearStorage();
      }
    } catch (error) {
      console.error('Auth check failed:', error.message);

      // If network error, try to use stored data
      if (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR') {
        const storedUser = loadFromStorage();
        if (storedUser) {
          storedUser.photo = fixPhotoUrl(storedUser.photo);
          setUser(storedUser);
          console.log('Using cached data (offline mode)');
        }
      } else if (error.response?.status === 401) {
        clearStorage();
      }
    } finally {
      setLoading(false);
    }
  }, [API, fetchFreshProfile, storeMinimalUser, clearStorage, loadFromStorage, fixPhotoUrl]);

  // 7. INITIALIZE AUTH
  useEffect(() => {
    const initialize = async () => {
      // First clear any overly large data
      clearStorageOverflow();

      // Handle OAuth callback if present
      const hadUrlToken = await handleTokenFromUrl();

      // If no URL token, check existing auth
      if (!hadUrlToken) {
        await checkAuthStatus();
      }
    };

    initialize();
  }, [handleTokenFromUrl, checkAuthStatus]);

  // 8. CLEAR STORAGE OVERFLOW UTILITY
  const clearStorageOverflow = () => {
    try {
      // Check total localStorage size
      let totalSize = 0;
      Object.keys(localStorage).forEach(key => {
        totalSize += localStorage.getItem(key).length * 2; // Approx bytes
      });

      // If over 4MB, clear non-essential data
      if (totalSize > 4 * 1024 * 1024) {
        console.warn('LocalStorage near limit, clearing non-essential data');
        Object.keys(localStorage).forEach(key => {
          if (key.includes('profile') || key.includes('image') || key.includes('photo')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      // Silent fail - just continue
    }
  };

  // 9. LOGIN FUNCTION
  const login = useCallback(async (userData, authToken) => {
    if (authToken) {
      localStorage.setItem("token", authToken);
    }

    // FIX URL
    userData.photo = fixPhotoUrl(userData.photo);

    const profileData = await fetchFreshProfile(userData._id);

    setUser(userData);
    setProfile(profileData);
    storeMinimalUser(userData);
  }, [fetchFreshProfile, storeMinimalUser, fixPhotoUrl]);

  // 10. LOGOUT FUNCTION
  const logout = useCallback(async () => {
    try {
      await axios.get(`${API}/auth/logout`, { timeout: 3000 });
    } catch (error) {
      // Continue even if server logout fails
    } finally {
      clearStorage();
      window.location.href = '/';
    }
  }, [API, clearStorage]);

  // 11. UPDATE PROFILE FUNCTION (FIXED)
  const updateProfile = useCallback(async (profileData) => {
    try {
      // Get user ID safely
      const currentUser = user || JSON.parse(localStorage.getItem("user")) || {};
      const userId = currentUser.id || currentUser._id;

      if (!userId) {
        console.error('Cannot update profile: No user ID found');
        throw new Error('User not authenticated');
      }

      const token = localStorage.getItem("token");
      if (!token) {
        console.error('Cannot update profile: No token found');
        throw new Error('Authentication token missing');
      }

      console.log('Updating profile for user:', userId);
      console.log('Update data:', profileData);

      const response = await axios.put(
        `${API}/api/profile/${userId}`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('Profile update response:', response.data);

      if (response.data.user) {
        const updatedUser = {
          ...currentUser,
          ...response.data.user
        };

        // FIX URL
        updatedUser.photo = fixPhotoUrl(updatedUser.photo);

        // Update state
        setUser(updatedUser);

        // Update localStorage
        storeMinimalUser(updatedUser);

        // Fetch fresh profile data to ensure consistency
        const freshProfile = await fetchFreshProfile(userId);
        if (freshProfile) {
          setProfile(freshProfile);
        }
      }

      return response.data;
    } catch (error) {
      console.error('Profile update error details:', error);

      // More detailed error message
      let errorMessage = 'Failed to update profile';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        console.error('Server response:', error.response.data);
      } else if (error.request) {
        errorMessage = 'No response from server';
      } else {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  }, [API, user, fetchFreshProfile, storeMinimalUser]);

  // 12. COMBINED USER OBJECT
  const combinedUser = user ? {
    ...user,
    profile: profile?.profile || {},
    recentlyWatched: profile?.recentlyWatched || [],
    favoriteAnime: profile?.favoriteAnime || []
  } : null;

  const value = {
    user: combinedUser,
    profile,
    loading,
    login,
    logout,
    checkAuthStatus,
    updateProfile,
    refreshProfile: () => user && fetchFreshProfile(user.id).then(setProfile)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};