import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const { requestPasswordReset } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (requestPasswordReset) {
      requestPasswordReset(email);
    }
    setIsSubmitted(true);
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h1 className="font-bold text-3xl">Reset your password</h1>
        <p className="auth-subtitle">
          Enter your email and we'll send you a link to reset it.
        </p>

        {error && <p className="auth-error">{error}</p>}

        {!isSubmitted ? (
          <>
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
          </>
        ) : (
          <div className="auth-success-box">
            <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <p>
              If an account exists for that email, we've sent a password reset
              link to it. Check your inbox (and spam folder) — the link expires
              in 1 hour.
            </p>
          </div>
        )}

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </form>
    </div>
  );
}

export default ForgotPasswordForm;