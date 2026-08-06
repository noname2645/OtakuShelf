import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import "../Stylesheets/register.css";
import "../Stylesheets/login.css";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import emailIcon from "../images/message.png";
import { usePageLoader } from "./PageLoaderContext.jsx";
import passwordIcon from "../images/key.png";
import googleIcon from "../images/google.png";
import { motion, AnimatePresence } from "framer-motion";
import { useGoogleAuth } from "./useGoogleAuth";

const Register = ({ onRegisterSuccess }) => {
  const { finishLoading } = usePageLoader();
  useEffect(() => { finishLoading(); }, [finishLoading]);
  const [step, setStep] = useState("form"); // 'form' | 'otp'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const { login } = useAuth();
  const API = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();
  const { signInWithGoogle, gisLoading } = useGoogleAuth({
    onError: (msg) => setMessage(msg),
  });

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const validateForm = () => {
    if (!email || !password || !confirmPassword) { setMessage("Please fill in all fields"); return false; }
    if (password !== confirmPassword) { setMessage("Passwords do not match"); return false; }
    if (password.length < 8) { setMessage("Password must be at least 8 characters long"); return false; }
    if (!/[A-Z]/.test(password)) { setMessage("Password must contain at least one uppercase letter"); return false; }
    if (!/[a-z]/.test(password)) { setMessage("Password must contain at least one lowercase letter"); return false; }
    if (!/[0-9]/.test(password)) { setMessage("Password must contain at least one number"); return false; }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) { setMessage("Password must contain at least one special character (!@#$%^&* etc.)"); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setMessage("Please enter a valid email address"); return false; }
    return true;
  };

  // Step 1: send the OTP to the provided email
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    if (!validateForm()) { setIsLoading(false); return; }
    try {
      const res = await axios.post(`${API}/auth/register`, { email, password });
      setMessage(res.data.message);
      setOtp("");
      setStep("otp");
      setResendIn(60);
    } catch (err) {
      console.error("Register error:", err);
      setMessage(err.response?.data?.message || "Error sending verification code");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: verify the OTP and create the account
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setMessage("Please enter the 6-digit verification code"); return; }
    setVerifying(true);
    setMessage("");
    try {
      const res = await axios.post(`${API}/auth/verify-register`, { email, otp });
      if (res.data.data?.user) {
        login(res.data.data.user, res.data.data.accessToken, res.data.data.refreshToken);
        if (onRegisterSuccess) onRegisterSuccess(res.data.data.user);
        navigate("/");
      }
    } catch (err) {
      console.error("Verify error:", err);
      setMessage(err.response?.data?.message || "Invalid verification code");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0 || verifying) return;
    setMessage("");
    try {
      const res = await axios.post(`${API}/auth/resend-register-otp`, { email });
      setMessage(res.data.message);
      setResendIn(60);
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not resend the code");
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithGoogle();
      if (result !== 'redirect') navigate("/");
    } catch (err) {
      if (err.message !== 'Google sign-in timed out') {
        setMessage(err.response?.data?.message || err.message || 'Google sign-up failed');
      }
    }
  };

  const getMessageClass = () => {
    if (!message) return "";
    return message.includes("successful") || message.includes("sent") ? "message message-success" : "message message-error";
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
          <Link to="/" className="reg-back-home">
            <span className="reg-back-arrow">←</span> Home
          </Link>
          <motion.div className="auth-header"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.4 }}
          >
            <h1 className="auth-title">{step === "form" ? "Join AnimeRegistry" : "Verify Your Email"}</h1>
            {step === "otp" && (
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", margin: "8px 0 0" }}>
                Enter the code sent to <strong style={{ color: "#a78bfa" }}>{email}</strong>
              </p>
            )}
          </motion.div>

          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.div
                key="step-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
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
                        id="password" type="password" placeholder="Password (min 8 chars, A-Z, 0-9, symbol)"
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
                      className="login-btn login-btn-primary login-btn-glow"
                      disabled={isLoading}
                      whileTap={!isLoading ? { scale: 0.8 } : {}}
                    >
                      {isLoading ? (
                        <><div className="login-loading-spinner"></div>Sending Code...</>
                      ) : (
                        <><span className="login-btn-text">Register</span><span className="login-btn-arrow">→</span></>
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
                  disabled={isLoading || gisLoading} type="button"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.95, duration: 0.4 }}
                  whileHover={{ scale: 1.02, boxShadow: "0 12px 35px rgba(0,0,0,0.25)" }}
                  whileTap={{ scale: 0.97 }}
                >
                  <img src={googleIcon} alt="Google Icon" />
                  <span className="btn-text">Sign Up With Google</span>
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="step-otp"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <motion.form
                  onSubmit={handleVerifyOtp}
                  className="login-auth-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.35 }}
                >
                  <div className="login-form-group">
                    <input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="login-form-input otp-input"
                      disabled={verifying}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>

                  <motion.button
                    type="submit"
                    className="login-btn login-btn-primary login-btn-glow"
                    disabled={verifying || otp.length !== 6}
                    whileTap={!verifying ? { scale: 0.97 } : {}}
                  >
                    {verifying ? (
                      <><div className="login-loading-spinner"></div>Verifying...</>
                    ) : (
                      <span className="login-btn-text">Verify &amp; Create Account</span>
                    )}
                  </motion.button>

                  <div className="otp-actions">
                    <button
                      type="button"
                      className="otp-resend"
                      onClick={handleResendOtp}
                      disabled={resendIn > 0 || verifying}
                    >
                      {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                    </button>
                    <button
                      type="button"
                      className="otp-back"
                      onClick={() => { setStep("form"); setMessage(""); }}
                      disabled={verifying}
                    >
                      Change email
                    </button>
                  </div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="auth-footer"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.4 }}
          >
            <p className="footer-text">
              Already part of the community ?{" "}
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
