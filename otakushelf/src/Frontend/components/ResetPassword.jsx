import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../Stylesheets/login.css";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [message, setMessage] = useState("");
    const [strength, setStrength] = useState(0); // 0-4

    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const API = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        if (!token || !email) {
            setStatus("error");
            setMessage("Invalid reset link. Please request a new one.");
        }
    }, [token, email]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage("Passwords do not match."); setStatus("error"); return;
        }
        if (newPassword.length < 6) {
            setMessage("Password must be at least 6 characters."); setStatus("error"); return;
        }
        setStatus("loading"); setMessage("");
        try {
            const res = await axios.post(`${API}/auth/reset-password`, { token, email, newPassword });
            setMessage(res.data.message);
            setStatus("success");
            setTimeout(() => navigate("/login"), 3000);
        } catch (err) {
            setMessage(err.response?.data?.message || "Reset failed. The link may have expired.");
            setStatus("error");
        }
    };

    return (
        <div className="login-container">
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
                    {status === "success" ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            style={{ textAlign: "center", padding: "32px 0" }}
                        >
                            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
                            <p style={{ color: "#34d399", fontWeight: 600, fontSize: "16px" }}>{message}</p>
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginTop: "8px" }}>
                                Redirecting you to login...
                            </p>
                        </motion.div>
                    ) : (
                        <motion.form
                            key="form"
                            onSubmit={handleSubmit}
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
                                        disabled={status === "loading"}
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
                                        disabled={status === "loading"}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Error */}
                            <AnimatePresence>
                                {status === "error" && message && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        style={{ color: "#f87171", fontSize: "13px", margin: "-4px 0 8px", textAlign: "center" }}
                                    >
                                        {message}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            <motion.button
                                type="submit"
                                className="login-btn login-btn-primary login-btn-glow"
                                disabled={status === "loading" || !token}
                                whileHover={status !== "loading" ? { scale: 1.025, boxShadow: "0 16px 40px rgba(139,92,246,0.65)" } : {}}
                                whileTap={status !== "loading" ? { scale: 0.97 } : {}}
                            >
                                {status === "loading" ? (
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
};

export default ResetPassword;
