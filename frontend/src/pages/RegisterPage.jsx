// src/pages/RegisterPage.jsx
import RegisterForm from "../components/Auth/RegisterForm";
import ThemeToggle from "../components/Layout/ThemeToggle";
import "../components/Auth/Auth.css";

function RegisterPage() {
  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <RegisterForm />
    </div>
  );
}

export default RegisterPage;