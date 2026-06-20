import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './AuthContext';

const BadgeNotification = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [currentBadge, setCurrentBadge] = useState(null);
  const wsRef = useRef(null);

  const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // Manage WebSocket connection globally for notifications
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
            if (data.type === 'BADGES_EARNED' && data.newBadges?.length > 0) {
              setQueue((prev) => [...prev, ...data.newBadges]);
            }
          } catch (e) {
            console.error('Badge WS parse error:', e);
          }
        };

        wsRef.current.onclose = (event) => {
          if (event.code !== 1000) {
            setTimeout(connectWebSocket, 5000);
          }
        };
      } catch (e) {
        console.error('Badge WS setup error:', e);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [user, API]);

  // Process the queue sequentially
  useEffect(() => {
    if (queue.length > 0 && !currentBadge) {
      setCurrentBadge(queue[0]);
    }
  }, [queue, currentBadge]);

  // Handle current badge display duration
  useEffect(() => {
    if (currentBadge) {
      const timer = setTimeout(() => {
        setQueue((prev) => prev.slice(1));
        setCurrentBadge(null);
      }, 5000); // Display each badge for 5 seconds

      return () => clearTimeout(timer);
    }
  }, [currentBadge]);

  return (
    <div style={{ position: 'fixed', bottom: 40, right: 40, zIndex: 99999, pointerEvents: 'none' }}>
      <AnimatePresence>
        {currentBadge && (
          <motion.div
            key={currentBadge.id}
            initial={{ opacity: 0, y: 50, scale: 0.8, rotateX: 45 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${getRarityColor(currentBadge.rarity)}`,
              boxShadow: `0 10px 40px -10px ${getRarityColor(currentBadge.rarity, 0.5)}, inset 0 0 20px ${getRarityColor(currentBadge.rarity, 0.2)}`,
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              width: '340px',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Shimmer effect */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              style={{
                position: 'absolute',
                top: 0, bottom: 0, left: 0, width: '40%',
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`,
                transform: 'skewX(-20deg)',
                zIndex: 0
              }}
            />

            <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))', zIndex: 1 }}>
              {currentBadge.icon}
            </div>
            <div style={{ zIndex: 1 }}>
              <div style={{ fontSize: '0.8rem', color: getRarityColor(currentBadge.rarity), textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '4px' }}>
                New Badge Unlocked!
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '4px' }}>
                {currentBadge.title}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                {currentBadge.description}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper for rarity colors
function getRarityColor(rarity, alpha = 1) {
  const colors = {
    common: `rgba(148, 163, 184, ${alpha})`,
    uncommon: `rgba(74, 222, 128, ${alpha})`,
    rare: `rgba(96, 165, 250, ${alpha})`,
    epic: `rgba(192, 132, 252, ${alpha})`,
    legendary: `rgba(251, 191, 36, ${alpha})`
  };
  return colors[rarity?.toLowerCase()] || colors.common;
}

export default BadgeNotification;
