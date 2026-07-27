import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../Stylesheets/error.css';

const ICONS = {
  404: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="11" y1="8" x2="11" y2="14" />
    </g>
  ),
  500: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </g>
  ),
  offline: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
      <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0122.56 9" />
      <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </g>
  ),
  'empty-list': (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </g>
  ),
};

const DEFAULTS = {
  404: {
    code: '404',
    title: 'Page not found',
    message: 'The page you are looking for does not exist or has been moved.',
    actionLabel: 'Back to Home',
    iconClass: 'icon-404',
  },
  500: {
    code: '500',
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again later.',
    actionLabel: 'Try Again',
    iconClass: 'icon-500',
  },
  offline: {
    code: '',
    title: 'You are offline',
    message: 'Check your internet connection and try again.',
    actionLabel: 'Retry',
    iconClass: 'icon-offline',
  },
  'empty-list': {
    code: '',
    title: 'Nothing here yet',
    message: 'Your list is empty. Start adding anime or import your MyAnimeList.',
    actionLabel: 'Browse Anime',
    iconClass: 'icon-empty',
  },
};

const ErrorPage = ({
  type = '404',
  code,
  title,
  message,
  actionLabel,
  actionLink,
  onAction,
  secondaryAction,
}) => {
  const navigate = useNavigate();
  const defaults = DEFAULTS[type] || DEFAULTS['404'];

  const displayCode = code ?? defaults.code;
  const displayTitle = title ?? defaults.title;
  const displayMessage = message ?? defaults.message;
  const displayActionLabel = actionLabel ?? defaults.actionLabel;
  const displayIconClass = defaults.iconClass;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionLink) {
      navigate(actionLink);
    } else if (type === '500' || type === 'offline') {
      window.location.reload();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="error-page">
      {displayCode && <div className="error-code">{displayCode}</div>}

      <div className={`error-icon ${displayIconClass}`}>
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          {ICONS[type]}
        </svg>
      </div>

      <h1 className="error-title">{displayTitle}</h1>
      <p className="error-message">{displayMessage}</p>

      <div className="error-actions">
        <button className="error-btn error-btn-primary" onClick={handleAction}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {type === '500' || type === 'offline'
              ? <polyline points="23 4 23 10 17 10" />
              : <><polyline points="15 18 9 12 15 6" /></>
            }
          </svg>
          {displayActionLabel}
        </button>

        {secondaryAction && (
          <Link to={secondaryAction.link || '/'} className="error-btn error-btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {secondaryAction.label || 'Go Home'}
          </Link>
        )}

        {!secondaryAction && type === '404' && (
          <Link to="/" className="error-btn error-btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </Link>
        )}
      </div>
    </div>
  );
};

export default ErrorPage;
