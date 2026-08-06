import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

import Home from "../Frontend/components/home.jsx";
import { AuthProvider } from "../Frontend/components/AuthContext.jsx";
import { ListStatusProvider } from "../Frontend/components/ListStatusContext.jsx";
import BadgeNotification from "../Frontend/components/BadgeNotification.jsx";
import { PageLoaderProvider, usePageLoader } from "../Frontend/components/PageLoaderContext.jsx";
import PageLoader from "../Frontend/components/PageLoader.jsx";

const List = lazy(() => import("../Frontend/components/list.jsx"));
const Login = lazy(() => import("../Frontend/components/login.jsx"));
const Register = lazy(() => import("../Frontend/components/register.jsx"));
const AdvancedSearch = lazy(() => import("../Frontend/components/advancedsearch.jsx"));
const Profile = lazy(() => import("../Frontend/components/profile.jsx"));
const ProfileScreen = lazy(() => import("../Frontend/components/profilescreen.jsx"));
const AIPage = lazy(() => import("../Frontend/components/aipage.jsx"));
const ForgotPassword = lazy(() => import("../Frontend/components/ForgotPassword.jsx"));
const SettingsPage = lazy(() => import("../Frontend/components/settings.jsx"));
const NotFound = lazy(() => import("../Frontend/components/NotFound.jsx"));
const ServerError = lazy(() => import("../Frontend/components/ServerError.jsx"));
const Offline = lazy(() => import("../Frontend/components/Offline.jsx"));
const OAuthCallback = lazy(() => import("../Frontend/components/OAuthCallback.jsx"));
const PrivacyPolicy = lazy(() => import("../Frontend/components/PrivacyPolicy.jsx"));
const About = lazy(() => import("../Frontend/components/About.jsx"));
const Terms = lazy(() => import("../Frontend/components/Terms.jsx"));
const Contact = lazy(() => import("../Frontend/components/Contact.jsx"));


const API = import.meta.env.VITE_API_BASE_URL;

// Fire-and-forget: wake up the Render server immediately on page load
const wakePing = () => {
  fetch(`${API}/api/ping`, { method: 'GET' }).catch(() => { });
};
wakePing();


const RouteFallback = () => (
  <div style={{
    position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#030712'
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      border: '3px solid rgba(139,92,246,0.2)',
      borderTopColor: '#8b5cf6',
      animation: 'spin 0.8s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

/* ─── Global loader: restarts on route change, unloads when the page is ready ── */
const GlobalLoader = () => {
  const { visible, isLoading, loadKey, hideLoader } = usePageLoader();
  if (!visible) return null;
  return <PageLoader key={loadKey} isLoading={isLoading} onFinish={hideLoader} />;
};

/* ─── Inner app with router hooks ────────────────────────────────────────── */
const AppContent = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/list" element={<List />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/advance" element={<AdvancedSearch />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile-screen/:userId?" element={<ProfileScreen />} />
      <Route path="/ai" element={<AIPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ForgotPassword />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/about" element={<About />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/500" element={<ServerError />} />
      <Route path="/offline" element={<Offline />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

/* ─── Root App ───────────────────────────────────────────────────────────── */
function App() {
  return (
    <AuthProvider>
      <ListStatusProvider>
        <BrowserRouter>
          <PageLoaderProvider>
            <BadgeNotification />
            <GlobalLoader />
            <Suspense fallback={<RouteFallback />}>
              <AppContent />
            </Suspense>
          </PageLoaderProvider>
        </BrowserRouter>
      </ListStatusProvider>
    </AuthProvider>
  );
}

export default App;
