import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // TODO: replace with real API call to your backend
    console.log("Login attempt:", { email, password, remember });

    // Fake "success" for now so you can see the flow work
    if (remember) {
      localStorage.setItem("growth_user_email", email);
    } else {
      sessionStorage.setItem("growth_user_email", email);
    }

    navigate("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h1>Sign In</h1>

      {error && <p className="auth-error">{error}</p>}

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        Remember me
      </label>

      <button type="submit">Log In</button>

      <div className="auth-links">
        <Link to="/forgot-password">Forgot password?</Link>
        <Link to="/register">Create an account</Link>
      </div>
    </form>
  );
}

export default LoginForm;