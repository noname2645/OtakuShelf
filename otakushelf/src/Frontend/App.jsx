import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

import Home from "../Frontend/components/home.jsx";
import List from "../Frontend/components/list.jsx";
import Login from "../Frontend/components/login.jsx";
import Register from "../Frontend/components/register.jsx";
import { AuthProvider } from "../Frontend/components/AuthContext.jsx";
import AdvancedSearch from "../Frontend/components/advancedsearch.jsx";
import Profile from "../Frontend/components/profile.jsx";
import AIPage from "../Frontend/components/aipage.jsx";
import ForgotPassword from "../Frontend/components/ForgotPassword.jsx";
import SettingsPage from "../Frontend/components/settings.jsx";


const API = import.meta.env.VITE_API_BASE_URL;

// Fire-and-forget: wake up the Render server immediately on page load
const wakePing = () => {
  fetch(`${API}/api/ping`, { method: 'GET' }).catch(() => { });
};
wakePing();



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
      <Route path="/ai" element={<AIPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ForgotPassword />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
};

import BadgeNotification from "../Frontend/components/BadgeNotification.jsx";

/* ─── Root App ───────────────────────────────────────────────────────────── */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <BadgeNotification />
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;