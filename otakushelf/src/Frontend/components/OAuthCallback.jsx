import React from 'react';

const OAuthCallback = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      background: '#030712',
      color: '#fff',
      fontFamily: "'Outfit', sans-serif",
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: '50%',
        border: '3px solid rgba(255, 255, 255, 0.15)',
        borderTopColor: '#FFD700',
        animation: 'ots-spin 0.8s linear infinite',
      }}
    />
    <style>{`@keyframes ots-spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ margin: 0, fontSize: '1rem', opacity: 0.85 }}>Completing sign-in...</p>
  </div>
);

export default OAuthCallback;
