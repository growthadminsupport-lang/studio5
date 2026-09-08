import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import logo from "../../assets/logo.png";
import "./PublicLayout.css";

function PublicNavbar() {
  const { toggleTheme } = useTheme();

  return (
    <header className="public-navbar">
      <div className="public-navbar__inner">
        <Link to="/" className="public-navbar__brand">
          <img src={logo} alt="GrowTH" />
          <span>GrowTH</span>
        </Link>

        <nav className="public-navbar__links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>

        <div className="public-navbar__actions">
          <Link to="/login" className="btn btn--primary btn--sm">
            Login / Sign Up
          </Link>
          <button
            type="button"
            className="icon-btn"
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
          >
            🌙
          </button>
        </div>
      </div>
    </header>
  );
}

export default PublicNavbar;