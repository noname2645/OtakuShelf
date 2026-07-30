import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const TYPE_MAP = {
  BADGES_EARNED: 'badge',
  NOTIFICATION: null,
};

const SUBTYPE_MAP = {
  badge: 'badge',
  achievement: 'achievement',
  system: 'system',
  info: 'info',
  tip: 'tip',
  error: 'error',
};

function getTypeClass(data) {
  if (data.type === 'BADGES_EARNED') return 'badge';
  if (data.type === 'NOTIFICATION') {
    return SUBTYPE_MAP[data.subtype] || 'info';
  }
  return 'info';
}

function getToastData(data) {
  if (data.type === 'BADGES_EARNED' && data.newBadges?.length > 0) {
    const badge = data.newBadges[0];
    return {
      id: badge.id,
      type: 'badge',
      title: badge.title,
      message: badge.description,
      rarity: badge.rarity,
      _rawType: 'BADGES_EARNED',
    };
  }
  if (data.type === 'NOTIFICATION' && data.message) {
    return {
      id: data.id || Date.now(),
      type: data.subtype || 'info',
      title: data.title || 'Notification',
      message: data.message,
      rarity: data.rarity || null,
      _rawType: 'NOTIFICATION',
    };
  }
  return null;
}

function getAccentColor(type, rarity) {
  if (type === 'badge' && rarity) {
    return getRarityColor(rarity);
  }
  const colors = {
    achievement: '#fbbf24',
    system: '#60a5fa',
    info: '#4ade80',
    tip: '#c084fc',
    error: '#ef4444',
    badge: '#9b72ff',
  };
  return colors[type] || colors.info;
}

function getRarityColor(rarity) {
  const colors = {
    common: '#94a3b8',
    uncommon: '#4ade80',
    rare: '#60a5fa',
    epic: '#c084fc',
    legendary: '#fbbf24',
  };
  return colors[rarity?.toLowerCase()] || colors.common;
}

const TOAST_DURATION = 4000;

const IPhoneSVG = () => (
  <svg className="iphone-frame-svg" viewBox="0 0 393 852" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="frameBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#5c5c5e" />
        <stop offset="25%" stopColor="#7c7c80" />
        <stop offset="50%" stopColor="#6c6c70" />
        <stop offset="75%" stopColor="#7c7c80" />
        <stop offset="100%" stopColor="#4c4c4e" />
      </linearGradient>
      <linearGradient id="frameEdge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#8a8a8e" />
        <stop offset="50%" stopColor="#b0b0b4" />
        <stop offset="100%" stopColor="#6a6a6e" />
      </linearGradient>
      <linearGradient id="screenBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#070708" />
        <stop offset="100%" stopColor="#111113" />
      </linearGradient>
      <filter id="frameShadow">
        <feDropShadow dx="0" dy="8" stdDeviation="24" floodColor="#000" floodOpacity="0.5" />
        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#000" floodOpacity="0.3" />
      </filter>
      <filter id="innerGlow">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
        <feFlood floodColor="rgba(255,255,255,0.08)" />
        <feComposite in2="shadowDiff" operator="in" />
        <feComposite in2="SourceGraphic" operator="over" />
      </filter>
    </defs>

    <g filter="url(#frameShadow)">
      <rect x="6" y="6" width="381" height="840" rx="58" fill="url(#frameBody)" stroke="url(#frameEdge)" strokeWidth="1.5" />
    </g>

    <rect x="16" y="16" width="361" height="820" rx="48" fill="#1c1c1e" />

    <rect x="20" y="20" width="353" height="812" rx="44" fill="url(#screenBg)" />

    <rect x="20" y="20" width="353" height="812" rx="44" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

    <rect x="146.5" y="30" width="100" height="34" rx="17" fill="#0a0a0c" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

    <ellipse cx="176" cy="47" rx="4" ry="4" fill="#1c1c1e" />
    <ellipse cx="176" cy="47" rx="2.2" ry="2.2" fill="#2a2a2e" />

    <rect x="194" y="43" width="6" height="6" rx="3" fill="#161618" />

    <rect x="6" y="165" width="4" height="34" rx="2" fill="url(#frameBody)" />
    <rect x="6" y="220" width="4" height="52" rx="2" fill="url(#frameBody)" />
    <rect x="6" y="290" width="4" height="52" rx="2" fill="url(#frameBody)" />
    <rect x="383" y="215" width="4" height="56" rx="2" fill="url(#frameBody)" />
  </svg>
);

function ToastIcon({ type, rarity }) {
  const color = getAccentColor(type, rarity);
  const uid = useRef(Date.now()).current;

  switch (type) {
    case 'badge':
      return (
        <svg viewBox="0 0 48 48" width="22" height="22" fill="none" style={{ color }}>
          <circle cx="24" cy="24" r="21" fill={`${color}15`} stroke={color} strokeWidth="1.2" />
          <path d="M24 10 L27.5 19 L37 19 L30 25 L33 34 L24 28 L15 34 L18 25 L11 19 L20.5 19 Z" fill={color} opacity="0.85" />
        </svg>
      );
    case 'achievement':
      return (
        <svg viewBox="0 0 48 48" width="22" height="22" fill="none" style={{ color }}>
          <circle cx="24" cy="24" r="21" fill={`${color}15`} stroke={color} strokeWidth="1.2" />
          <circle cx="24" cy="24" r="13" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5" />
          <circle cx="24" cy="24" r="5" fill={color} opacity="0.8" />
          <path d="M24 12 L25.5 18 L33 18 L27 22 L29.5 29 L24 24.5 L18.5 29 L21 22 L15 18 L22.5 18 Z" fill={color} opacity="0.85" />
        </svg>
      );
    case 'system':
      return (
        <svg viewBox="0 0 48 48" width="22" height="22" fill="none" style={{ color }}>
          <circle cx="24" cy="24" r="21" fill={`${color}15`} stroke={color} strokeWidth="1.2" />
          <rect x="14" y="16" width="20" height="12" rx="2" fill="none" stroke={color} strokeWidth="1.2" />
          <line x1="19" y1="20" x2="29" y2="20" stroke={color} strokeWidth="1" strokeLinecap="round" />
          <line x1="19" y1="23" x2="26" y2="23" stroke={color} strokeWidth="1" strokeLinecap="round" />
          <circle cx="35" cy="19" r="2" fill={color} opacity="0.8" />
        </svg>
      );
    case 'info':
      return (
        <svg viewBox="0 0 48 48" width="22" height="22" fill="none" style={{ color }}>
          <circle cx="24" cy="24" r="21" fill={`${color}15`} stroke={color} strokeWidth="1.2" />
          <circle cx="24" cy="20" r="4" fill={color} opacity="0.8" />
          <path d="M24 26 L24 32" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="24" cy="34" r="1.2" fill={color} />
        </svg>
      );
    case 'tip':
      return (
        <svg viewBox="0 0 48 48" width="22" height="22" fill="none" style={{ color }}>
          <circle cx="24" cy="24" r="21" fill={`${color}15`} stroke={color} strokeWidth="1.2" />
          <path d="M24 13 L24 28" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="24" cy="32" r="1.8" fill={color} />
          <path d="M21 17 C21 14.5, 27 14.5, 27 17 C27 20, 24 23, 24 23" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'error':
    default:
      return (
        <svg viewBox="0 0 48 48" width="22" height="22" fill="none" style={{ color }}>
          <circle cx="24" cy="24" r="21" fill={`${color}15`} stroke={color} strokeWidth="1.2" />
          <path d="M16 16 L32 32 M32 16 L16 32" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

const IOSToast = React.memo(({ toast, isExiting, onDismiss }) => {
  const typeClass = getTypeClass({ type: toast._rawType || 'NOTIFICATION', subtype: toast.type });
  const accentColor = getAccentColor(toast.type, toast.rarity);

  return (
    <div
      className={`ios-toast ${typeClass}${isExiting ? ' ios-toast-exit' : ''}`}
      onClick={() => onDismiss(toast.id)}
      style={{
        '--accent': accentColor,
        '--accent-alpha': `${accentColor}22`,
        '--accent-border': `${accentColor}33`,
      }}
    >
      <div className="ios-toast-icon">
        <ToastIcon type={toast.type} rarity={toast.rarity} />
      </div>
      <div className="ios-toast-content">
        <div className="ios-toast-title">{toast.title}</div>
        <div className="ios-toast-message">{toast.message}</div>
      </div>
      <button className="ios-toast-close" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}>
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" />
          <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" />
        </svg>
      </button>
      <div className="ios-toast-progress" style={{ '--duration': `${TOAST_DURATION}ms` }} />
    </div>
  );
});

const BadgeNotification = () => {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [exitingIds, setExitingIds] = useState(new Set());
  const wsRef = useRef(null);
  const timersRef = useRef({});

  const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  const addToast = React.useCallback((data) => {
    const toastData = getToastData(data);
    if (!toastData) return;

    const id = toastData.id;
    setToasts((prev) => [...prev, toastData]);

    timersRef.current[id] = setTimeout(() => {
      setExitingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        delete timersRef.current[id];
      }, 300);
    }, TOAST_DURATION);
  }, []);

  const dismissToast = React.useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  useEffect(() => {
    if (!user || !user._id) return;

    const connectWebSocket = () => {
      try {
        const backendUrl = API.replace('http://', 'ws://').replace('https://', 'wss://');
        const wsUrl = `${backendUrl}/ws?userId=${user._id}`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            addToast(data);
          } catch (e) {
            console.error('Toast WS parse error:', e);
          }
        };

        wsRef.current.onclose = (event) => {
          if (event.code !== 1000) {
            setTimeout(connectWebSocket, 5000);
          }
        };
      } catch (e) {
        console.error('Toast WS setup error:', e);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, [user, API, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="iphone-notification-container">
      <div className="iphone-device-wrapper">
        <IPhoneSVG />
        <div className="iphone-screen-overlay">
          <div className="iphone-toasts-area">
            {toasts.map((toast) => (
              <IOSToast
                key={toast.id}
                toast={toast}
                isExiting={exitingIds.has(toast.id)}
                onDismiss={dismissToast}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeNotification;
