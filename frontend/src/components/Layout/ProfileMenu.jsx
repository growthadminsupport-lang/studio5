import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="profile-menu">
      <button className="profile-avatar" onClick={() => setOpen(!open)}>
        👤 ▾
      </button>

      {open && (
        <div className="profile-dropdown">
          <Link to="/profile" onClick={() => setOpen(false)}>Profile</Link>
          <Link to="/settings" onClick={() => setOpen(false)}>Settings</Link>
          <button onClick={handleLogout}>Log out</button>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;