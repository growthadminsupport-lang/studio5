import { Link } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import LogoutButton from "../Auth/LogoutButton";

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-logo">
        GrowTH
      </Link>

      <div className="navbar-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/knowledge">Knowledge Center</Link>
        <Link to="/profile">Profile</Link>
      </div>

      <div className="navbar-actions">
        <NotificationBell />
        <LogoutButton />
      </div>
    </nav>
  );
}

export default Navbar;