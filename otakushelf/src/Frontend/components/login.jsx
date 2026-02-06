import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import "../Stylesheets/login.css";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
      const timer = setTimeout(() => {
        setMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (!email || !password) {
      setMessage("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        `${API}/auth/login`,
        {
          email,
          password,
        },
        { withCredentials: true }
      );

      console.log("Login response:", res.data);
      setMessage(res.data.message);

      if (res.data.user) {
        login(res.data.user);
        setEmail("");
        setPassword("");
        navigate("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage = err.response?.data?.message || "Error logging in";
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API}/auth/google`;
  };

  const getMessageClass = () => {
    if (!message) return "";
    return message.includes("successful")
      ? "login-message login-message-success"
      : "login-message login-message-error";
  };

  return (
    <div className="login-container">
      {/* Animated Background Elements */}
      <div className="login-bg-elements">
        <div className="login-bg-circle login-bg-circle-1"></div>
        <div className="login-bg-circle login-bg-circle-2"></div>
        <div className="login-bg-circle login-bg-circle-3"></div>
        <div className="login-anime-icon login-anime-icon-1">🎬</div>
        <div className="login-anime-icon login-anime-icon-2">🍥</div>
        <div className="login-anime-icon login-anime-icon-3">🎭</div>
      </div>


      {message && <div className={getMessageClass()}>{message}</div>}

      <div className="login-card">
        {/* Decorative Header */}
        <div className="login-card-header">
          <div className="login-card-icon">🎭</div>
          <div className="login-card-glow"></div>
        </div>

        <div className="login-auth-header">
          <h1 className="login-auth-title">Welcome Back</h1>
        </div>

        <form onSubmit={handleLogin} className="login-auth-form">
          <div className="login-form-group">
            <div className="login-input-with-icon">
              <span className="login-input-icon">✉️</span>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-form-input"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="login-form-group">
            <div className="login-input-with-icon">
              <span className="login-input-icon">🔒</span>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-form-input"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-btn login-btn-primary login-btn-glow"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="login-loading-spinner"></div>
                Signing In...
              </>
            ) : (
              <>
                <span className="login-btn-text">Enter World</span>
                <span className="login-btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span className="login-divider-text">or continue with</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="login-btn login-btn-modern"
          disabled={isLoading}
          type="button"
        >
          <svg className="login-google-icon" viewBox="0 0 24 24">
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
          <span className="login-btn-text">Sign in with Google</span>
        </button>

        <div className="login-auth-footer">
          <p className="login-footer-text">
            New to AnimeVerse?{" "}
            <Link to="/register" className="login-auth-link">
              <span className="login-link-text">Join Now</span>
              <span className="login-link-arrow">→</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;