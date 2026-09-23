import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import logoDarkVideo from "../../assets/logo_motion_black_small.mp4";
import logoLightVideo from "../../assets/logo_motion_white_small.mp4";
import posterDark from "../../assets/poster_dark.webp";
import posterLight from "../../assets/poster_light.webp";
import "./Auth.css";

function RegisterForm() {
  const { theme } = useTheme();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!acceptedTerms) {
      setError("You must accept the terms of use and privacy notice.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    console.log("Register:", form);
    navigate("/login", { replace: true });
  };

  const handleGoogleSignUp = () => {
    if (!acceptedTerms) {
      setError("You must accept the terms of use and privacy notice.");
      return;
    }

    // Connect your Google authentication here
    console.log("Continue with Google");
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
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

      <h1 className="font-semibold text-3xl">Create your account</h1>

      <p className="auth-subtitle">
        Start tracking your child's growth journey
      </p>

      {error && <p className="auth-error">{error}</p>}

      {/* Full Name */}
      <label>
        <input
          type="text"
          name="name"
          placeholder="Full name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </label>

      {/* Email */}
      <label>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </label>

      {/* Phone */}
      <label>
        <input
          type="tel"
          name="phone"
          placeholder="Phone number"
          value={form.phone}
          onChange={handleChange}
          required
        />
      </label>

      {/* Password */}
      <label className="password-field">
        <div className="password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
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
        </div>

        <span
          style={{
            fontSize: "12px",
            color: "var(--color-text-muted)",
            marginLeft: "4px",
          }}
        >
           At least 8 characters, with a letter and a number
        </span>
      </label>

      {/* Confirm Password */}
      <label className="password-field">
        <div className="password-input-wrapper">
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <button
            type="button"
            className="password-toggle"
            onClick={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
            aria-label={
              showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
          >
            {showConfirmPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        </div>

        {form.confirmPassword &&
          form.password !== form.confirmPassword && (
            <span className="password-error">
              Passwords do not match.
            </span>
          )}
      </label>

      {/* Terms */}
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
        />

        <span>
          I agree to the{" "}
          <Link to="/terms" state={{ from: "/register" }}>
            terms of use
          </Link>{" "}
          and{" "}
          <Link to="/privacy-notice" state={{ from: "/register" }}>
            privacy notice
          </Link>
        </span>
      </label>

      {/* Create Account */}
      <button type="submit" disabled={!acceptedTerms}>
        Create Account
      </button>

      {/* Divider */}
      <div className="auth-divider">
        <span>or</span>
      </div>

      {/* Google Sign Up */}
      <button
        type="button"
        className="google-login-button"
        onClick={handleGoogleSignUp}
        disabled={!acceptedTerms}
        aria-disabled={!acceptedTerms}
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
          className="google-icon"
        />
        <span>Sign up with Google</span>
      </button>

      {/* Login Link */}
      <div className="auth-links">
        <span>
          Already have an account?{" "}
          <Link to="/login">Log in</Link>
        </span>
      </div>
    </form>
  );
}

export default RegisterForm;
