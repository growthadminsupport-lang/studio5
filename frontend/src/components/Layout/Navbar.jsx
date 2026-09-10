import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      {/* Brand & Links */}
      
      <div className="navbar-actions">
        {user ? (
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
      </div>
    </nav>
  );
}

export default Navbar;