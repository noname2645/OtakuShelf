import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../Stylesheets/login.css";

const ForgotPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const API = import.meta.env.VITE_API_BASE_URL;

    // Read token + email from URL — if present, we're in reset mode
    const token = searchParams.get("token");
    const emailFromUrl = searchParams.get("email");
    const isResetMode = !!(token && emailFromUrl);

    // ── Forgot-password state ──────────────────────────────────────────────
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotStatus, setForgotStatus] = useState(null); // null | 'loading' | 'sent' | 'error'
    const [forgotMessage, setForgotMessage] = useState("");

    // ── Reset-password state ───────────────────────────────────────────────
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetStatus, setResetStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [resetMessage, setResetMessage] = useState("");
    const [strength, setStrength] = useState(0); // 0-4

    // Validate token presence on mount (reset mode only)
    useEffect(() => {
        if (isResetMode && (!token || !emailFromUrl)) {
            setResetStatus("error");
            setResetMessage("Invalid reset link. Please request a new one.");
        }
    }, [token, emailFromUrl, isResetMode]);

    // Password strength checker
    useEffect(() => {
        let score = 0;
        if (newPassword.length >= 6) score++;
        if (newPassword.length >= 10) score++;
        if (/[A-Z]/.test(newPassword)) score++;
        if (/[0-9!@#$%^&*]/.test(newPassword)) score++;
        setStrength(score);
    }, [newPassword]);

    const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
    const strengthColor = ["", "#f87171", "#fbbf24", "#34d399", "#8b5cf6"][strength];

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        if (!forgotEmail) { setForgotMessage("Please enter your email."); setForgotStatus("error"); return; }
        setForgotStatus("loading");
        setForgotMessage("");
        try {
            const res = await axios.post(`${API}/auth/forgot-password`, { email: forgotEmail });
            setForgotMessage(res.data.message);
            setForgotStatus("sent");
        } catch (err) {
            setForgotMessage(err.response?.data?.message || "Something went wrong. Try again.");
            setForgotStatus("error");
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setResetMessage("Passwords do not match."); setResetStatus("error"); return;
        }
        if (newPassword.length < 6) {
            setResetMessage("Password must be at least 6 characters."); setResetStatus("error"); return;
        }
        setResetStatus("loading"); setResetMessage("");
        try {
            const res = await axios.post(`${API}/auth/reset-password`, { token, email: emailFromUrl, newPassword });
            setResetMessage(res.data.message);
            setResetStatus("success");
            setTimeout(() => navigate("/login"), 3000);
        } catch (err) {
            setResetMessage(err.response?.data?.message || "Reset failed. The link may have expired.");
            setResetStatus("error");
        }
    };

    // ── Shared background ─────────────────────────────────────────────────
    const Background = () => (
        <div className="login-bg-elements">
            <motion.div className="login-bg-circle login-bg-circle-1"
                animate={{ y: [0, -22, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div className="login-bg-circle login-bg-circle-2"
                animate={{ y: [0, 18, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );

    // ── RESET PASSWORD view ───────────────────────────────────────────────
    if (isResetMode) {
        return (
            <div className="login-container">
                <Background />
                <motion.div
                    className="login-card"
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                >
                    <motion.div className="login-card-header"
                        initial={{ y: -30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                    >
                        <div className="login-card-icon">🛡️</div>
                        <div className="login-card-glow"></div>
                    </motion.div>

                    <motion.div className="login-auth-header"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.38, duration: 0.4 }}
                    >
                        <h1 className="login-auth-title">Set New Password</h1>
                        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", margin: "8px 0 0" }}>
                            Create a strong new password for your account
                        </p>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {resetStatus === "success" ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                style={{ textAlign: "center", padding: "32px 0" }}
                            >
                                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
                                <p style={{ color: "#34d399", fontWeight: 600, fontSize: "16px" }}>{resetMessage}</p>
                                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginTop: "8px" }}>
                                    Redirecting you to login...
                                </p>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="reset-form"
                                onSubmit={handleResetSubmit}
                                className="login-auth-form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.45, duration: 0.4 }}
                            >
                                {/* New Password */}
                                <div className="login-form-group">
                                    <div className="login-input-with-icon">
                                        <span className="login-input-icon">🔒</span>
                                        <input
                                            type="password"
                                            placeholder="New password (min 6 characters)"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="login-form-input"
                                            disabled={resetStatus === "loading"}
                                            required
                                        />
                                    </div>
                                    {/* Strength meter */}
                                    {newPassword.length > 0 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            style={{ marginTop: "8px" }}
                                        >
                                            <div style={{ display: "flex", gap: "4px" }}>
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} style={{
                                                        flex: 1, height: "4px", borderRadius: "2px",
                                                        background: i <= strength ? strengthColor : "rgba(255,255,255,0.1)",
                                                        transition: "background 0.3s"
                                                    }} />
                                                ))}
                                            </div>
                                            <p style={{ fontSize: "12px", color: strengthColor, marginTop: "4px", textAlign: "right" }}>
                                                {strengthLabel}
                                            </p>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="login-form-group">
                                    <div className="login-input-with-icon">
                                        <span className="login-input-icon">🔒</span>
                                        <input
                                            type="password"
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="login-form-input"
                                            disabled={resetStatus === "loading"}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Error */}
                                <AnimatePresence>
                                    {resetStatus === "error" && resetMessage && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            style={{ color: "#f87171", fontSize: "13px", margin: "-4px 0 8px", textAlign: "center" }}
                                        >
                                            {resetMessage}
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                <motion.button
                                    type="submit"
                                    className="login-btn login-btn-primary login-btn-glow"
                                    disabled={resetStatus === "loading" || !token}
                                    whileHover={resetStatus !== "loading" ? { scale: 1.025, boxShadow: "0 16px 40px rgba(139,92,246,0.65)" } : {}}
                                    whileTap={resetStatus !== "loading" ? { scale: 0.97 } : {}}
                                >
                                    {resetStatus === "loading" ? (
                                        <><div className="login-loading-spinner"></div>Resetting...</>
                                    ) : "Reset Password"}
                                </motion.button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <motion.div className="login-auth-footer"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.4 }}
                    >
                        <p className="login-footer-text">
                            <Link to="/login" className="login-auth-link">← Back to Login</Link>
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    // ── FORGOT PASSWORD view (default) ────────────────────────────────────
    return (
        <div className="login-container">
            <Background />
            <motion.div
                className="login-card"
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
            >
                <motion.div className="login-card-header"
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                >
                    <div className="login-card-icon">🔑</div>
                    <div className="login-card-glow"></div>
                </motion.div>

                <motion.div className="login-auth-header"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38, duration: 0.4 }}
                >
                    <h1 className="login-auth-title">Forgot Password</h1>
                    <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", margin: "8px 0 0" }}>
                        Enter your email and we'll send a reset link
                    </p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {forgotStatus === "sent" ? (
                        <motion.div
                            key="sent"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ textAlign: "center", padding: "32px 0" }}
                        >
                            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📬</div>
                            <p style={{ color: "#a78bfa", fontWeight: 600, fontSize: "16px" }}>
                                {forgotMessage}
                            </p>
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginTop: "8px" }}>
                                Check your inbox (and spam folder). The link expires in 15 minutes.
                            </p>
                            <Link to="/login" style={{ display: "inline-block", marginTop: "24px", color: "#ec4899", fontWeight: 600, textDecoration: "none" }}>
                                ← Back to Login
                            </Link>
                        </motion.div>
                    ) : (
                        <motion.form
                            key="forgot-form"
                            onSubmit={handleForgotSubmit}
                            className="login-auth-form"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: 0.45, duration: 0.4 }}
                        >
                            <div className="login-form-group">
                                <div className="login-input-with-icon">
                                    <span className="login-input-icon">✉️</span>
                                    <input
                                        type="email"
                                        placeholder="Enter your account email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="login-form-input"
                                        disabled={forgotStatus === "loading"}
                                        required
                                    />
                                </div>
                            </div>

                            <AnimatePresence>
                                {forgotStatus === "error" && forgotMessage && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        style={{ color: "#f87171", fontSize: "13px", margin: "-4px 0 8px", textAlign: "center" }}
                                    >
                                        {forgotMessage}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            <motion.button
                                type="submit"
                                className="login-btn login-btn-primary login-btn-glow"
                                disabled={forgotStatus === "loading"}
                                whileHover={forgotStatus !== "loading" ? { scale: 1.025, boxShadow: "0 16px 40px rgba(139,92,246,0.65)" } : {}}
                                whileTap={forgotStatus !== "loading" ? { scale: 0.97 } : {}}
                            >
                                {forgotStatus === "loading" ? (
                                    <><div className="login-loading-spinner"></div>Sending Link...</>
                                ) : (
                                    <span className="login-btn-text">Send Reset Link</span>
                                )}
                            </motion.button>
                        </motion.form>
                    )}
                </AnimatePresence>

                {forgotStatus !== "sent" && (
                    <motion.div className="login-auth-footer"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.4 }}
                    >
                        <p className="login-footer-text">
                            Remembered it?{" "}
                            <Link to="/login" className="login-auth-link">
                                <span className="login-link-text">Back to Login</span>
                            </Link>
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
