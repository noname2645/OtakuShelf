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
      const timer = setTimeout(() => {
        setMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      setMessage("Please fill in all fields");
      return false;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return false;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        `${API}/auth/register`,
        {
          email,
          password,
        },
        { withCredentials: true }
      );

      console.log("Register response:", res.data);
      setMessage(res.data.message);

      const loginRes = await axios.post(
        `${API}/auth/login`,
        {
          email,
          password,
        },
        { withCredentials: true }
      );

      console.log("Login response:", loginRes.data);

      if (loginRes.data.user) {
        login(loginRes.data.user);
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

  const handleGoogleSignup = () => {
    window.location.href = `${API}/auth/google`;
  };

  const getMessageClass = () => {
    if (!message) return "";
    return message.includes("successful")
      ? "message message-success"
      : "message message-error";
  };

  return (
    <>
      <div className="register-container">
        {/* Animated Background Elements */}
        <div className="bg-anime-elements">
          <div className="bg-circle bg-circle-1"></div>
          <div className="bg-circle bg-circle-2"></div>
          <div className="bg-circle bg-circle-3"></div>
          <div className="anime-icon anime-icon-1">🌸</div>
          <div className="anime-icon anime-icon-2">⚔️</div>
          <div className="anime-icon anime-icon-3">🎌</div>
        </div>

        {message && <div className={getMessageClass()}>{message}</div>}
        
        <div className="register-card">
          {/* Decorative Header */}
          <div className="card-header">
            <div className="card-icon">🎬</div>
            <div className="card-glow"></div>
          </div>
          <div className="auth-header">
            <h1 className="auth-title">Join AnimeVerse</h1>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <div className="input-with-icon">
                <span className="input-icon">
                   <img src={emailIcon} alt="Email Icon" />
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="input-with-icon">
                <span className="input-icon">
                  <img src={passwordIcon} alt="Password Icon" />
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  disabled={isLoading}
                  required
                  minLength={6}
                />
              </div>
      
            </div>

            <div className="form-group">
              <div className="input-with-icon">
                <span className="input-icon">
                  <img src={passwordIcon} alt="Confirm Password Icon" />
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  disabled={isLoading}
                  required
                />
                <div className="input-underline"></div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-glow"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Creating Your Journey...
                </>
              ) : (
                <>
                  <span className="btn-text">Begin Adventure</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="divider">
            <span className="divider-text">or continue with</span>
          </div>

          <button
            onClick={handleGoogleSignup}
            className="google-btn"
            disabled={isLoading}
            type="button"
          >
            <img src={googleIcon} alt="Google Icon" />
            <span className="btn-text">Sign Up With Google</span>
          </button>

          <div className="auth-footer">
            <p className="footer-text">
              Already part of the adventure?{" "}
              <Link to="/login" className="auth-link">
                <span className="link-text">Login Here</span>
                <span className="link-arrow">→</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;