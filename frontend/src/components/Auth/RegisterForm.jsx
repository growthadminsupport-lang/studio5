import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";
import "./Auth.css";
 
function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();
 
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
 
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
 
    const result = register({ name, email, phone, password, acceptedTerms });
    if (!result.success) {
      setError(result.error);
      return;
    }
    navigate("/dashboard", { replace: true });
  };
 
  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <img src={logo} alt="GrowTH" className="auth-logo" />
      <h1>Create your account</h1>
      <p className="auth-subtitle">Start tracking your child&rsquo;s growth journey</p>
 
      {error && <p className="auth-error">{error}</p>}
 
      <label>
        <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
 
      <label>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
 
      <label>
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </label>
 
      <label>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
 
      <label>
        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
 
      <label className="checkbox-row terms-row">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
        />
        <span>
          I agree to the <Link to="/terms">Terms of Service</Link> and{" "}
          <Link to="/privacy-notice">Privacy Policy</Link>
        </span>
      </label>
 
      <button type="submit">Create Account</button>
 
      <div className="auth-links">
        <span>
          Already have an account? <Link to="/login">Log in</Link>
        </span>
      </div>
    </form>
  );
}
 
export default RegisterForm;
 