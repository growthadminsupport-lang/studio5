import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../components/Auth/Auth.css';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { resetPassword } = useAuth();
  const token = params.get('token');

  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await resetPassword(token, password); setMessage('Password set. Website and Google sign-in can now both be used if Google is linked. Log in again.'); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  return <div className="auth-page"><form className="auth-form" onSubmit={submit}>
    <h1>Set a new password</h1>
    {!token && <p role="alert" className="auth-error">The reset link has no token.</p>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    {message && <p role="status" className="auth-success-box">{message}</p>}
    {!message && <><input type="password" aria-label="New password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit" disabled={!token || busy}>{busy ? 'Please wait…' : 'Set password'}</button></>}
    <Link to="/login">Back to login</Link>
  </form></div>;
}
