import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import "../Stylesheets/login.css";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const API = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    if (!email || !password) { setMessage("Please fill in all fields"); setIsLoading(false); return; }
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
      setMessage(res.data.message);
      if (res.data.user) {
        login(res.data.user, res.data.token);
        setEmail(""); setPassword("");
        navigate("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage(err.response?.data?.message || "Error logging in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => { window.location.href = `${API}/auth/google`; };

  const getMessageClass = () => {
    if (!message) return "";
    return message.includes("successful") ? "login-message login-message-success" : "login-message login-message-error";
  };

  // Animation variants
  const formVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.45 } }
  };
  const fieldVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: "easeOut" } }
  };

  return (
    <div className="login-container">
      {/* Animated Background */}
      <div className="login-bg-elements">
        <motion.div className="login-bg-circle login-bg-circle-1"
          animate={{ y: [0, -22, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div className="login-bg-circle login-bg-circle-2"
          animate={{ y: [0, 18, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div className="login-bg-circle login-bg-circle-3"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div className="login-anime-icon login-anime-icon-1"
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        >🎬</motion.div>
        <motion.div className="login-anime-icon login-anime-icon-2"
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        >🍥</motion.div>
        <motion.div className="login-anime-icon login-anime-icon-3"
          animate={{ y: [0, -15, 0], x: [0, 15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 10 }}
        >🎭</motion.div>
      </div>

      {/* Animated toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            className={getMessageClass()}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card entrance */}
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 55, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Floating icon */}
        <motion.div className="login-card-header"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
        >
          <div className="login-card-icon">🎭</div>
          <div className="login-card-glow"></div>
        </motion.div>

        <motion.div className="login-auth-header"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.4 }}
        >
          <h1 className="login-auth-title">Welcome Back</h1>
        </motion.div>

        {/* Staggered form */}
        <motion.form
          onSubmit={handleLogin}
          className="login-auth-form"
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="login-form-group" variants={fieldVariants}>
            <div className="login-input-with-icon">
              <span className="login-input-icon">✉️</span>
              <input
                type="email" placeholder="Enter your email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="login-form-input" disabled={isLoading} required
              />
            </div>
          </motion.div>

          <motion.div className="login-form-group" variants={fieldVariants}>
            <div className="login-input-with-icon">
              <span className="login-input-icon">🔒</span>
              <input
                type="password" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="login-form-input" disabled={isLoading} required
              />
            </div>
            {/* Forgot password link */}
            <div style={{ textAlign: "right", marginTop: "6px" }}>
              <Link to="/forgot-password" style={{ fontSize: "13px", color: "rgba(167,139,250,0.85)", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "#ec4899"}
                onMouseLeave={e => e.target.style.color = "rgba(167,139,250,0.85)"}
              >
                Forgot password?
              </Link>
            </div>
          </motion.div>

          <motion.div variants={fieldVariants}>
            <motion.button
              type="submit"
              className="login-btn login-btn-primary login-btn-glow"
              disabled={isLoading}
              whileHover={!isLoading ? { scale: 1.025, boxShadow: "0 16px 40px rgba(102,126,234,0.65)" } : {}}
              whileTap={!isLoading ? { scale: 0.97 } : {}}
            >
              {isLoading ? (
                <><div className="login-loading-spinner"></div>Signing In...</>
              ) : (
                <><span className="login-btn-text">Enter World</span><span className="login-btn-arrow">→</span></>
              )}
            </motion.button>
          </motion.div>
        </motion.form>

        <motion.div className="login-divider"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.88, duration: 0.4 }}
        >
          <span className="login-divider-text">or continue with</span>
        </motion.div>

        <motion.button
          onClick={handleGoogleLogin} className="login-btn login-btn-modern"
          disabled={isLoading} type="button"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.4 }}
          whileHover={{ scale: 1.02, boxShadow: "0 12px 35px rgba(0,0,0,0.25)" }}
          whileTap={{ scale: 0.97 }}
        >
          <svg className="login-google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="login-btn-text">Sign in with Google</span>
        </motion.button>

        <motion.div className="login-auth-footer"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.4 }}
        >
          <p className="login-footer-text">
            New to OtakuShelf?{" "}
            <Link to="/register" className="login-auth-link">
              <span className="login-link-text">Join Now</span>
              <span className="login-link-arrow">→</span>
            </Link>
          </p>
          <p className="login-footer-text" style={{ marginTop: "8px" }}>
            <Link to="/forgot-password" style={{ color: "rgba(167,139,250,0.65)", fontSize: "13px", textDecoration: "none" }}>
              Forgot your password?
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;