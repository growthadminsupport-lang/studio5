import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import ThemeToggle from "./ThemeToggle";
import logo from "../../assets/logo_dashboard.png";
import "./Navbar.css";

function Navbar() {
  const { user } = useAuth() || {};
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to={user ? "/dashboard" : "/"} className="navbar-logo">
          <img src={logo} alt="GrowTH" />
        </Link>

        <div className="navbar-links">
          {user ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/growth">Growth</NavLink>
              <NavLink to="/puberty">Puberty</NavLink>
              <NavLink to="/bone-age">AI Prediction</NavLink>
              <span className="navbar-divider" />
              <NavLink to="/knowledge">Resources</NavLink>
              <NavLink to="/contact">Contact</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/knowledge">Resources</NavLink>
              <NavLink to="/contact">Contact</NavLink>
            </>
          )}
        </div>
      </div>

      <div className="navbar-actions">
        {user ? (
          <>
            <ThemeToggle />
            <NotificationBell />
            <ProfileMenu />
          </>
        ) : (
          <>
            <button
              type="button"
              className="login-btn-pill"
              onClick={() => navigate("/login")}
            >
              Login / Sign Up
            </button>
            <ThemeToggle />
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;