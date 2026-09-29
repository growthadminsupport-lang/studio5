import GoogleLinkForm from "./GoogleLinkForm";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import GoogleButton from "./GoogleButton";
import logoDarkVideo from "../../assets/logo_motion_black_small.mp4";
import logoLightVideo from "../../assets/logo_motion_white_small.mp4";
import posterDark from "../../assets/poster_dark.webp";
import posterLight from "../../assets/poster_light.webp";
import "./Auth.css";

function LoginForm() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [linkCredential, setLinkCredential] = useState(null);
  const [busy, setBusy] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password, remember);
      navigate("/dashboard", { replace: true });
    } catch (reason) {
      setError(reason.status === 401 ? 'Invalid email or password.' : reason.message);
    } finally { setBusy(false); }
  }

  async function handleGoogle(credential) {
    setError("");
    setBusy(true);
    try {
      await loginWithGoogle(credential, false, remember, email.trim());
      navigate("/dashboard", { replace: true });
    } catch (reason) {
      if (reason.code === 'LINK_REQUIRED') {
        setLinkCredential(credential);
      } else setError(reason.message);
    } finally { setBusy(false); }
  }

  if (linkCredential) return <GoogleLinkForm credential={linkCredential} email={email} remember={remember} onCancel={() => setLinkCredential(null)} />;

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <video key={theme} src={theme === "dark" ? logoDarkVideo : logoLightVideo}
        poster={theme === "dark" ? posterDark : posterLight} preload="auto" autoPlay loop muted playsInline
        aria-label="GrowTH logo" className="auth-logo" />
      <h1 className="font-bold text-3xl">Welcome back</h1>
      <p className="auth-subtitle">Log in to track your child's growth</p>
      {error && <p role="alert" className="auth-error">{error}</p>}
      <label><input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label><input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <div className="remember-forgot-row">
        <label className="checkbox-row remember-me"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Remember me</span></label>
        <Link to="/forgot-password" className="forgot-link-inline">Forgot password?</Link>
      </div>
      <button type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Log In'}</button>
      <GoogleButton onCredential={handleGoogle} disabled={busy} />
      <div className="auth-links">
        <span>New here? <Link to="/register">Create an account</Link></span>
      </div>
    </form>
  );
}

export default LoginForm;
