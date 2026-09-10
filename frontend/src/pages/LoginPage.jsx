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

  const handleSubmit = (e) => {
  e.preventDefault();
  login(email, false); // Pass string email and remember preference
  navigate(from, { replace: true });
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