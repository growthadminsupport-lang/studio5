
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";
import "./Auth.css";
 
function ForgotPasswordForm() {
  const [step, setStep] = useState("request"); // "request" | "reset"
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const { requestPasswordReset, resetPassword } = useAuth();
  const navigate = useNavigate();
 
  const handleRequestSubmit = (e) => {
    e.preventDefault();
    setError("");
    requestPasswordReset(email);
    // Always show the same message regardless of whether the account exists,
    // so the form can't be used to check which emails are registered.
    setInfo("If an account exists for this email, a verification code has been sent.");
    setStep("reset");
  };
 
  const handleResetSubmit = (e) => {
    e.preventDefault();
    setError("");
 
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
 
    const result = resetPassword(email, newPassword);
    if (!result.success) {
      setError(result.error);
      return;
    }
    navigate("/login", { replace: true });
  };
 
  return (
    <form onSubmit={step === "request" ? handleRequestSubmit : handleResetSubmit} className="auth-form">
      <img src={logo} alt="GrowTH" className="auth-logo" />
      <h1>Reset your password</h1>
      <p className="auth-subtitle">
        {step === "request"
          ? "Enter your account email to receive a verification code"
          : "Enter the new password for your account"}
      </p>
 
      {error && <p className="auth-error">{error}</p>}
      {info && step === "reset" && <p className="auth-info">{info}</p>}
 
      {step === "request" ? (
        <label>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
      ) : (
        <>
          {/* In production this step follows a link/code from the verification
              email — this simplified flow verifies via the same session. */}
          <label>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
        </>
      )}
 
      <button type="submit">{step === "request" ? "Send Verification Email" : "Reset Password"}</button>
 
      <div className="auth-links">
        <span>
          Remembered your password? <Link to="/login">Log in</Link>
        </span>
      </div>
    </form>
  );
}
 
export default ForgotPasswordForm;