import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Users,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./ProfileMenu.css";

function ProfileMenu() {
  const [open, setOpen] = useState(false);

  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const email = user?.email || "";
  const initial = email ? email.charAt(0).toUpperCase() : "U";

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="profile-menu">
      <button
        className="profile-trigger"
        onClick={() => setOpen(!open)}
        aria-label="Profile menu"
      >
        <span className="profile-avatar">
          {initial}
        </span>

        <ChevronDown
          className={`profile-arrow ${open ? "open" : ""}`}
          size={16}
          strokeWidth={1.8}
        />
      </button>

      {open && (
        <div className="profile-dropdown">

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
          >
            <User size={17} strokeWidth={1.8} />
            <span>Profile</span>
          </Link>

          <Link
            to="/children"
            onClick={() => setOpen(false)}
          >
            <Users size={17} strokeWidth={1.8} />
            <span>My Children</span>
          </Link>

          <Link
            to="/settings"
            onClick={() => setOpen(false)}
          >
            <Settings size={17} strokeWidth={1.8} />
            <span>Setting</span>
          </Link>

          <div className="profile-dropdown-divider" />

          <button onClick={handleLogout}>
            <LogOut size={17} strokeWidth={1.8} />
            <span>Log out</span>
          </button>

        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
