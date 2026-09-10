import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Redirect to previous page if kicked here by ProtectedRoute, otherwise go to /dashboard
  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate(from, { replace: true }); // Redirects to Dashboard
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Log in to GrowTH</h2>
        {/* Email & Password Inputs */}
        <button type="submit">Log in</button>
      </form>
    </div>
  );
}

export default LoginPage;