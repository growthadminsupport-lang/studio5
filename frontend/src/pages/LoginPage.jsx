import LoginForm from "../components/Auth/LoginForm";
import ThemeToggle from "../components/Layout/ThemeToggle";
import "../components/Auth/Auth.css";

function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <LoginForm />
    </div>
  );
}

export default LoginPage;