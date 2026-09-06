import { useState } from "react";
import { Link } from "react-router-dom";
import "./Auth.css";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Password reset requested for:", email);
    setSent(true);
  };

  return (
    <div className="auth-form">
      <h1>Reset your password</h1>
      <p className="auth-subtitle">Enter your email and we'll send you a link to reset it.</p>

      {sent ? (
        <div className="auth-success-box">
          ✅
          <span>
            If an account exists for that email, we've sent a password reset
            link to it. Check your inbox (and spam folder) — the link expires
            in 1 hour.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label>
            <input
              type="email"
              placeholder="Email *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <button type="submit">Send reset link</button>
        </form>
      )}

      <div className="auth-links">
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  );
}

export default ForgotPasswordForm;