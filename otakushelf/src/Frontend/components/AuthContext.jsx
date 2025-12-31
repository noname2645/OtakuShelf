import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API = import.meta.env.VITE_API_BASE_URL;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/profile/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      return response.data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  };

  // FIXED: Handle token from URL parameters first, before checking auth status
  useEffect(() => {
    const handleTokenFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (token) {
        console.log('Token found in URL:', token);
        localStorage.setItem("token", token);

        // Clean URL immediately
        window.history.replaceState({}, document.title, "/");

        try {
          const response = await axios.get(`${API_BASE}/auth/me`, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (response.data.user) {
            console.log('User authenticated via token:', response.data.user);
            setUser(response.data.user);
            localStorage.setItem("user", JSON.stringify(response.data.user));

            // Ensure anime list exists for Google users
            await ensureAnimeListExists(response.data.user._id);
          }
        } catch (error) {
          console.error('Token authentication failed:', error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } finally {
          setLoading(false);
        }
        return true;
      }
      return false;
    };

    const ensureAnimeListExists = async (userId) => {
      try {
        // Check if user has an anime list, create if not
        await axios.get(`${API}/api/list/${userId}`);
      } catch (error) {
        if (error.response?.status === 404) {
          // List doesn't exist, create empty one
          await axios.post(`${API}/api/list/${userId}`, {
            category: "watching",
            animeTitle: "dummy",
            animeData: {}
          });
        }
      }
    };

    const initializeAuth = async () => {
      const tokenProcessed = await handleTokenFromUrl();

      // Only check auth status if no token was processed
      if (!tokenProcessed) {
        await checkAuthStatus();
      }
    };

    initializeAuth();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/auth/me`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.user) {
        console.log('User authenticated:', response.data.user);

        // Fetch full profile data
        const profileData = await fetchUserProfile(response.data.user._id);

        const userWithProfile = {
          ...response.data.user,
          profile: profileData || {}
        };

        setUser(userWithProfile);
        localStorage.setItem("user", JSON.stringify(userWithProfile));
      } else {
        console.log('No authenticated user found');
        setUser(null);
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error('Auth check failed:', error.response?.data || error.message);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(`${API_BASE}/api/profile/${user._id}`, profileData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.user) {
        setUser(prev => ({
          ...prev,
          ...response.data.user
        }));
        localStorage.setItem("user", JSON.stringify({
          ...user,
          ...response.data.user
        }));
      }

      return response.data;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const login = (userData) => {
    console.log('Login called with user data:', userData);
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      console.log('Logout initiated');
      await axios.get(`${API_BASE}/auth/logout`, {
        withCredentials: true,
        timeout: 5000
      });
      console.log('Server logout successful');
    } catch (error) {
      console.error("Logout error:", error.response?.data || error.message);
      // Even if server logout fails, clear local state
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      console.log('Local logout completed');
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuthStatus,
    updateProfile, 
    fetchUserProfile 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};