import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function RegisterForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }

    // TODO: replace with real API call to your backend
    console.log("Register:", form);

    navigate("/login");
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h1>Create Account</h1>

      {error && <p className="auth-error">{error}</p>}

      <label>
        Full Name
        <input name="name" value={form.name} onChange={handleChange} required />
      </label>

      <label>
        Email
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Phone Number
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Confirm Password
        <input
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
        />
        I agree to the{" "}
        <Link to="/terms" target="_blank">Terms of Service</Link> and{" "}
        <Link to="/privacy" target="_blank">Privacy Policy</Link>
      </label>

      <button type="submit" disabled={!acceptedTerms}>
        Create Account
      </button>

      <div className="auth-links">
        <Link to="/login">Already have an account? Log in</Link>
      </div>
    </form>
  );
}

export default RegisterForm;