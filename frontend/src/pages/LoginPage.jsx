import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Target destination saved by ProtectedRoute, falling back to /dashboard
  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Call AuthContext login with email and remember state
    login(emailInput, rememberMe);
    
    // Redirect to Dashboard (or target route)
    navigate(from, { replace: true });
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Log in to GrowTH</h2>
        
        <input
          type="email"
          placeholder="Email address"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          required
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>

        <button type="submit">Log in</button>
      </form>
    </div>
  );
}

export default LoginPage;