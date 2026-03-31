import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
import ResetPassword from "../Frontend/components/ResetPassword.jsx";
import SettingsPage from "../Frontend/components/settings.jsx";
import AnimeTransitionOverlay from "../Frontend/components/AnimeTransition.jsx";

const API = import.meta.env.VITE_API_BASE_URL;

// Fire-and-forget: wake up the Render server immediately on page load
const wakePing = () => {
  fetch(`${API}/api/ping`, { method: 'GET' }).catch(() => { });
};
wakePing();

/* ─── Page enter/exit animation variants ──────────────────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } },
};

/* ─── Inner app with router hooks ────────────────────────────────────────── */
const AppContent = () => {
  const location = useLocation();

  return (
    <>
      {/* Anime overlay — plays on every route change */}
      <AnimeTransitionOverlay />

      {/* AnimatePresence drives the page enter/exit */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          className="page-motion-wrapper"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/list" element={<List />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/advance" element={<AdvancedSearch />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ai" element={<AIPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

/* ─── Root App ───────────────────────────────────────────────────────────── */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;