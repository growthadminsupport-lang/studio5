import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email, false);
    navigate("/dashboard", { replace: true }); // Navigate straight to dashboard
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Log in to GrowTH</h2>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit">Log in</button>
      </form>
    </div>
  );
}

export default LoginPage;