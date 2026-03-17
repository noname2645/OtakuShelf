import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import axios from 'axios';
import api from '../api.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Detect network errors (covers Render cold-start, timeouts, etc.)
const isNetworkError = (error) => {
  if (!error.response) return true; // No response = network issue
  const networkCodes = ['ECONNABORTED', 'NETWORK_ERROR', 'ERR_NETWORK', 'ERR_CONNECTION_REFUSED', 'ETIMEDOUT', 'ECONNRESET'];
  return networkCodes.includes(error.code);
};

// Axios instance with retries for cold-start on Render
const createApiCall = (url, options = {}, retries = 3, baseDelay = 3000) => {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const timeout = i === 0 ? 8000 : 20000; // First try fast, then wait longer (cold-start)
        const response = await api.get(url, { ...options, timeout });
        return resolve(response);
      } catch (err) {
        const isLast = i === retries;
        if (isLast || !isNetworkError(err)) {
          return reject(err);
        }
        const delay = baseDelay * Math.pow(2, i); // Exponential backoff: 3s, 6s, 12s
        console.log(`Auth retry ${i + 1}/${retries} in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);

  const API = import.meta.env.VITE_API_BASE_URL;

  const storeMinimalUser = useCallback((userData) => {
    try {
      let safePhoto = userData.photo;
      if (safePhoto && safePhoto.startsWith('data:image')) {
        safePhoto = null;
      }

      const minimalData = {
        id: userData._id || userData.id,
        email: userData.email,
        name: userData.name || userData.email?.split('@')[0] || 'User',
        photo: safePhoto
      };

      localStorage.setItem("user", JSON.stringify(minimalData));
    } catch (error) {
      console.error('Storage error, using minimal storage:', error);
      try {
        localStorage.setItem("user_id", userData._id || userData.id);
      } catch (e) {
        // Silent fail
      }
    }
  }, []);

  const loadFromStorage = useCallback(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        return JSON.parse(userString);
      }

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
      localStorage.removeItem("user");
      localStorage.removeItem("user_profile");
    }
    return null;
  }, []);

  const clearStorage = useCallback(() => {
    const keysToRemove = [];
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('user') || key === 'token') {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setUser(null);
    setProfile(null);
  }, []);

  const fixPhotoUrl = useCallback((url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    if (url.startsWith('/uploads/')) {
      return `${API}${url}`;
    }
    return url;
  }, [API]);

  const fetchFreshProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const response = await api.get(`/api/profile/${userId}`);
      return response.data.data; // Standardized response
    } catch (error) {
      console.log('Profile fetch failed (non-critical):', error.message);
      return null;
    }
  }, []);

  // Handle OAuth token from URL redirect (Google login)
  const handleTokenFromUrl = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) return false;

    console.log('Processing OAuth token from URL...');
    localStorage.setItem("token", token);
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
      const response = await createApiCall(
        `${API}/auth/me`,
        {},
        3,
        3000
      );

      const resData = response.data.data;
      if (resData && resData.user) {
        const userData = resData.user;
        userData.photo = fixPhotoUrl(userData.photo);

        setUser(userData);
        storeMinimalUser(userData);

        // Fetch profile asynchronously
        fetchFreshProfile(userData._id).then(profileData => {
          if (profileData) setProfile(profileData);
        });

        return true;
      }
    } catch (error) {
      console.error('OAuth token validation failed:', error.message);
      // Keep the token stored — user might be offline, let checkAuthStatus retry
      const storedUser = loadFromStorage();
      if (storedUser) {
        setUser(storedUser);
      }
    }
    return false;
  }, [API, fetchFreshProfile, storeMinimalUser, loadFromStorage, fixPhotoUrl]);

  // Main auth check — handles Render cold-starts with retries
  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem("token");

    // No token — use stored user (offline/not logged in)
    if (!token) {
      const storedUser = loadFromStorage();
      if (storedUser) {
        storedUser.photo = fixPhotoUrl(storedUser.photo);
        setUser(storedUser);
        // Try profile fetch in background
        fetchFreshProfile(storedUser.id).then(p => { if (p) setProfile(p); }).catch(() => { });
      }
      setLoading(false);
      return;
    }

    try {
      // With retries for Render cold-start (up to ~21 seconds total wait)
      const response = await createApiCall(
        `${API}/auth/me`,
        {},
        3,
        3000
      );

      const resData = response.data.data;
      if (resData && resData.user) {
        const userData = resData.user;
        userData.photo = fixPhotoUrl(userData.photo);

        setUser(userData);
        storeMinimalUser(userData);

        // Fetch profile in background
        fetchFreshProfile(userData._id).then(profileData => {
          if (profileData) setProfile(profileData);
        });
      } else {
        clearStorage();
      }
    } catch (error) {
      console.error('Auth check failed:', error.message);

      if (error.response?.status === 401 || error.response?.status === 403) {
        // Invalid token — clear it
        clearStorage();
      } else {
        // Network error or server error — use cached data (offline mode)
        const storedUser = loadFromStorage();
        if (storedUser) {
          storedUser.photo = fixPhotoUrl(storedUser.photo);
          setUser(storedUser);
          console.log('Using cached auth (server unreachable)');
        } else {
          // No cached data, definitely logged out
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [API, fetchFreshProfile, storeMinimalUser, clearStorage, loadFromStorage, fixPhotoUrl]);

  // Initialize auth on mount
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const initialize = async () => {
      clearStorageOverflow();
      const hadUrlToken = await handleTokenFromUrl();
      if (!hadUrlToken) {
        await checkAuthStatus();
      } else {
        setLoading(false);
      }
    };

    initialize();
  }, [handleTokenFromUrl, checkAuthStatus]);

  const clearStorageOverflow = () => {
    try {
      let totalSize = 0;
      Object.keys(localStorage).forEach(key => {
        const val = localStorage.getItem(key);
        if (val) totalSize += val.length * 2;
      });

      if (totalSize > 4 * 1024 * 1024) {
        console.warn('LocalStorage near limit, clearing non-essential data');
        Object.keys(localStorage).forEach(key => {
          if (key.includes('profile') || key.includes('image') || key.includes('photo')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (e) {
      // Silent fail
    }
  };

  // Login — stores token and user, fetches profile
  const login = useCallback(async (userData, authToken) => {
    if (authToken) {
      localStorage.setItem("token", authToken);
    }

    userData.photo = fixPhotoUrl(userData.photo);

    setUser(userData);
    storeMinimalUser(userData);

    // Fetch profile in background
    const userId = userData._id || userData.id;
    if (userId) {
      fetchFreshProfile(userId).then(profileData => {
        if (profileData) setProfile(profileData);
      }).catch(() => { });
    }
  }, [fetchFreshProfile, storeMinimalUser, fixPhotoUrl]);

  // Logout — clean server session + local state
  const logout = useCallback(async () => {
    try {
      await api.get('/auth/logout');
    } catch (error) {
      // Continue even if server logout fails
      console.log('Server logout failed (continuing local logout)');
    } finally {
      clearStorage();
      window.location.href = '/';
    }
  }, [API, clearStorage]);

  // Update profile — secure with auth token
  const updateProfile = useCallback(async (profileData) => {
    try {
      const currentUser = user || JSON.parse(localStorage.getItem("user") || '{}');
      const userId = currentUser.id || currentUser._id;

      if (!userId) throw new Error('User not authenticated');

      const token = localStorage.getItem("token");
      if (!token) throw new Error('Authentication token missing');

      const response = await api.put(`/api/profile/${userId}`, profileData);
 
      const resData = response.data.data;
      if (resData && resData.user) {
        const updatedUser = { ...currentUser, ...resData.user };
        updatedUser.photo = fixPhotoUrl(updatedUser.photo);
        setUser(updatedUser);
        storeMinimalUser(updatedUser);

        const freshProfile = await fetchFreshProfile(userId);
        if (freshProfile) setProfile(freshProfile);
      }

      return response.data;
    } catch (error) {
      let errorMessage = 'Failed to update profile';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server';
      } else {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  }, [API, user, fetchFreshProfile, storeMinimalUser, fixPhotoUrl]);

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
    refreshProfile: () => {
      const uid = user?.id || user?._id;
      if (uid) fetchFreshProfile(uid).then(p => { if (p) setProfile(p); });
    },
    updateUserState: (updates) => {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      storeMinimalUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};