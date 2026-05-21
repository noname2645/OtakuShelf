import React from 'react';
import SettingsPage from './settings.jsx';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="smodal-overlay">
      <div className="smodal-panel">
        <button className="smodal-close" onClick={onClose} aria-label="Close settings">✕</button>
        <div className="smodal-inner">
          <SettingsPage isModal />
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
