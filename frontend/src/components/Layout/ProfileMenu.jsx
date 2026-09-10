import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function ProfileMenu() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/"); // Redirect to Home Page on logout
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
            to="/settings"
            onClick={() => setOpen(false)}
          >
            <Settings size={17} strokeWidth={1.8} />
            <span>Setting</span>
          </Link>

          <div className="profile-dropdown-divider" />

          <button onClick={handleLogout}>Log out</button>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;