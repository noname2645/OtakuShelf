import React from 'react'; 
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Low-spec detection: add `low-spec` class when device has low memory or CPUs
try {
  const isReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const deviceMemory = typeof navigator !== 'undefined' && navigator.deviceMemory ? navigator.deviceMemory : undefined;
  const hwConcurrency = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : undefined;
  const lowSpec = isReducedMotion || (deviceMemory !== undefined && deviceMemory < 1.5) || (hwConcurrency !== undefined && hwConcurrency <= 2);
  if (lowSpec && typeof document !== 'undefined') {
    document.documentElement.classList.add('low-spec');
  }
} catch (err) {
  // ignore
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
