import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function GoogleLinkForm({ credential, email: initialEmail, remember = false, onCancel }) {
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const { linkGoogleAndLogin } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const timer = setTimeout(() => { setExpired(true); setPassword(''); }, 300000);
    return () => clearTimeout(timer);
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy || expired) return;
    setBusy(true); setError('');
    try {
      await linkGoogleAndLogin(credential, email, password, remember);
      navigate('/dashboard', { replace: true });
    } catch (reason) {
      setError(reason.message);
      setPassword('');
      if (reason.code === 'GOOGLE_REAUTH_REQUIRED' || reason.code === 'GOOGLE_EMAIL_MISMATCH') setExpired(true);
    } finally { setBusy(false); }
  }
  return <form className="auth-form" onSubmit={submit}>
    <h1>Link Google to your account</h1>
    <p>Enter your existing website password once. This verifies your account and enables both login methods. Your password and child records stay the same.</p>
    <p>Use the same email as the Google account you selected. Do not enter your Google password.</p>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {expired ? <p role="status">Choose your Google account again to continue.</p> : <>
      <input aria-label="Website email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input aria-label="Existing website password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button disabled={busy} type="submit">{busy ? 'Linking…' : 'Confirm and sign in'}</button>
    </>}
    <button type="button" disabled={busy} onClick={onCancel}>Back to sign in / choose Google again</button>
  </form>;
}
