import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API = import.meta.env.VITE_API_BASE_URL;

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let gisInitialized = false;

export function useGoogleAuth({ onError } = {}) {
  const [gisLoading, setGisLoading] = useState(false);
  const { login } = useAuth();
  const pendingRef = useRef(null);

  const handleCredentialResponse = useCallback(async (response) => {
    const idToken = response.credential;
    if (!idToken) {
      if (pendingRef.current) {
        pendingRef.current.reject(new Error('No credential received from Google'));
        pendingRef.current = null;
      }
      setGisLoading(false);
      return;
    }
    try {
      const res = await axios.post(`${API}/auth/google`, { idToken });
      if (res.data.data?.user) {
        login(res.data.data.user, res.data.data.accessToken, res.data.data.refreshToken);
        if (pendingRef.current) {
          pendingRef.current.resolve(true);
          pendingRef.current = null;
        }
      }
    } catch (err) {
      console.error('Google auth error:', err);
      if (pendingRef.current) {
        pendingRef.current.reject(err);
        pendingRef.current = null;
      }
      if (onError) onError(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setGisLoading(false);
    }
  }, [login, onError]);

  const initGis = useCallback(() => {
    if (gisInitialized || !window.google?.accounts) return;
    gisInitialized = true;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      cancel_on_tap_outside: false,
      auto_select: false,
    });
  }, [handleCredentialResponse]);

  useEffect(() => {
    const checkGis = () => {
      if (window.google?.accounts) {
        initGis();
      }
    };
    if (window.google?.accounts) {
      initGis();
    } else {
      const interval = setInterval(checkGis, 200);
      setTimeout(() => clearInterval(interval), 10000);
      return () => clearInterval(interval);
    }
  }, [initGis]);

  // Redirect-based Google Sign-In (fallback when GIS is unavailable)
  const redirectToGoogle = useCallback(() => {
    window.location.href = `${API}/auth/google`;
  }, []);

  const signInWithGoogle = useCallback(() => {
    if (!window.google?.accounts?.id) {
      redirectToGoogle();
      return Promise.resolve();
    }
    if (!gisInitialized) initGis();
    setGisLoading(true);
    return new Promise((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // GIS cannot display (e.g. origin not yet propagated, blocked, etc.)
          // Fall back to redirect flow
          if (pendingRef.current) {
            pendingRef.current.resolve('redirect');
            pendingRef.current = null;
          }
          setGisLoading(false);
          redirectToGoogle();
        }
      });
      setTimeout(() => {
        if (pendingRef.current) {
          pendingRef.current.resolve('redirect');
          pendingRef.current = null;
          setGisLoading(false);
          redirectToGoogle();
        }
      }, 30000);
    });
  }, [initGis, redirectToGoogle, onError]);

  return { signInWithGoogle, gisLoading, redirectToGoogle };
}
