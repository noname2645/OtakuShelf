import React, { lazy, Suspense } from 'react';
import '../Stylesheets/SettingsModal.css';

const SettingsPage = lazy(() => import('./settings.jsx'));

const SettingsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="smodal-overlay">
      <div className="smodal-panel">
        <button className="smodal-close" onClick={onClose} aria-label="Close settings">✕</button>
        <div className="smodal-inner">
          <Suspense fallback={<div className="smodal-loading">Loading settings...</div>}>
            <SettingsPage isModal />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
