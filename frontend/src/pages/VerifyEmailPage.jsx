import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../components/Auth/Auth.css';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { verifyEmail } = useAuth();
  const token = params.get('token');

  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await verifyEmail(token, password); setMessage('Email verified. You can now log in.'); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  return <div className="auth-page"><form className="auth-form" onSubmit={submit}>
    <h1>Verify your email</h1>
    <p className="auth-subtitle">Enter the password you chose when you registered. This prevents someone else from activating an account in your name.</p>
    {!token && <p role="alert" className="auth-error">The verification link has no token.</p>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    {message && <p role="status" className="auth-success-box">{message}</p>}
    {!message && <><input type="password" aria-label="Registration password" placeholder="Registration password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit" disabled={!token || busy}>{busy ? 'Please wait…' : 'Verify email'}</button></>}
    <Link to="/login">Back to login</Link>
  </form></div>;
}
