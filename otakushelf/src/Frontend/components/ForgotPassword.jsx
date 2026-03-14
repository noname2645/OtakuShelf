import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../Stylesheets/login.css";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState(null); // null | 'loading' | 'sent' | 'error'
    const [message, setMessage] = useState("");
    const API = import.meta.env.VITE_API_BASE_URL;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) { setMessage("Please enter your email."); setStatus("error"); return; }
        setStatus("loading");
        setMessage("");
        try {
            const res = await axios.post(`${API}/auth/forgot-password`, { email });
            setMessage(res.data.message);
            setStatus("sent");
        } catch (err) {
            setMessage(err.response?.data?.message || "Something went wrong. Try again.");
            setStatus("error");
        }
    };

    return (
        <div className="login-container">
            {/* Animated background orbs */}
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
                {/* Icon */}
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
                    {status === "sent" ? (
                        <motion.div
                            key="sent"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ textAlign: "center", padding: "32px 0" }}
                        >
                            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📬</div>
                            <p style={{ color: "#a78bfa", fontWeight: 600, fontSize: "16px" }}>
                                {message}
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
                            key="form"
                            onSubmit={handleSubmit}
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
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="login-form-input"
                                        disabled={status === "loading"}
                                        required
                                    />
                                </div>
                            </div>

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
                                disabled={status === "loading"}
                                whileHover={status !== "loading" ? { scale: 1.025, boxShadow: "0 16px 40px rgba(139,92,246,0.65)" } : {}}
                                whileTap={status !== "loading" ? { scale: 0.97 } : {}}
                            >
                                {status === "loading" ? (
                                    <><div className="login-loading-spinner"></div>Sending Link...</>
                                ) : (
                                    <span className="login-btn-text">Send Reset Link</span>
                                )}
                            </motion.button>
                        </motion.form>
                    )}
                </AnimatePresence>

                {status !== "sent" && (
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
