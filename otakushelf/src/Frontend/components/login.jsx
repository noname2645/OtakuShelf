import React, { useState } from "react";
import axios from "axios";
import "../Stylesheets/login.css"; // Import the CSS file

const Login = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Configure axios to send cookies with requests
  axios.defaults.withCredentials = true;

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    // Basic client-side validation
    if (!email || !password) {
      setMessage("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/auth/login", {
        email,
        password,
      });
      
      setMessage(res.data.message);
      
      // Call success callback if provided (for navigation)
      if (onLoginSuccess && res.data.user) {
        setTimeout(() => {
          onLoginSuccess(res.data.user);
        }, 1000);
      }

      // Clear form on success
      setEmail("");
      setPassword("");
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Error logging in";
      setMessage(errorMessage);
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = "http://localhost:5000/auth/google";
  };

  const getMessageClass = () => {
    if (!message) return "";
    return message.includes("successful") ? "message message-success" : "message message-error";
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              disabled={isLoading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="divider">
          <span className="divider-text">or continue with</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="btn btn-google"
          disabled={isLoading}
          type="button"
        >
          <svg className="google-icon" viewBox="0 0 24 24">
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
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 极速下载 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>

        {message && (
          <div className={getMessageClass()}>
            {message}
          </div>
        )}

        <div className="auth-footer">
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
            Don't have an account?{" "}
            <button 
              type="button"
              className="auth-link"
              onClick={onSwitchToRegister}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
            >
              Create one here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;