import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../components/Auth/Auth.css';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { resendVerification } = useAuth();
  async function submit(event) {
    event.preventDefault(); setError('');
    try { await resendVerification(email); setMessage('If this account still needs verification, check its inbox for a new link.'); }
    catch (reason) { setError(reason.message); }
  }
  return <div className="auth-page"><form className="auth-form" onSubmit={submit}>
    <h1>Resend verification</h1>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {message && <p role="status" className="auth-success-box">{message}</p>}
    <input type="email" aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
    <button type="submit">Send link</button>
    <Link to="/login">Back to login</Link>
  </form></div>;
}
