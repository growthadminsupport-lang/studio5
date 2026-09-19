import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import logoDarkVideo from "../../assets/logo_motion_black_small.mp4";
import logoLightVideo from "../../assets/logo_motion_white_small.mp4";
import posterDark from "../../assets/poster_dark.webp";
import posterLight from "../../assets/poster_light.webp";
import "./Auth.css";

function RegisterForm() {
  const { theme } = useTheme();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!acceptedTerms) {
      setError("You must accept the terms of use and privacy notice.");
      return;
    }
    console.log("Register:", form);
    navigate("/login", { replace: true });
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
      <p className="auth-subtitle">Start tracking your child's growth journey</p>

      {error && <p className="auth-error">{error}</p>}

      <label>
        <input type="text" name="name" placeholder="Full name" value={form.name} onChange={handleChange} required />
      </label>
      <label>
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
      </label>
      <label>
        <input type="tel" name="phone" placeholder="Phone number" value={form.phone} onChange={handleChange} required />
      </label>
      <label>
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          At least 8 characters, with a letter and a number
        </span>
      </label>

      <label className="checkbox-row">
        <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
        <span>
          I agree to the {" "}
          <Link to="/terms" state={{ from: "/register" }}>terms of use</Link>{" "}
          and {" "} 
          <Link to="/privacy-notice" state={{ from: "/register" }}>privacy notice</Link>
        </span>
      </label>

      <button type="submit" disabled={!acceptedTerms}>Create Account</button>

      <div className="auth-links">
        <span>Already have an account? <Link to="/login">Log in</Link></span>
      </div>
    </form>
  );
}

export default RegisterForm;