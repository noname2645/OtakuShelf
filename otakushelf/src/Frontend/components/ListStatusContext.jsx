import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../api.js';
import { useAuth } from './AuthContext.jsx';

const ListStatusContext = createContext();

export const useListStatus = () => {
  const context = useContext(ListStatusContext);
  if (!context) throw new Error('useListStatus must be used within ListStatusProvider');
  return context;
};

// LocalStorage key for the global status map
const STORAGE_KEY = 'list_status_map';

// Statuses we track globally
const CATEGORIES = ['watching', 'completed', 'planned', 'dropped'];

// Normalize a title for fuzzy matching (lowercase, trimmed, spaces collapsed)
const normalizeTitle = (title) =>
  String(title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

// Extract a plain string title from an anime object (AniList shape or plain string)
const getTitle = (anime) => {
  if (!anime) return '';
  if (typeof anime.title === 'string') return anime.title;
  return anime.title?.english || anime.title?.romaji || anime.title?.native || '';
};

export const ListStatusProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || user?._id;

  // Global map with namespaced keys so one anime can match by id, malId, or title:
  //   `id:<animeId>`  -> status
  //   `mal:<malId>`   -> status
  //   `title:<title>` -> status
  const [statusMap, setStatusMap] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) || {};
        // Migrate old plain `animeId -> status` keys to the namespaced format
        const migrated = {};
        Object.entries(parsed).forEach(([k, v]) => {
          if (k.startsWith('id:') || k.startsWith('mal:') || k.startsWith('title:')) {
            migrated[k] = v;
          } else {
            migrated[`id:${k}`] = v;
          }
        });
        return migrated;
      }
    } catch { /* ignore */ }
    return {};
  });
  const loadedRef = useRef(false);
  const hadUserRef = useRef(Boolean(userId));

  // Persist the map to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(statusMap)); } catch { /* ignore */ }
  }, [statusMap]);

  // Load the full list from the backend once per login and merge into the map
  useEffect(() => {
    if (!userId) return;
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const res = await api.get(`/api/list/${userId}`);
        const list = res.data.data;
        const next = {};
        CATEGORIES.forEach(cat => {
          (list?.[cat] || []).forEach(item => {
            if (item.animeId) next[`id:${String(item.animeId)}`] = cat;
            if (item.malId) next[`mal:${String(item.malId)}`] = cat;
            if (item.title) next[`title:${normalizeTitle(item.title)}`] = cat;
          });
        });
        setStatusMap(prev => ({ ...prev, ...next }));
      } catch (err) {
        console.log('List sync failed (using cached statuses):', err?.message);
      }
    })();
  }, [userId]);

  // Reset the map on logout (not on initial mount, when userId is briefly undefined)
  useEffect(() => {
    if (userId) {
      hadUserRef.current = true;
      return;
    }
    if (hadUserRef.current) {
      hadUserRef.current = false;
      loadedRef.current = false;
      setStatusMap({});
    }
  }, [userId]);

  // Get the status for an anime. Accepts either an anime object (preferred) or a
  // raw id. Checks in order: id -> malId -> title. Returns null if not in any list.
  const getStatus = useCallback((anime) => {
    if (!anime) return null;

    if (typeof anime === 'string' || typeof anime === 'number') {
      return statusMap[`id:${String(anime)}`] || null;
    }

    const id = anime.id ?? anime.animeId;
    if (id) {
      const s = statusMap[`id:${String(id)}`];
      if (s) return s;
    }

    const mal = anime.idMal ?? anime.malId;
    if (mal) {
      const s = statusMap[`mal:${String(mal)}`];
      if (s) return s;
    }

    const title = getTitle(anime);
    if (title) {
      const s = statusMap[`title:${normalizeTitle(title)}`];
      if (s) return s;
    }

    return null;
  }, [statusMap]);

  // Set the status for an anime (pass null to remove it from lists).
  // Accepts either an anime object (preferred) or a raw id.
  const setStatus = useCallback((anime, status) => {
    if (!anime) return;

    // Collect every key that identifies this anime so we can clear them all on removal
    let keys = [];
    if (typeof anime === 'string' || typeof anime === 'number') {
      keys = [`id:${String(anime)}`];
    } else {
      const id = anime.id ?? anime.animeId;
      const mal = anime.idMal ?? anime.malId;
      const title = getTitle(anime);
      if (id) keys.push(`id:${String(id)}`);
      if (mal) keys.push(`mal:${String(mal)}`);
      if (title) keys.push(`title:${normalizeTitle(title)}`);
    }

    setStatusMap(prev => {
      const next = { ...prev };
      if (status) {
        // Only write the primary id key; the backend refresh fills in the rest
        const primary = keys.find(k => k.startsWith('id:')) || keys[0];
        if (primary) next[primary] = status;
        // Remove any conflicting mal/title keys that might have held a different status
        keys.forEach(k => { if (k !== primary) delete next[k]; });
      } else {
        keys.forEach(k => delete next[k]);
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    statusMap,
    getStatus,
    setStatus,
  }), [statusMap, getStatus, setStatus]);

  return (
    <ListStatusContext.Provider value={value}>
      {children}
    </ListStatusContext.Provider>
  );
};
