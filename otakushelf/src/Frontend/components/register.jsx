import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import "../Stylesheets/register.css";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import emailIcon from "../images/email.png";
import passwordIcon from "../images/password-code.png";
import googleIcon from "../images/google.png";
import { motion, AnimatePresence } from "framer-motion";

const Register = ({ onRegisterSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const validateForm = () => {
    if (!email || !password || !confirmPassword) { setMessage("Please fill in all fields"); return false; }
    if (password !== confirmPassword) { setMessage("Passwords do not match"); return false; }
    if (password.length < 6) { setMessage("Password must be at least 6 characters long"); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setMessage("Please enter a valid email address"); return false; }
    return true;
  };

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    if (!validateForm()) { setIsLoading(false); return; }
    try {
      const res = await axios.post(`${API}/auth/register`, { email, password }, { withCredentials: true });
      setMessage(res.data.message);
      const loginRes = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
      if (loginRes.data.user) {
        login(loginRes.data.user, loginRes.data.token);
        if (onRegisterSuccess) onRegisterSuccess(loginRes.data.user);
        navigate("/");
      }
    } catch (err) {
      console.error("Register/Login error:", err);
      setMessage(err.response?.data?.message || "Error registering user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => { window.location.href = `${API}/auth/google`; };

  const getMessageClass = () => {
    if (!message) return "";
    return message.includes("successful") ? "message message-success" : "message message-error";
  };

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 55, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
  };
  const formVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.45 } }
  };
  const fieldVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: "easeOut" } }
  };

  return (
    <>
      <div className="register-container">
        {/* Animated Background Orbs — replaced CSS keyframes with Framer Motion */}
        <div className="bg-anime-elements">
          <motion.div className="bg-circle bg-circle-1"
            animate={{ y: [0, -22, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div className="bg-circle bg-circle-2"
            animate={{ y: [0, 18, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div className="bg-circle bg-circle-3"
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div className="anime-icon anime-icon-1"
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          >🌸</motion.div>
          <motion.div className="anime-icon anime-icon-2"
            animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          >⚔️</motion.div>
          <motion.div className="anime-icon anime-icon-3"
            animate={{ y: [0, -15, 0], x: [0, 15, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 10 }}
          >🎌</motion.div>
        </div>

        {/* Animated slide-in toast */}
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
          className="register-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Floating emoji header */}
          <motion.div className="card-header"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
          >
            <div className="card-icon">🎬</div>
            <div className="card-glow"></div>
          </motion.div>

          <motion.div className="auth-header"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.4 }}
          >
            <h1 className="auth-title">Join OtakuShelf</h1>
          </motion.div>

          {/* Staggered form */}
          <motion.form
            onSubmit={handleRegister}
            className="auth-form"
            variants={formVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="form-group" variants={fieldVariants}>
              <div className="input-with-icon">
                <span className="input-icon"><img src={emailIcon} alt="Email Icon" /></span>
                <input
                  id="email" type="email" placeholder="Enter your email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="form-input" disabled={isLoading} required
                />
              </div>
            </motion.div>

            <motion.div className="form-group" variants={fieldVariants}>
              <div className="input-with-icon">
                <span className="input-icon"><img src={passwordIcon} alt="Password Icon" /></span>
                <input
                  id="password" type="password" placeholder="Create a password (min 6 characters)"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="form-input" disabled={isLoading} required minLength={6}
                />
              </div>
            </motion.div>

            <motion.div className="form-group" variants={fieldVariants}>
              <div className="input-with-icon">
                <span className="input-icon"><img src={passwordIcon} alt="Confirm Password Icon" /></span>
                <input
                  id="confirmPassword" type="password" placeholder="Confirm your password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input" disabled={isLoading} required
                />
                <div className="input-underline"></div>
              </div>
            </motion.div>

            <motion.div variants={fieldVariants}>
              <motion.button
                type="submit"
                className="btn btn-primary btn-glow"
                disabled={isLoading}
                whileHover={!isLoading ? { scale: 1.025, boxShadow: "0 16px 40px rgba(102,126,234,0.65)" } : {}}
                whileTap={!isLoading ? { scale: 0.97 } : {}}
              >
                {isLoading ? (
                  <><div className="loading-spinner"></div>Creating Your Journey...</>
                ) : (
                  <><span className="btn-text">Begin Adventure</span><span className="btn-arrow">→</span></>
                )}
              </motion.button>
            </motion.div>
          </motion.form>

          <motion.div className="divider"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.88, duration: 0.4 }}
          >
            <span className="divider-text">or continue with</span>
          </motion.div>

          <motion.button
            onClick={handleGoogleSignup} className="google-btn"
            disabled={isLoading} type="button"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.4 }}
            whileHover={{ scale: 1.02, boxShadow: "0 12px 35px rgba(0,0,0,0.25)" }}
            whileTap={{ scale: 0.97 }}
          >
            <img src={googleIcon} alt="Google Icon" />
            <span className="btn-text">Sign Up With Google</span>
          </motion.button>

          <motion.div className="auth-footer"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.4 }}
          >
            <p className="footer-text">
              Already part of the adventure?{" "}
              <Link to="/login" className="auth-link">
                <span className="link-text">Login Here</span>
                <span className="link-arrow">→</span>
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default Register;