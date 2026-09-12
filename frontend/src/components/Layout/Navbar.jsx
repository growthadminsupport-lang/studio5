import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import ThemeToggle from "./ThemeToggle";
import logo from "../../assets/logo_dashboard.png";
import "./Navbar.css";

function Navbar() {
  const { isLoggedIn } = useAuth() || {};
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className={`w-full flex items-center justify-between ${!isLoggedIn ? "max-w-5xl mx-auto px-0 sm:px-6" : "px-0 sm:px-6"}`}>
        
        <div className="navbar-left flex items-center gap-6">
          <Link to={isLoggedIn ? "/dashboard" : "/"} className="navbar-logo">
            <img src={logo} alt="GrowTH" className="h-9 w-auto object-contain" />
          </Link>

          {/* Hidden on mobile, visible on desktop (md screens and above) */}
          <div className="navbar-links hidden md:flex items-center gap-5">
            {isLoggedIn ? (
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
                <NavLink to="/about">About</NavLink>
                <NavLink to="/contact">Contact</NavLink>
              </>
            )}
          </div>
        </div>

        <div className="navbar-actions flex items-center gap-3">
          {isLoggedIn ? (
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

      </div>
    </nav>
  );
}

export default Navbar;