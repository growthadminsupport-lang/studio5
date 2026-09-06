import { useState } from "react";
import { Link } from "react-router-dom";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: replace with real API call that triggers a reset email
    console.log("Password reset requested for:", email);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-form">
        <h1>Check your email</h1>
        <p>
          If an account exists for <strong>{email}</strong>, we've sent a
          password reset link.
        </p>
        <Link to="/login">Back to Login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h1>Forgot Password</h1>
      <p>Enter your email and we'll send you a reset link.</p>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <button type="submit">Send Reset Link</button>

      <div className="auth-links">
        <Link to="/login">Back to Login</Link>
      </div>
    </form>
  );
}

export default ForgotPasswordForm;