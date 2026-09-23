
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import logoDarkVideo from "../../assets/logo_motion_black_small.mp4";
import logoLightVideo from "../../assets/logo_motion_white_small.mp4";
import posterDark from "../../assets/poster_dark.webp";
import posterLight from "../../assets/poster_light.webp";
import "./Auth.css";

function LoginForm() {
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const result = login(email, remember);

    if (result && !result.success) {
      setError(result.error);
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  const handleGoogleLogin = () => {
    // Temporary Google login
    // Replace this later with real Google authentication
    console.log("Google Login clicked");

    // For now, go to dashboard
    navigate("/dashboard", { replace: true });
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {/* Logo */}
      <div className="auth-logo-container">
        <video
          key={theme}
          src={theme === "dark" ? logoDarkVideo : logoLightVideo}
          poster={theme === "dark" ? posterDark : posterLight}
          preload="auto"
          autoPlay
          loop
          muted
          playsInline
          aria-label="GrowTH logo"
          className="auth-logo"
        />
      </div>

      <h1 className="font-bold text-3xl welcome-title">Welcome back</h1>

      <p className="auth-subtitle">
        Log in to track your child's growth
      </p>

      {/* Error */}
      {error && <p className="auth-error">{error}</p>}

      {/* Email */}
      <label>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      {/* Password */}
      <label className="password-input-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </label>

      {/* Remember + Forgot Password */}
      <div className="remember-forgot-row">
        <label className="checkbox-row remember-me">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>Remember me</span>
        </label>

        <Link to="/forgot-password" className="forgot-link-inline">
          Forgot password?
        </Link>
      </div>

      {/* Login button */}
      <button type="submit">
        Log In
      </button>

      {/* Divider */}
      <div className="auth-divider">
        <span>or</span>
      </div>

      {/* Google Login */}
      <button
        type="button"
        className="google-login-button"
        onClick={handleGoogleLogin}
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          className="google-icon"
        />
        <span>Continue with Google</span>
      </button>

      {/* Register */}
      <div className="auth-links">
        <span>
          New here?{" "}
          <Link to="/register">
            Create an account
          </Link>
        </span>
      </div>
    </form>
  );
}

export default LoginForm;


