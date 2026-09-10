import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate("/"); // Send user back to public Home page
  };

  return (
    <nav className="navbar">
      <Link to="/" className="logo">GrowTH</Link>

      <div className="nav-links">
        {!isLoggedIn ? (
          /* Public Navbar Links */
          <>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login" className="btn-login">Log in</Link>
            <Link to="/signup" className="btn-signup">Sign up</Link>
          </>
        ) : (
          /* Authenticated Navbar Links */
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/contact">Contact</Link>
            
            <div className="user-menu-container">
              <button 
                onClick={() => setShowDropdown(!showDropdown)} 
                className="user-menu-btn"
              >
                Profile ▾
              </button>

              {showDropdown && (
                <div className="dropdown-menu">
                  <button onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;