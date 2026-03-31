import React, { useState, useEffect } from 'react';
import '../Stylesheets/settings.css';
import api from '../api.js';
import { Header } from '../components/header';
import BottomNavBar from "../components/bottom.jsx";
import { useAuth } from '../components/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const TABS = [
  { id: 'security', label: 'Security & Login', icon: '🔒' },
  { id: 'preferences', label: 'App Preferences', icon: '🎨' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'data', label: 'Data & Privacy', icon: '📥' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
];

const ACCENT_COLORS = [
  { name: 'Coral Red', value: '#ff6b6b' },
  { name: 'Neon Pink', value: '#ec4899' },
  { name: 'Void Purple', value: '#8b5cf6' },
  { name: 'Ocean Blue', value: '#3b82f6' },
  { name: 'Mint Teal', value: '#4ecdc4' },
  { name: 'Cyber Yellow', value: '#fbbf24' },
  { name: 'Sunset Orange', value: '#f97316' },
  { name: 'Emerald', value: '#10b981' },
];

const SettingsPage = () => {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE_URL;

  const [activeTab, setActiveTab] = useState('security');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Settings state
  const [settings, setSettings] = useState({
    preferences: {
      titleLanguage: 'romaji',
      defaultLayout: 'grid',
      nsfwContent: false,
      autoplayTrailers: true,
      accentColor: '#ff6b6b',
    },
    notifications: {
      episodeAlerts: true,
      securityEmails: true,
      marketingEmails: false,
    },
    privacy: {
      profileVisibility: 'public',
    }
  });

  // Security state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessions, setSessions] = useState([]);

  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaTokenInput, setMfaTokenInput] = useState('');
  const [mfaPasswordInput, setMfaPasswordInput] = useState('');
  const [showMfaDisableModal, setShowMfaDisableModal] = useState(false);

  const [securityOtpInput, setSecurityOtpInput] = useState('');
  const [securityStep, setSecurityStep] = useState('password'); // password or otp
  const [actionLoading, setActionLoading] = useState(false);

  const userId = user?._id || user?.id;

  // Show toast
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Load settings
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const loadSettings = async () => {
      try {
        const response = await api.get(`${API}/api/settings/${userId}`);
        const data = response.data.data;
        if (data) {
          setSettings(prev => ({
            preferences: { ...prev.preferences, ...data.preferences },
            notifications: { ...prev.notifications, ...data.notifications },
            privacy: { ...prev.privacy, ...data.privacy },
          }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [userId, API]);

  // Save settings
  const saveSettings = async (category, data) => {
    setSaving(true);
    try {
      await api.put(`${API}/api/settings/${userId}`, { [category]: data });
      showToast('Settings saved!');
      refreshProfile(); // update context globally
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle handler
  const handleToggle = (category, key) => {
    const newSettings = { ...settings };
    newSettings[category][key] = !newSettings[category][key];
    setSettings(newSettings);
    saveSettings(category, { [key]: newSettings[category][key] });
  };

  // Select handler
  const handleSelect = (category, key, value) => {
    const newSettings = { ...settings };
    newSettings[category][key] = value;
    setSettings(newSettings);
    saveSettings(category, { [key]: value });
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return showToast('New passwords do not match', 'error');
    }
    if (passwordForm.newPassword.length < 6) {
      return showToast('Password must be at least 6 characters', 'error');
    }
    setSaving(true);
    try {
      await api.put(`${API}/auth/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showToast('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  // MFA Handlers
  const handleSetupMfa = async () => {
    setSaving(true);
    try {
      const response = await api.get(`${API}/api/mfa/setup/${userId}`);
      setMfaSetup(response.data.data);
    } catch (err) {
      showToast('Failed to initialize MFA setup', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyMfa = async () => {
    setSaving(true);
    try {
      await api.post(`${API}/api/mfa/verify/${userId}`, { token: mfaTokenInput });
      showToast('2FA successfully enabled!');
      refreshProfile();
      setMfaSetup(null);
      setMfaTokenInput('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid 2FA code', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDisableOtp = async () => {
    if (!mfaPasswordInput && user?.authType === 'local') return showToast('Password required', 'error');
    setActionLoading(true);
    try {
      await api.post(`${API}/api/auth/request-security-otp/${userId}`, { 
        action: 'mfa_disable', 
        password: mfaPasswordInput 
      });
      showToast('Verification code sent to your email');
      setSecurityStep('otp');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send verification code', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!securityOtpInput) return showToast('Verification code required', 'error');
    setSaving(true);
    try {
      await api.post(`${API}/api/mfa/disable/${userId}`, { otp: securityOtpInput });
      showToast('2FA has been disabled');
      refreshProfile();
      setShowMfaDisableModal(false);
      setMfaPasswordInput('');
      setSecurityOtpInput('');
      setSecurityStep('password');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to disable 2FA', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete account
  const handleRequestDeleteOtp = async () => {
    if (!deleteConfirm && user?.authType === 'local') return showToast('Password required', 'error');
    setActionLoading(true);
    try {
      await api.post(`${API}/api/auth/request-security-otp/${userId}`, { 
        action: 'delete_account', 
        password: deleteConfirm 
      });
      showToast('Verification code sent to your email');
      setSecurityStep('otp');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send verification code', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!securityOtpInput) return showToast('Verification code required', 'error');
    setSaving(true);
    try {
      await api.delete(`${API}/auth/delete-account`, {
        data: { 
          otp: securityOtpInput,
          password: deleteConfirm
        }
      });
      showToast('Account deleted. Goodbye...');
      setTimeout(() => logout(), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete account', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Load sessions
  const loadSessions = async () => {
    try {
      const response = await api.get(`${API}/api/settings/${userId}/sessions`);
      setSessions(response.data.data?.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  // Logout all other sessions
  const handleLogoutAll = async () => {
    try {
      await api.delete(`${API}/api/settings/${userId}/sessions`);
      showToast('All other sessions terminated');
      loadSessions();
    } catch (err) {
      showToast('Failed to terminate sessions', 'error');
    }
  };

  // Export data
  const handleExportData = async () => {
    try {
      const response = await api.get(`${API}/api/settings/${userId}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `otakushelf_export_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Data exported successfully!');
    } catch (err) {
      showToast('Failed to export data', 'error');
    }
  };

  // Load sessions when security tab is active
  useEffect(() => {
    if (activeTab === 'security' && userId) {
      loadSessions();
    }
  }, [activeTab, userId]);

  if (!user) {
    return (
      <>
        <Header showSearch={false} />
        <BottomNavBar />
        <div className="settings-page">
          <div className="settings-not-logged-in">
            <div className="settings-nli-icon">🔐</div>
            <h2>Please log in to access settings</h2>
            <Link to="/login" className="settings-login-btn">Go to Login</Link>
          </div>
        </div>
      </>
    );
  }

  const renderToggle = (category, key, label, description) => (
    <div className="settings-toggle-row" key={key}>
      <div className="settings-toggle-info">
        <span className="settings-toggle-label">{label}</span>
        {description && <span className="settings-toggle-desc">{description}</span>}
      </div>
      <button
        className={`settings-toggle-switch ${settings[category][key] ? 'active' : ''}`}
        onClick={() => handleToggle(category, key)}
        disabled={saving}
        aria-label={`Toggle ${label}`}
      >
        <span className="settings-toggle-knob" />
      </button>
    </div>
  );

  // ─── TAB CONTENT RENDERERS ─────────────────────────────────────────────

  const renderSecurity = () => (
    <div className="settings-section">
      {/* Change Password */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">🔑</span>
          <h3>Change Password</h3>
        </div>
        {user?.authType === 'google' ? (
          <div className="settings-info-banner">
            <span className="info-icon">ℹ️</span>
            Your account uses Google Sign-In. Password changes are managed through your Google account.
          </div>
        ) : (
          <form className="settings-password-form" onSubmit={handleChangePassword}>
            <div className="settings-input-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="settings-input-group">
              <label>New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            <div className="settings-input-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                required
              />
            </div>
            <button type="submit" className="settings-btn-primary" disabled={saving}>
              {saving ? 'Changing...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>

      {/* Two-Factor Authentication (MFA) */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">🛡️</span>
          <h3>Two-Factor Authentication</h3>
        </div>
        <p className="settings-card-desc" style={{ marginBottom: 0, paddingBottom: '20px' }}>
          Protect your account with an additional layer of security using an authenticator app.
        </p>
        
        {user?.isMfaEnabled ? (
          <div className="mfa-status mfa-enabled">
            <span className="mfa-badge" style={{color: '#10b981', fontWeight: 'bold'}}>✓ 2FA is Currently Enabled</span>
            <p style={{ marginTop: '10px' }}>Your account is protected. You will be asked for an authenticator code when signing in.</p>
            <button className="settings-btn-danger-outline" onClick={() => setShowMfaDisableModal(true)} style={{marginTop: '10px'}}>
              Disable 2FA
            </button>
          </div>
        ) : (
          <div className="mfa-status mfa-disabled">
            {!mfaSetup ? (
              <div style={{ padding: '4px 4px 24px 4px' }}>
                <button className="settings-btn-primary" onClick={handleSetupMfa} disabled={saving}>
                  {saving ? 'Setting up...' : 'Setup Authenticator App'}
                </button>
              </div>
            ) : (
              <div className="mfa-setup-flow" style={{background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginTop: '10px'}}>
                <ol style={{ marginLeft: '20px', marginBottom: '15px' }}>
                  <li>Scan the QR code with your authenticator app (Google Authenticator, Authy, etc)</li>
                  <li>Enter the 6-digit code generated by the app below</li>
                </ol>
                <div style={{display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px'}}>
                  <img src={mfaSetup.qrCodeUrl} alt="MFA QR Code" style={{width: '150px', height: '150px', borderRadius: '8px', border: '2px solid var(--accent-color)'}} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{opacity: 0.7, fontSize: '0.9rem', display: 'block', marginBottom: '8px'}}>Manual Setup Key:</span>
                    <div style={{
                      letterSpacing: '1px', 
                      userSelect: 'all', 
                      fontFamily: 'monospace',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      wordBreak: 'break-all',
                      lineHeight: '1.5',
                      fontSize: '0.95rem'
                    }}>
                      {mfaSetup.secret}
                    </div>
                  </div>
                </div>
                <div className="settings-input-group">
                  <input 
                    type="text" 
                    placeholder="Enter 6-digit code" 
                    value={mfaTokenInput} 
                    onChange={(e) => setMfaTokenInput(e.target.value)}
                    maxLength={6}
                    style={{letterSpacing: '2px', fontSize: '1.2rem'}}
                  />
                  <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                    <button className="settings-btn-primary" onClick={handleVerifyMfa} disabled={saving || mfaTokenInput.length !== 6}>
                      Verify & Enable
                    </button>
                    <button className="settings-btn-ghost" onClick={() => {setMfaSetup(null); setMfaTokenInput('');}}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">📱</span>
          <h3>Active Sessions</h3>
        </div>
        <p className="settings-card-desc">Manage devices where you're currently logged in.</p>
        <div className="settings-sessions-list">
          {sessions.length > 0 ? sessions.map((session, idx) => (
            <div key={idx} className="settings-session-item">
              <div className="session-device-icon">💻</div>
              <div className="session-info">
                <span className="session-name">Session {idx + 1}</span>
                <span className="session-expires">Expires: {new Date(session.expires).toLocaleDateString()}</span>
              </div>
              {idx === 0 && <span className="session-current-badge">Current</span>}
            </div>
          )) : (
            <div className="settings-empty-sessions">No active sessions found.</div>
          )}
        </div>
        {sessions.length > 1 && (
          <button className="settings-btn-danger-outline" onClick={handleLogoutAll}>
            🚪 Log Out All Other Devices
          </button>
        )}
      </div>

      {/* Connected Accounts */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">🔗</span>
          <h3>Connected Accounts</h3>
        </div>
        <div className="settings-connected-item">
          <div className="connected-icon">
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          </div>
          <div className="connected-info">
            <span className="connected-name">Google</span>
            <span className="connected-status">{user?.authType === 'google' ? 'Connected' : 'Not Connected'}</span>
          </div>
          <span className={`connected-badge ${user?.authType === 'google' ? 'connected' : ''}`}>
            {user?.authType === 'google' ? '✓ Linked' : 'Not Linked'}
          </span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-card settings-danger-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">⚠️</span>
          <h3>Danger Zone</h3>
        </div>
        <p className="settings-card-desc">Once you delete your account, there is no going back. All your anime lists, stats, and data will be permanently removed.</p>
        <button className="settings-btn-danger" onClick={() => setShowDeleteModal(true)}>
          🗑️ Delete My Account
        </button>
      </div>

      {/* MFA Disable Modal */}
      {showMfaDisableModal && (
        <div className="settings-modal-overlay" onClick={() => {setShowMfaDisableModal(false); setSecurityStep('password'); setSecurityOtpInput('');}}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-icon">🔓</div>
            <h3>Disable Two-Factor Auth?</h3>
            <p>Disabling 2FA will make your account less secure. This requires a 2-step verification.</p>
            
            {securityStep === 'password' ? (
              <>
                {user?.authType === 'local' && (
                  <div className="settings-input-group">
                    <label>Confirm your password first</label>
                    <input
                      type="password"
                      value={mfaPasswordInput}
                      onChange={(e) => setMfaPasswordInput(e.target.value)}
                      placeholder="Your password"
                    />
                  </div>
                )}
                <div className="settings-modal-actions">
                  <button 
                    className="settings-btn-primary" 
                    disabled={actionLoading || (user?.authType === 'local' && !mfaPasswordInput)} 
                    onClick={handleRequestDisableOtp}
                  >
                    {actionLoading ? 'Sending code...' : 'Send Verification Code'}
                  </button>
                  <button className="settings-btn-ghost" onClick={() => setShowMfaDisableModal(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="settings-input-group">
                  <label>Enter the 6-digit code sent to {user?.email}</label>
                  <input
                    type="text"
                    value={securityOtpInput}
                    onChange={(e) => setSecurityOtpInput(e.target.value)}
                    placeholder="Enter code"
                    maxLength={6}
                    style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem' }}
                  />
                </div>
                <div className="settings-modal-actions">
                  <button className="settings-btn-danger" disabled={saving || securityOtpInput.length !== 6} onClick={handleDisableMfa}>
                    {saving ? 'Disabling...' : 'Confirm Disable 2FA'}
                  </button>
                  <button className="settings-btn-ghost" onClick={() => setSecurityStep('password')}>Back</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="settings-modal-overlay" onClick={() => {setShowDeleteModal(false); setSecurityStep('password'); setSecurityOtpInput('');}}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-icon">💀</div>
            <h3>Delete Account Forever?</h3>
            <p>This will permanently erase all your data. This requires a 2-step verification.</p>

            {securityStep === 'password' ? (
              <>
                {user?.authType === 'local' && (
                  <div className="settings-input-group">
                    <label>Confirm your password first</label>
                    <input
                      type="password"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="Your password"
                    />
                  </div>
                )}
                <div className="settings-modal-actions">
                  <button 
                    className="settings-btn-danger" 
                    disabled={actionLoading || (user?.authType === 'local' && !deleteConfirm)} 
                    onClick={handleRequestDeleteOtp}
                  >
                    {actionLoading ? 'Sending code...' : 'Send Verification Code'}
                  </button>
                  <button className="settings-btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="settings-input-group">
                  <label>Enter the 6-digit code sent to {user?.email}</label>
                  <input
                    type="text"
                    value={securityOtpInput}
                    onChange={(e) => setSecurityOtpInput(e.target.value)}
                    placeholder="Enter code"
                    maxLength={6}
                    style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem' }}
                  />
                </div>
                <div className="settings-modal-actions">
                  <button className="settings-btn-danger" disabled={saving || securityOtpInput.length !== 6} onClick={handleDeleteAccount}>
                    {saving ? 'Delete Everything' : 'Confirm Permanent Deletion'}
                  </button>
                  <button className="settings-btn-ghost" onClick={() => setSecurityStep('password')}>Back</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderPreferences = () => (
    <div className="settings-section">
      {/* Title Language */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">🌐</span>
          <h3>Title Language</h3>
        </div>
        <p className="settings-card-desc">Choose how anime titles are displayed across the site.</p>
        <div className="settings-option-pills">
          {[
            { value: 'romaji', label: 'Romaji', example: 'Shingeki no Kyojin' },
            { value: 'english', label: 'English', example: 'Attack on Titan' },
            { value: 'native', label: 'Native', example: '進撃の巨人' },
          ].map(opt => (
            <button
              key={opt.value}
              className={`settings-pill ${settings.preferences.titleLanguage === opt.value ? 'active' : ''}`}
              onClick={() => handleSelect('preferences', 'titleLanguage', opt.value)}
            >
              <span className="pill-label">{opt.label}</span>
              <span className="pill-example">{opt.example}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Default Layout */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">📐</span>
          <h3>Default Layout</h3>
        </div>
        <p className="settings-card-desc">Choose your preferred viewing layout for anime lists.</p>
        <div className="settings-layout-options">
          <button
            className={`settings-layout-btn ${settings.preferences.defaultLayout === 'grid' ? 'active' : ''}`}
            onClick={() => handleSelect('preferences', 'defaultLayout', 'grid')}
          >
            <div className="layout-preview grid-preview">
              <div /><div /><div /><div /><div /><div />
            </div>
            <span>Grid View</span>
          </button>
          <button
            className={`settings-layout-btn ${settings.preferences.defaultLayout === 'list' ? 'active' : ''}`}
            onClick={() => handleSelect('preferences', 'defaultLayout', 'list')}
          >
            <div className="layout-preview list-preview">
              <div /><div /><div />
            </div>
            <span>List View</span>
          </button>
        </div>
      </div>

      {/* Toggles */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">⚙️</span>
          <h3>Display Preferences</h3>
        </div>
        {renderToggle('preferences', 'autoplayTrailers', 'Autoplay Trailers', 'Automatically play hero trailers on the homepage')}
        {renderToggle('preferences', 'nsfwContent', 'NSFW Content', 'Show adult/R-18+ content (unblur covers & titles)')}
      </div>

      {/* Accent Color */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">🎨</span>
          <h3>Accent Color</h3>
        </div>
        <p className="settings-card-desc">Personalize the site's accent color to match your vibe.</p>
        <div className="settings-color-grid">
          {ACCENT_COLORS.map(color => (
            <button
              key={color.value}
              className={`settings-color-swatch ${settings.preferences.accentColor === color.value ? 'active' : ''}`}
              style={{ '--swatch-color': color.value }}
              onClick={() => handleSelect('preferences', 'accentColor', color.value)}
              title={color.name}
            >
              {settings.preferences.accentColor === color.value && <span className="swatch-check">✓</span>}
            </button>
          ))}
        </div>
        <div className="settings-color-preview" style={{ '--preview-color': settings.preferences.accentColor }}>
          <span>Preview:</span>
          <button className="color-preview-btn">Sample Button</button>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="settings-section">
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">👤</span>
          <h3>Profile Information</h3>
        </div>
        <p className="settings-card-desc">
          Manage your profile picture, banner, bio, and display name from the{' '}
          <Link to="/profile" className="settings-inline-link">Profile page</Link>.
        </p>
        <div className="settings-profile-preview">
          <div className="settings-profile-avatar">
            {user?.photo ? (
              <img src={user.photo} alt="Avatar" />
            ) : (
              <div className="settings-avatar-placeholder">{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="settings-profile-info">
            <span className="settings-profile-name">{user?.name || 'Anime Lover'}</span>
            <span className="settings-profile-email">{user?.email}</span>
          </div>
        </div>
        <Link to="/profile" className="settings-btn-secondary">
          ✏️ Go to Profile Page
        </Link>
      </div>

      {/* Auth Type Info */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">🛡️</span>
          <h3>Account Type</h3>
        </div>
        <div className="settings-account-type">
          <div className="account-type-badge">
            {user?.authType === 'google' ? '🔵 Google Account' : '🟢 Local Account'}
          </div>
          <p className="settings-card-desc">
            {user?.authType === 'google'
              ? 'You signed up using Google OAuth. Your password and security settings are managed by Google.'
              : 'You created a local account with email and password. You can change your password in the Security tab.'
            }
          </p>
        </div>
      </div>
    </div>
  );

  const renderData = () => (
    <div className="settings-section">
      {/* Profile Visibility */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">👁️</span>
          <h3>Profile Visibility</h3>
        </div>
        <p className="settings-card-desc">Control who can see your anime list and profile information.</p>
        <div className="settings-option-pills">
          <button
            className={`settings-pill ${settings.privacy.profileVisibility === 'public' ? 'active' : ''}`}
            onClick={() => handleSelect('privacy', 'profileVisibility', 'public')}
          >
            <span className="pill-icon">🌍</span>
            <span className="pill-label">Public</span>
            <span className="pill-example">Anyone can view your profile</span>
          </button>
          <button
            className={`settings-pill ${settings.privacy.profileVisibility === 'private' ? 'active' : ''}`}
            onClick={() => handleSelect('privacy', 'profileVisibility', 'private')}
          >
            <span className="pill-icon">🔒</span>
            <span className="pill-label">Private</span>
            <span className="pill-example">Only you can see your data</span>
          </button>
        </div>
      </div>

      {/* Export Data */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">💾</span>
          <h3>Export Your Data</h3>
        </div>
        <p className="settings-card-desc">Download a complete backup of your anime lists, profile information, and stats as a JSON file.</p>
        <button className="settings-btn-primary" onClick={handleExportData}>
          📦 Download My Data
        </button>
      </div>

      {/* Import (Coming Soon) */}
      <div className="settings-card settings-card-dimmed">
        <div className="settings-card-header">
          <span className="settings-card-icon">📤</span>
          <h3>Import from MAL / AniList</h3>
          <span className="settings-badge-coming">Coming Soon</span>
        </div>
        <p className="settings-card-desc">Import your anime library from MyAnimeList or AniList via XML/JSON file upload.</p>
        <button className="settings-btn-secondary" disabled>
          Upload File
        </button>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="settings-section">
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon">🔔</span>
          <h3>Email Notifications</h3>
        </div>
        <p className="settings-card-desc">Control which emails you receive from OtakuShelf.</p>
        {renderToggle('notifications', 'episodeAlerts', 'Episode Alerts', 'Get notified when a new episode drops for anime on your Watching list')}
        {renderToggle('notifications', 'securityEmails', 'Security Emails', 'Receive alerts for password changes, login from new devices, etc.')}
        {renderToggle('notifications', 'marketingEmails', 'Product Updates', 'Stay in the loop about new features and site updates')}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'security': return renderSecurity();
      case 'preferences': return renderPreferences();
      case 'profile': return renderProfile();
      case 'data': return renderData();
      case 'notifications': return renderNotifications();
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <Header showSearch={false} />
        <BottomNavBar />
        <div className="settings-loading">
          <div className="settings-loading-spinner" />
          <p>Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header showSearch={false} />
      <BottomNavBar />
      <div className="settings-page">
        {/* Toast */}
        {toast.show && (
          <div className={`settings-toast ${toast.type}`}>
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            {toast.message}
          </div>
        )}

        <div className="settings-container">
          {/* Page Header */}
          <div className="settings-page-header">
           
            <h1 className="settings-page-title">Settings</h1>
            <p className="settings-page-subtitle">Manage your account, preferences, and privacy</p>
          </div>

          <div className="settings-layout">
            {/* Sidebar */}
            <nav className="settings-sidebar">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="nav-icon">{tab.icon}</span>
                  <span className="nav-label2">{tab.label}</span>
                  {activeTab === tab.id && <span className="nav-indicator" />}
                </button>
              ))}
            </nav>

            {/* Content */}
            <main className="settings-content">
              {renderTabContent()}
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
