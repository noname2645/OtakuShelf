import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_BASE = import.meta.env.VITE_API_BASE_URL;

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

  // Set axios authorization header if token exists
  const token = localStorage.getItem("token");
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }


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

        // Fetch user profile using this token
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
          }
        } catch (error) {
          console.error('Token authentication failed:', error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } finally {
          setLoading(false);
        }
        return true; // Token was processed
      }
      return false; // No token found
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
        setUser(response.data.user);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      } else {
        console.log('No authenticated user found');
        setUser(null);
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error('Auth check failed:', error.response?.data || error.message);
      // Only clear localStorage if it's a 401 (unauthorized) or 403 (forbidden)
      if (error.response?.status === 401 || error.response?.status === 403) {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
      // For network errors or 500 errors, don't clear user data
    } finally {
      setLoading(false);
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
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};