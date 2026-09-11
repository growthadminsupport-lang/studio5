import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";
import "./Auth.css";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

    const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const result = login(email, remember);
    if (result && !result.success) {
      setError(result.error);
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <img src={logo} alt="GrowTH" className="auth-logo" />
      <h1 className="font-bold text-3xl">Welcome back</h1>
      <p className="auth-subtitle">Log in to track your child's growth</p>

      {error && <p className="auth-error">{error}</p>}

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
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <div className="remember-forgot-row">
        <label className="checkbox-row remember-me">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>Remember me</span>
        </label>
        <Link to="/forgot-password" className="forgot-link-inline">
          Forgot password?
        </Link>
      </div>

      <button type="submit">Log In</button>

      <div className="auth-links">
        <span>
          New here? <Link to="/register">Create an account</Link>
        </span>
      </div>
    </form>
  );
}

export default LoginForm;