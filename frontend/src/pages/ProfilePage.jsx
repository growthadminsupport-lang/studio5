// src/pages/ProfilePage.jsx
import { Link, useNavigate } from "react-router-dom";
import { User, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./ProfilePage.css";

function ProfilePage() {
  const { logout, email, user } = useAuth() || {};
  const navigate = useNavigate();
  const fullName = user?.full_name || '';

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="account-page-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-large">
          <User size={40} />
        </div>
        <h2 className="profile-name">{fullName || "User Name"}</h2>
        <p className="profile-email">{email}</p>
        <Link to="/settings" className="profile-settings-link">
          <Settings size={16} />
          <span>Account settings</span>
        </Link>
      </div>

      <div className="account-cards-container">
        {/* Account Card (Full-width Input + Save Button) */}
        <div className="account-card">
          <h3>Account</h3>
          <p>Full name: {fullName}</p>
          <p>Email: {email}</p>
        </div>

        {/* Log Out Card (Full-width Outlined Button) */}
        <div className="account-card">
          <button type="button" className="btn-outline" onClick={handleLogout}>
            Log out
          </button>
        </div>


      </div>
    </div>
  );
}

export default ProfilePage;