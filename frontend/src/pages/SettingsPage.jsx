import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authedRequest } from "../lib/api";
import GoogleButton from "../components/Auth/GoogleButton";
import "./SettingsPage.css";

function SettingsPage() {
  const { user, logout, linkGoogle } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleUpdatePassword(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await authedRequest('/api/auth/password/change', {
        method: 'POST', body: { current_password: currentPassword, new_password: newPassword },
      });
      await logout();
      navigate('/login', { replace: true });
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function handleLinkGoogle(credential) {
    setError(''); setMessage(''); setBusy(true);
    try {
      await linkGoogle(credential, linkPassword);
      setLinkPassword('');
      setMessage('Google is linked. Your website password still works.');
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  return <div className="settings-page-container">
    <h1 className="settings-title">Settings</h1>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {message && <p role="status" className="success-alert">{message}</p>}
    <div className="settings-cards-container">
      <section className="settings-card">
        <h2>Account</h2>
        <p>{user?.email}</p>
        <p>Google: {user?.providers?.includes('google') ? 'Linked' : 'Not linked'}</p>
        {user?.verification_required && !user?.email_verified && <p>Email verification is required.</p>}
      </section>
      {!user?.providers?.includes('google') && user?.has_password && <section className="settings-card">
        <h2>Link Google</h2>
        <p>Enter your current website password, then choose the Google account with the same email.</p>
        <div className="float-field"><input type="password" aria-label="Website password for linking" placeholder="Current website password"
          value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)} /></div>
        <GoogleButton onCredential={handleLinkGoogle} disabled={!linkPassword || busy} />
      </section>}
      <section className="settings-card">
        <h2>{user?.has_password ? 'Change password' : 'Set a website password'}</h2>
        {user?.has_password ? <form onSubmit={handleUpdatePassword}>
          <div className="float-field"><input type="password" aria-label="Current password" placeholder="Current password"
            value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
          <div className="float-field"><input type="password" aria-label="New password" placeholder="New password"
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
          <button type="submit" className="btn-update-password" disabled={busy}>Update password</button>
        </form> : <p>Use <Link to="/forgot-password">password setup by email</Link>. This also restores website login for accounts whose old password was cleared. Your Google link and data stay in place.</p>}
      </section>
    </div>
  </div>;
}

export default SettingsPage;
