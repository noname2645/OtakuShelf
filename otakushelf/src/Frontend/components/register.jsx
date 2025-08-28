import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import "../Stylesheets/register.css";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const Register = ({ onRegisterSuccess, onSwitchToLogin }) => {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

    useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 3000);
      return () => clearTimeout(timer); // cleanup on unmount
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/auth/register", {
        email,
        password,
      }, { withCredentials: true });

      setMessage(res.data.message);

      if (res.data.message.includes("successful")) {
        try {
          const loginRes = await axios.post("http://localhost:5000/auth/login", {
            email,
            password,
          }, { withCredentials: true });

          if (loginRes.data.user) {
            login(loginRes.data.user);
            if (onRegisterSuccess) {
              onRegisterSuccess(loginRes.data.user);
            }
          }
        } catch (loginErr) {
          if (onRegisterSuccess) {
            setTimeout(() => {
              onRegisterSuccess();
            }, 2000);
          }
        }
      }

      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Error registering user";
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };


  const getMessageClass = () => {
    if (!message) return "";
    return message.includes("successful") ? "message message-success" : "message message-error";
  };

  return (
    <>
      <div className="auth-container">
        {message && <div className={getMessageClass()}>{message}</div>}
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">to start your anime journey</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
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

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
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

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
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
            </div>

            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="divider">
            <span className="divider-text">or sign up with</span>
          </div>

          <button onClick={handleGoogleSignup} className="btn btn-google" disabled={isLoading} type="button">
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>



          <div className="auth-footer">
            <p>
              Already have an account?{" "}
              <Link to="/login" className="auth-link">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;