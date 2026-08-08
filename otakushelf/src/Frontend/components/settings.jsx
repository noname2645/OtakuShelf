import React, { useState, useEffect } from "react";
import "../Stylesheets/settings.css";
import api from "../api.js";
import { Header } from "../components/header";
import BottomNavBar from "../components/bottom.jsx";
import { useAuth } from "../components/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { usePageLoader } from "./PageLoaderContext.jsx";
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Icon = ({ size = 20, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const KeyIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <circle cx="8" cy="15" r="4" fill="currentColor" opacity="0.15" />
    <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M11 12L19 4M15.5 6.5L17.5 8.5M12.5 9.5L14.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const ShieldIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <path d="M12 2L3 7V12C3 17.25 6.75 22.5 12 24C17.25 22.5 21 17.25 21 12V7L12 2Z" fill="currentColor" opacity="0.15" />
    <path d="M12 2L3 7V12C3 17.25 6.75 22.5 12 24C17.25 22.5 21 17.25 21 12V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const InfoIcon = ({ size = 18, style }) => (
  <Icon size={size} style={style}>
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 11V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="8" r="1" fill="currentColor" />
  </Icon>
);

const DeviceIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <rect x="2" y="4" width="20" height="14" rx="2" fill="currentColor" opacity="0.15" />
    <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9 21H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 18V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </Icon>
);

const LinkIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <path d="M10 14C10.8 15.4 12.4 16.3 14 16.3C16.5 16.3 18.5 14.3 18.5 11.8C18.5 10.2 17.7 8.8 16.5 7.9L18.5 5.9C20.1 7.2 21.2 9.1 21.2 11.4C21.2 15.7 17.7 19.2 13.4 19.2C10.8 19.2 8.5 17.8 7.3 15.6L10 14Z" fill="currentColor" opacity="0.15" />
    <path d="M14 10C13.2 8.6 11.6 7.7 10 7.7C7.5 7.7 5.5 9.7 5.5 12.2C5.5 13.8 6.3 15.2 7.5 16.1L5.5 18.1C3.9 16.8 2.8 14.9 2.8 12.6C2.8 8.3 6.3 4.8 10.6 4.8C13.2 4.8 15.5 6.2 16.7 8.4L14 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const WarningIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <path d="M12 3L2 20H22L12 3Z" fill="currentColor" opacity="0.15" />
    <path d="M12 3L2 20H22L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
  </Icon>
);

const TrashIcon = ({ size = 16, style }) => (
  <Icon size={size} style={style}>
    <path d="M4 7H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9 7V5C9 4.4 9.4 4 10 4H14C14.6 4 15 4.4 15 5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 7L7 20C7 20.6 7.4 21 8 21H16C16.6 21 17 20.6 17 20L18 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const LockOpenIcon = ({ size = 48, style }) => (
  <Icon size={size} style={style}>
    <rect x="4" y="11" width="16" height="10" rx="2" fill="currentColor" opacity="0.15" />
    <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 11V7C8 4.8 9.8 3 12 3C13.2 3 14.3 3.5 15 4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1.5" stroke="currentColor" strokeWidth="1.5" />
  </Icon>
);

const SkullIcon = ({ size = 48, style }) => (
  <Icon size={size} style={style}>
    <path d="M12 2C7 2 3 5.5 3 10C3 13 5 15.5 7.5 16.5V20C7.5 20.6 7.9 21 8.5 21H15.5C16.1 21 16.5 20.6 16.5 20V16.5C19 15.5 21 13 21 10C21 5.5 17 2 12 2Z" fill="currentColor" opacity="0.15" />
    <path d="M12 2C7 2 3 5.5 3 10C3 13 5 15.5 7.5 16.5V20C7.5 20.6 7.9 21 8.5 21H15.5C16.1 21 16.5 20.6 16.5 20V16.5C19 15.5 21 13 21 10C21 5.5 17 2 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="15" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 14H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </Icon>
);

const LanguageIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3.5 9H20.5M3.5 15H20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 3C10 5.5 9 8.5 9 12C9 15.5 10 18.5 12 21C14 18.5 15 15.5 15 12C15 8.5 14 5.5 12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </Icon>
);

const LayoutIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <rect x="4" y="4" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.15" />
    <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.15" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="4" y="14" width="16" height="6" rx="1.5" fill="currentColor" opacity="0.15" />
    <rect x="4" y="14" width="16" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
  </Icon>
);

const SlidersIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <path d="M4 7H13M18 7H20M4 17H9M16 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="15.5" cy="7" r="2.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="11.5" cy="17" r="2.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
  </Icon>
);

const UserIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 21V19C4 16.8 5.8 15 8 15H16C18.2 15 20 16.8 20 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </Icon>
);

const BadgeIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <circle cx="12" cy="10" r="7" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 14L6 21L12 18L18 21L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const PencilIcon = ({ size = 16, style }) => (
  <Icon size={size} style={style}>
    <path d="M17 3L21 7L7.5 20.5L2 22L3.5 16.5L17 3Z" fill="currentColor" opacity="0.15" />
    <path d="M17 3L21 7L7.5 20.5L2 22L3.5 16.5L17 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.5 5.5L18.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </Icon>
);

const EyeIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <path d="M2 12C2 12 5.5 5.5 12 5.5C18.5 5.5 22 12 22 12C22 12 18.5 18.5 12 18.5C5.5 18.5 2 12 2 12Z" fill="currentColor" opacity="0.15" />
    <path d="M2 12C2 12 5.5 5.5 12 5.5C18.5 5.5 22 12 22 12C22 12 18.5 18.5 12 18.5C5.5 18.5 2 12 2 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
  </Icon>
);

const GlobeIcon = ({ size = 22, style }) => (
  <Icon size={size} style={style}>
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 3C14.5 5.5 16 8.5 16 12C16 15.5 14.5 18.5 12 21C9.5 18.5 8 15.5 8 12C8 8.5 9.5 5.5 12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </Icon>
);

const LockIcon = ({ size = 22, style }) => (
  <Icon size={size} style={style}>
    <rect x="4" y="11" width="16" height="10" rx="2" fill="currentColor" opacity="0.15" />
    <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 11V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1.5" stroke="currentColor" strokeWidth="1.5" />
  </Icon>
);

const DownloadIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <path d="M12 3L20 7V17L12 21L4 17V7L12 3Z" fill="currentColor" opacity="0.15" />
    <path d="M12 3L20 7V17L12 21L4 17V7L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 11V16M12 16L9.5 13.5M12 16L14.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const BellIcon = ({ size = 20, style }) => (
  <Icon size={size} style={style}>
    <path d="M18 8C18 6.4 17.4 4.9 16.2 3.8C15 2.6 13.5 2 12 2C10.5 2 9 2.6 7.8 3.8C6.6 4.9 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" fill="currentColor" opacity="0.15" />
    <path d="M18 8C18 6.4 17.4 4.9 16.2 3.8C15 2.6 13.5 2 12 2C10.5 2 9 2.6 7.8 3.8C6.6 4.9 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.7 20C13.5 20.3 13.3 20.5 13 20.7C12.7 20.9 12.4 21 12 21C11.6 21 11.3 20.9 11 20.7C10.7 20.5 10.5 20.3 10.3 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </Icon>
);

const CheckIcon = ({ size = 18, style }) => (
  <Icon size={size} style={style}>
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
    <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const XIcon = ({ size = 18, style }) => (
  <Icon size={size} style={style}>
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
    <path d="M9 9L15 15M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </Icon>
);

const TABS = [
  {
    id: "security", label: "Security & Login",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L3 7V12C3 17.25 6.75 22.5 12 24C17.25 22.5 21 17.25 21 12V7L12 2Z" fill="currentColor" opacity="0.15"/>
      <path d="M12 2L3 7V12C3 17.25 6.75 22.5 12 24C17.25 22.5 21 17.25 21 12V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  },
  {
    id: "preferences", label: "App Preferences",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.15"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M19.4 15C19.2 15.4 19.2 15.8 19.4 16.2L19.5 16.5C19.7 16.9 19.7 17.3 19.5 17.7L18.7 19.4C18.5 19.8 18.1 20 17.7 19.9L17.1 19.7C16.7 19.5 16.2 19.6 15.9 19.9C15.5 20.2 15.4 20.6 15.4 21V22C15.4 22.4 15.1 22.7 14.7 22.8H13.2C12.8 22.8 12.5 22.5 12.4 22.1V21.2C12.3 20.8 12 20.4 11.7 20.2C11.3 19.9 10.9 19.9 10.5 20L9.9 20.2C9.5 20.3 9.1 20.1 9 19.7L8.2 18C8 17.6 8.1 17.1 8.4 16.9L8.7 16.7C9 16.4 9.2 16 9.1 15.6C9 15.2 8.8 14.9 8.5 14.7C8.2 14.5 7.8 14.4 7.4 14.5L6.8 14.6C6.4 14.7 6 14.5 5.8 14.1L5 12.4C4.8 12 5 11.6 5.4 11.4L5.9 11.2C6.3 11 6.5 10.6 6.5 10.2C6.5 9.8 6.3 9.4 6 9.2L5.5 8.9C5.1 8.7 5 8.3 5.1 7.9L6 6.2C6.2 5.8 6.6 5.6 7 5.7L7.6 5.9C8 6 8.4 5.9 8.7 5.6C9 5.3 9.2 4.8 9.1 4.4V3.6C9.1 3.2 9.4 2.8 9.8 2.7H11.3C11.7 2.7 12 3 12.1 3.4V4.3C12.2 4.7 12.5 5.1 12.8 5.3C13.1 5.5 13.6 5.6 14 5.5L14.5 5.3C14.9 5.2 15.3 5.3 15.5 5.7L16.3 7.4C16.5 7.8 16.3 8.2 15.9 8.4L15.4 8.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  },
  {
    id: "profile", label: "Profile",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.15"/>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 21V19C4 16.8 5.8 15 8 15H16C18.2 15 20 16.8 20 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 21V19C4 16.8 5.8 15 8 15H16C18.2 15 20 16.8 20 19V21" fill="currentColor" opacity="0.1"/>
    </svg>
  },
  {
    id: "data", label: "Data & Privacy",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="6" rx="2" fill="currentColor" opacity="0.15"/>
      <rect x="4" y="4" width="16" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="4" y="14" width="16" height="6" rx="2" fill="currentColor" opacity="0.15"/>
      <rect x="4" y="14" width="16" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 7H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 17H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  },
  {
    id: "notifications", label: "Notifications",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 8C18 6.4 17.4 4.9 16.2 3.8C15 2.6 13.5 2 12 2C10.5 2 9 2.6 7.8 3.8C6.6 4.9 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" fill="currentColor" opacity="0.15"/>
      <path d="M18 8C18 6.4 17.4 4.9 16.2 3.8C15 2.6 13.5 2 12 2C10.5 2 9 2.6 7.8 3.8C6.6 4.9 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.7 20C13.5 20.3 13.3 20.5 13 20.7C12.7 20.9 12.4 21 12 21C11.6 21 11.3 20.9 11 20.7C10.7 20.5 10.5 20.3 10.3 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  },
];

const SettingsPage = ({ isModal = false }) => {
  const { user, logout, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE_URL;

  const [activeTab, setActiveTab] = useState("security");
  const [loading, setLoading] = useState(true);
  const { finishLoading } = usePageLoader();
  useEffect(() => {
    if (!isModal && !authLoading && !loading) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          finishLoading();
        });
      });
    }
  }, [isModal, authLoading, loading, finishLoading]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Settings state
  const [settings, setSettings] = useState({
    preferences: {
      titleLanguage: "romaji",
      defaultLayout: "grid",
      nsfwContent: false,
      autoplayTrailers: true,
    },
    notifications: {
      episodeAlerts: true,
      securityEmails: true,
      marketingEmails: false,
    },
    privacy: {
      profileVisibility: "public",
    },
  });

  // Security state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);


  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaTokenInput, setMfaTokenInput] = useState("");
  const [mfaPasswordInput, setMfaPasswordInput] = useState("");
  const [showMfaDisableModal, setShowMfaDisableModal] = useState(false);

  const [securityOtpInput, setSecurityOtpInput] = useState("");
  const [securityStep, setSecurityStep] = useState("password"); // password or otp
  const [actionLoading, setActionLoading] = useState(false);

  const userId = user?._id || user?.id;

  // Show toast
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
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
          setSettings((prev) => ({
            preferences: { ...prev.preferences, ...data.preferences },
            notifications: { ...prev.notifications, ...data.notifications },
            privacy: { ...prev.privacy, ...data.privacy },
          }));
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
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
      showToast("Settings saved!");
      refreshProfile(); // update context globally
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to save settings",
        "error",
      );
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
      return showToast("New passwords do not match", "error");
    }
    if (passwordForm.newPassword.length < 6) {
      return showToast("Password must be at least 6 characters", "error");
    }
    setSaving(true);
    try {
      await api.put(`${API}/auth/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showToast("Password changed successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to change password",
        "error",
      );
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
      showToast("Failed to initialize MFA setup", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyMfa = async () => {
    setSaving(true);
    try {
      await api.post(`${API}/api/mfa/verify/${userId}`, {
        token: mfaTokenInput,
      });
      showToast("2FA successfully enabled!");
      refreshProfile();
      setMfaSetup(null);
      setMfaTokenInput("");
    } catch (err) {
      showToast(err.response?.data?.message || "Invalid 2FA code", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDisableOtp = async () => {
    if (!mfaPasswordInput && user?.authType === "local")
      return showToast("Password required", "error");
    setActionLoading(true);
    try {
      await api.post(`${API}/api/auth/request-security-otp/${userId}`, {
        action: "mfa_disable",
        password: mfaPasswordInput,
      });
      showToast("Verification code sent to your email");
      setSecurityStep("otp");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to send verification code",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!securityOtpInput)
      return showToast("Verification code required", "error");
    setSaving(true);
    try {
      await api.post(`${API}/api/mfa/disable/${userId}`, {
        otp: securityOtpInput,
      });
      showToast("2FA has been disabled");
      refreshProfile();
      setShowMfaDisableModal(false);
      setMfaPasswordInput("");
      setSecurityOtpInput("");
      setSecurityStep("password");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to disable 2FA",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete account
  const handleRequestDeleteOtp = async () => {
    if (!deleteConfirm && user?.authType === "local")
      return showToast("Password required", "error");
    setActionLoading(true);
    try {
      await api.post(`${API}/api/auth/request-security-otp/${userId}`, {
        action: "delete_account",
        password: deleteConfirm,
      });
      showToast("Verification code sent to your email");
      setSecurityStep("otp");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to send verification code",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!securityOtpInput)
      return showToast("Verification code required", "error");
    setSaving(true);
    try {
      await api.delete(`${API}/auth/delete-account`, {
        data: {
          otp: securityOtpInput,
          password: deleteConfirm,
        },
      });
      showToast("Account deleted. Goodbye...");
      setTimeout(() => logout(), 1500);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to delete account",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // Export data
  const handleExportData = async () => {
    try {
      const response = await api.get(`${API}/api/settings/${userId}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `animeregistry_export_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("Data exported successfully!");
    } catch (err) {
      showToast("Failed to export data", "error");
    }
  };

  if (!user) {
    return (
      <>
        <Header showSearch={false} />
        <BottomNavBar />
        <div className="settings-page">
          <div className="settings-not-logged-in">
            <div className="settings-nli-icon" style={{ color: "#ff8c1a" }}><LockIcon size={64} /></div>
            <h2>Please log in to access settings</h2>
            <Link to="/login" className="settings-login-btn">
              Go to Login
            </Link>
          </div>
        </div>
      </>
    );
  }

  const renderToggle = (category, key, label, description) => (
    <div className="settings-toggle-row" key={key}>
      <div className="settings-toggle-info">
        <span className="settings-toggle-label">{label}</span>
        {description && (
          <span className="settings-toggle-desc">{description}</span>
        )}
      </div>
      <button
        className={`settings-toggle-switch ${settings[category][key] ? "active" : ""}`}
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
          <span className="settings-card-icon"><KeyIcon /></span>
          <h3>Change Password</h3>
        </div>
        {user?.authType === "google" ? (
          <div className="settings-info-banner">
            <span className="info-icon"><InfoIcon /></span>
            Your account uses Google Sign-In. Password changes are managed
            through your Google account.
          </div>
        ) : (
          <form
            className="settings-password-form"
            onSubmit={handleChangePassword}
          >
            <div className="settings-input-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    currentPassword: e.target.value,
                  }))
                }
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="settings-input-group">
              <label>New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    newPassword: e.target.value,
                  }))
                }
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
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Confirm new password"
                required
              />
            </div>
            <button
              type="submit"
              className="settings-btn-primary"
              disabled={saving}
            >
              {saving ? "Changing..." : "Update Password"}
              <ArrowIcon />
            </button>
          </form>
        )}
      </div>

      {/* Two-Factor Authentication (MFA) */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon"><ShieldIcon /></span>
          <h3>Two-Factor Authentication</h3>
        </div>
        {user?.authType === "google" ? (
          <div className="settings-info-banner">
            <span className="info-icon"><InfoIcon /></span>
            Your account uses Google Sign-In. Two-factor authentication and
            security settings are managed through your Google account.
          </div>
        ) : (
          <>
            <p
              className="settings-card-desc"
              style={{ marginBottom: 0, paddingBottom: "20px" }}
            >
              Protect your account with an additional layer of security using an
              authenticator app.
            </p>

            {user?.isMfaEnabled ? (
              <div className="mfa-status mfa-enabled">
                <span
                  className="mfa-badge"
                  style={{ color: "#10b981", fontWeight: "bold" }}
                >
                  ✓ 2FA is Currently Enabled
                </span>
                <p style={{ marginTop: "10px" }}>
                  Your account is protected. You will be asked for an
                  authenticator code when signing in.
                </p>
                <button
                  className="settings-btn-danger-outline"
                  onClick={() => setShowMfaDisableModal(true)}
                  style={{ marginTop: "10px" }}
                >
                  Disable 2FA
                </button>
              </div>
            ) : (
              <div className="mfa-status mfa-disabled">
                {!mfaSetup ? (
                  <div style={{ padding: "4px 4px 24px 4px" }}>
                    <button
                      className="settings-btn-primary"
                      onClick={handleSetupMfa}
                      disabled={saving}
                    >
                      {saving ? "Setting up..." : "Setup Authenticator App"}
                      <ArrowIcon />
                    </button>
                  </div>
                ) : (
                  <div
                    className="mfa-setup-flow"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      padding: "15px",
                      borderRadius: "8px",
                      marginTop: "10px",
                    }}
                  >
                    <ol style={{ marginLeft: "20px", marginBottom: "15px" }}>
                      <li>
                        Scan the QR code with your authenticator app (Google
                        Authenticator, Authy, etc)
                      </li>
                      <li>Enter the 6-digit code generated by the app below</li>
                    </ol>
                    <div
                      style={{
                        display: "flex",
                        gap: "20px",
                        alignItems: "center",
                        marginBottom: "15px",
                      }}
                    >
                      <img
                        src={mfaSetup.qrCodeUrl}
                        alt="MFA QR Code"
                        style={{
                          width: "150px",
                          height: "150px",
                          borderRadius: "8px",
                          border: "2px solid rgba(255, 255, 255, 0.15)",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            opacity: 0.7,
                            fontSize: "0.9rem",
                            display: "block",
                            marginBottom: "8px",
                          }}
                        >
                          Manual Setup Key:
                        </span>
                        <div
                          style={{
                            letterSpacing: "1px",
                            userSelect: "all",
                            fontFamily: "monospace",
                            background: "rgba(255, 255, 255, 0.05)",
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            wordBreak: "break-all",
                            lineHeight: "1.5",
                            fontSize: "0.95rem",
                          }}
                        >
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
                        style={{ letterSpacing: "2px", fontSize: "1.2rem" }}
                      />
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "10px",
                        }}
                      >
                        <button
                          className="settings-btn-primary"
                          onClick={handleVerifyMfa}
                          disabled={saving || mfaTokenInput.length !== 6}
                        >
                          Verify & Enable
                          <ArrowIcon />
                        </button>
                        <button
                          className="settings-btn-ghost"
                          onClick={() => {
                            setMfaSetup(null);
                            setMfaTokenInput("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Active Sessions */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon"><DeviceIcon /></span>
          <h3>Active Sessions</h3>
        </div>
        <p className="settings-card-desc">
          Manage your login sessions. Refresh tokens are valid for 7 days.
        </p>
        <div className="settings-sessions-list">
          <div className="settings-session-item">
            <div className="session-device-icon"><KeyIcon size={22} /></div>
            <div className="session-info">
              <span className="session-name">Refresh Token</span>
              <span className="session-expires">
                Your session stays active for 7 days. Revoking tokens will require you to sign in again.
              </span>
            </div>
          </div>
        </div>
        <button
          className="settings-btn-danger-outline"
          onClick={async () => {
            try {
              await api.post(`${API}/api/settings/${userId}/revoke-tokens`);
              showToast("All tokens revoked");
              logout();
            } catch {
              showToast("Failed to revoke tokens", "error");
            }
          }}
          style={{ marginTop: "12px" }}
        >
          <KeyIcon size={16} /> Revoke All Tokens
        </button>
      </div>

      {/* Connected Accounts */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon"><LinkIcon /></span>
          <h3>Connected Accounts</h3>
        </div>
        <div className="settings-connected-item">
          <div className="connected-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          <div className="connected-info">
            <span className="connected-name">Google</span>
            <span className="connected-status">
              {user?.authType === "google" ? "Connected" : "Not Connected"}
            </span>
          </div>
          <span
            className={`connected-badge ${user?.authType === "google" ? "connected" : ""}`}
          >
            {user?.authType === "google" ? "✓ Linked" : "Not Linked"}
          </span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-card settings-danger-card">
        <div className="settings-card-header">
          <span className="settings-card-icon"><WarningIcon /></span>
          <h3>Danger Zone</h3>
        </div>
        <p className="settings-card-desc">
          Once you delete your account, there is no going back. All your anime
          lists, stats, and data will be permanently removed.
        </p>
        <button
          className="settings-btn-danger"
          onClick={() => setShowDeleteModal(true)}
        >
          <TrashIcon size={16} /> Delete My Account
        </button>
      </div>

      {/* MFA Disable Modal */}
      {showMfaDisableModal && (
        <div
          className="settings-modal-overlay"
          onClick={() => {
            setShowMfaDisableModal(false);
            setSecurityStep("password");
            setSecurityOtpInput("");
          }}
        >
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-icon" style={{ color: "#ff8c1a" }}><LockOpenIcon /></div>
            <h3>Disable Two-Factor Auth?</h3>
            <p>
              Disabling 2FA will make your account less secure. This requires a
              2-step verification.
            </p>

            {securityStep === "password" ? (
              <>
                {user?.authType === "local" && (
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
                    disabled={
                      actionLoading ||
                      (user?.authType === "local" && !mfaPasswordInput)
                    }
                    onClick={handleRequestDisableOtp}
                  >
                    {actionLoading
                      ? "Sending code..."
                      : "Send Verification Code"}
                    <ArrowIcon />
                  </button>
                  <button
                    className="settings-btn-ghost"
                    onClick={() => setShowMfaDisableModal(false)}
                  >
                    Cancel
                  </button>
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
                    style={{
                      letterSpacing: "4px",
                      textAlign: "center",
                      fontSize: "1.2rem",
                    }}
                  />
                </div>
                <div className="settings-modal-actions">
                  <button
                    className="settings-btn-danger"
                    disabled={saving || securityOtpInput.length !== 6}
                    onClick={handleDisableMfa}
                  >
                    {saving ? "Disabling..." : "Confirm Disable 2FA"}
                  </button>
                  <button
                    className="settings-btn-ghost"
                    onClick={() => setSecurityStep("password")}
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div
          className="settings-modal-overlay"
          onClick={() => {
            setShowDeleteModal(false);
            setSecurityStep("password");
            setSecurityOtpInput("");
          }}
        >
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-icon" style={{ color: "#fca5a5" }}><SkullIcon /></div>
            <h3>Delete Account Forever?</h3>
            <p>
              This will permanently erase all your data. This requires a 2-step
              verification.
            </p>

            {securityStep === "password" ? (
              <>
                {user?.authType === "local" && (
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
                    disabled={
                      actionLoading ||
                      (user?.authType === "local" && !deleteConfirm)
                    }
                    onClick={handleRequestDeleteOtp}
                  >
                    {actionLoading
                      ? "Sending code..."
                      : "Send Verification Code"}
                    <ArrowIcon />
                  </button>
                  <button
                    className="settings-btn-ghost"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
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
                    style={{
                      letterSpacing: "4px",
                      textAlign: "center",
                      fontSize: "1.2rem",
                    }}
                  />
                </div>
                <div className="settings-modal-actions">
                  <button
                    className="settings-btn-danger"
                    disabled={saving || securityOtpInput.length !== 6}
                    onClick={handleDeleteAccount}
                  >
                    {saving
                      ? "Delete Everything"
                      : "Confirm Permanent Deletion"}
                  </button>
                  <button
                    className="settings-btn-ghost"
                    onClick={() => setSecurityStep("password")}
                  >
                    Back
                  </button>
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
          <span className="settings-card-icon"><LanguageIcon /></span>
          <h3>Title Language</h3>
        </div>
        <p className="settings-card-desc">
          Choose how anime titles are displayed across the site.
        </p>
        <div className="settings-option-pills">
          {[
            { value: "romaji", label: "Romaji", example: "Shingeki no Kyojin" },
            { value: "english", label: "English", example: "Attack on Titan" },
            { value: "native", label: "Native", example: "進撃の巨人" },
          ].map((opt) => (
            <button
              key={opt.value}
              className={`settings-pill ${settings.preferences.titleLanguage === opt.value ? "active" : ""}`}
              onClick={() =>
                handleSelect("preferences", "titleLanguage", opt.value)
              }
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
          <span className="settings-card-icon"><LayoutIcon /></span>
          <h3>Default Layout</h3>
        </div>
        <p className="settings-card-desc">
          Choose your preferred viewing layout for anime lists.
        </p>
        <div className="settings-layout-options">
          <button
            className={`settings-layout-btn ${settings.preferences.defaultLayout === "grid" ? "active" : ""}`}
            onClick={() => handleSelect("preferences", "defaultLayout", "grid")}
          >
            <div className="layout-preview grid-preview">
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
            </div>
            <span>Grid View</span>
          </button>
          <button
            className={`settings-layout-btn ${settings.preferences.defaultLayout === "list" ? "active" : ""}`}
            onClick={() => handleSelect("preferences", "defaultLayout", "list")}
          >
            <div className="layout-preview list-preview">
              <div />
              <div />
              <div />
            </div>
            <span>List View</span>
          </button>
        </div>
      </div>

      {/* Toggles */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon"><SlidersIcon /></span>
          <h3>Display Preferences</h3>
        </div>
        {renderToggle(
          "preferences",
          "autoplayTrailers",
          "Autoplay Trailers",
          "Automatically play hero trailers on the homepage",
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="settings-section">
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon"><UserIcon /></span>
          <h3>Profile Information</h3>
        </div>
        <p className="settings-card-desc">
          Manage your profile picture, banner, bio, and display name from the{" "}
          <Link to="/profile" className="settings-inline-link">
            Profile page
          </Link>
          .
        </p>
        <div className="settings-profile-preview">
          <div className="settings-profile-avatar">
            {user?.photo ? (
              <img src={user.photo} alt="Avatar" />
            ) : (
              <div className="settings-avatar-placeholder">
                {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="settings-profile-info">
            <span className="settings-profile-name">
              {user?.name || "Anime Lover"}
            </span>
            <span className="settings-profile-email">{user?.email}</span>
          </div>
        </div>
        <Link to="/profile" className="settings-btn-secondary">
          <PencilIcon size={16} /> Go to Profile Page
        </Link>
      </div>

      {/* Auth Type Info */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon"><BadgeIcon /></span>
          <h3>Account Type</h3>
        </div>
        <div className="settings-account-type">
          <div className="account-type-badge">
            {user?.authType === "google"
              ? "🔵 Google Account"
              : "🟢 Local Account"}
          </div>
          <p className="settings-card-desc">
            {user?.authType === "google"
              ? "You signed up using Google OAuth. Your password and security settings are managed by Google."
              : "You created a local account with email and password. You can change your password in the Security tab."}
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
          <span className="settings-card-icon"><EyeIcon /></span>
          <h3>Profile Visibility</h3>
        </div>
        <p className="settings-card-desc">
          Control who can see your anime list and profile information.
        </p>
        <div className="settings-option-pills">
          <button
            className={`settings-pill ${settings.privacy.profileVisibility === "public" ? "active" : ""}`}
            onClick={() =>
              handleSelect("privacy", "profileVisibility", "public")
            }
          >
            <span className="pill-icon"><GlobeIcon /></span>
            <span className="pill-label">Public</span>
            <span className="pill-example">Anyone can view your profile</span>
          </button>
          <button
            className={`settings-pill ${settings.privacy.profileVisibility === "private" ? "active" : ""}`}
            onClick={() =>
              handleSelect("privacy", "profileVisibility", "private")
            }
          >
            <span className="pill-icon"><LockIcon /></span>
            <span className="pill-label">Private</span>
            <span className="pill-example">Only you can see your data</span>
          </button>
        </div>
      </div>

      {/* Export Data */}
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon"><DownloadIcon /></span>
          <h3>Export Your Data</h3>
        </div>
        <p className="settings-card-desc">
          Download a complete backup of your anime lists, profile information,
          and stats as a JSON file.
        </p>
        <button className="settings-btn-primary" onClick={handleExportData}>
          <DownloadIcon size={16} /> Download My Data
          <ArrowIcon />
        </button>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="settings-section">
      <div className="settings-card">
        <div className="settings-card-header">
          <span className="settings-card-icon"><BellIcon /></span>
          <h3>Email Notifications</h3>
        </div>
        <p className="settings-card-desc">
          Control which emails you receive from AnimeRegistry.
        </p>
        {renderToggle(
          "notifications",
          "episodeAlerts",
          "Episode Alerts",
          "Get notified when a new episode drops for anime on your Watching list",
        )}
        {renderToggle(
          "notifications",
          "securityEmails",
          "Security Emails",
          "Receive alerts for password changes, login from new devices, etc.",
        )}
        {renderToggle(
          "notifications",
          "marketingEmails",
          "Product Updates",
          "Stay in the loop about new features and site updates",
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "security":
        return renderSecurity();
      case "preferences":
        return renderPreferences();
      case "profile":
        return renderProfile();
      case "data":
        return renderData();
      case "notifications":
        return renderNotifications();
      default:
        return null;
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
      {!isModal && <Header showSearch={false} />}
      {!isModal && <BottomNavBar />}
      <div className={`settings-page${isModal ? " settings-page--modal" : ""}`}>
        {/* Toast */}
        {toast.show && (
          <div className={`settings-toast ${toast.type}`}>
            <span style={{ color: toast.type === "success" ? "#6ee7b7" : "#fca5a5" }}>
              {toast.type === "success" ? <CheckIcon /> : <XIcon />}
            </span>
            {toast.message}
          </div>
        )}

        <div className="settings-container">
          {/* Page Header */}
          <div className="settings-page-header">
            <h1 className="settings-page-title">Settings</h1>
          </div>

          <div className="settings-layout">
            {/* Sidebar */}
            <nav className="settings-sidebar">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`settings-nav-item ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="nav-icon-img">{tab.icon}</span>
                  <span className="nav-label2">{tab.label}</span>
                  {activeTab === tab.id && <span className="nav-indicator" />}
                </button>
              ))}
            </nav>

            {/* Content */}
            <main className="settings-content">{renderTabContent()}</main>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
