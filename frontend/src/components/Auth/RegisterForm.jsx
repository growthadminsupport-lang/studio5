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

function RegisterForm() {
  const { theme } = useTheme();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [linkCredential, setLinkCredential] = useState(null);
  const [busy, setBusy] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!acceptedTerms) return setError('Accept the terms and privacy notice first.');
    setError(''); setBusy(true);
    try {
      await register({ ...form, acceptedTerms });
      navigate('/login', { replace: true });
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function handleGoogle(credential) {
    if (!acceptedTerms) return setError('Accept the terms and privacy notice first.');
    setError(''); setBusy(true);
    try {
      await loginWithGoogle(credential, true, false, form.email.trim());
      navigate('/dashboard', { replace: true });
    } catch (reason) {
      if (reason.code === 'LINK_REQUIRED') {
        setLinkCredential(credential);
      } else setError(reason.message);
    } finally { setBusy(false); }
  }

  if (linkCredential) return <GoogleLinkForm credential={linkCredential} email={form.email} onCancel={() => setLinkCredential(null)} />;

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <video key={theme} src={theme === "dark" ? logoDarkVideo : logoLightVideo}
        poster={theme === "dark" ? posterDark : posterLight} preload="auto" autoPlay loop muted playsInline
        aria-label="GrowTH logo" className="auth-logo" />
      <h1 className="font-semibold text-3xl">Create your account</h1>
      <p className="auth-subtitle">Start tracking your child's growth journey</p>
      {error && <p role="alert" className="auth-error">{error}</p>}
      <label><input type="text" name="name" placeholder="Full name" value={form.name} onChange={handleChange} required /></label>
      <label><input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required /></label>
      <label><input type="tel" name="phone" placeholder="Phone number (optional)" value={form.phone} onChange={handleChange} /></label>
      <label><input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>At least 8 characters, up to 72 UTF-8 bytes</span>
      </label>
      <label className="checkbox-row"><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
        <span>I agree to the <Link to="/terms" target="_blank">terms of use</Link> and <Link to="/privacy-notice" target="_blank">privacy notice</Link></span>
      </label>
      <button type="submit" disabled={!acceptedTerms || busy}>{busy ? 'Please wait…' : 'Create Account'}</button>
      <GoogleButton onCredential={handleGoogle} disabled={!acceptedTerms || busy} />
      <div className="auth-links"><span>Already have an account? <Link to="/login">Log in</Link></span></div>
    </form>
  );
}

export default RegisterForm;
