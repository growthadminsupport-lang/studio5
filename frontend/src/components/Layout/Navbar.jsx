import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import "./Navbar.css";

function Navbar() {
  const { isLoggedIn, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="logo-text">
          GrowTH
        </Link>
      </div>

      <nav className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Home
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => (isActive ? "active" : "")}>
          About
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => (isActive ? "active" : "")}>
          Contact
        </NavLink>
      </nav>

      <div className="navbar-actions">
        {isLoggedIn ? (
          <>
            <Link to="/dashboard" className="navbar-link">
              Dashboard
            </Link>
            <button onClick={logout} className="login-btn-pill">
              Log out
            </button>
          </>
        ) : (
          <Link to="/login" className="login-btn-pill">
            Log in / Sign up
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}

export default Navbar;