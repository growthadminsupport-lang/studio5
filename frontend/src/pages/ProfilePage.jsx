// src/pages/ProfilePage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./ProfilePage.css";

function ProfilePage() {
  const { logout, email } = useAuth() || {};
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("Name XX");

  const handleSave = (e) => {
    e.preventDefault();
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account?")) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="account-page-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-large">
          <User size={40} />
        </div>
        <h2 className="profile-name">{fullName || "User Name"}</h2>
        <p className="profile-email">{email || "username@gmail.com"}</p>
        <Link to="/settings" className="profile-settings-link">
          <Settings size={16} />
          <span>Photo & password settings</span>
        </Link>
      </div>

      <div className="account-cards-container">
        {/* Account Card (Full-width Input + Save Button) */}
        <div className="account-card">
          <h3>Account</h3>
          <form onSubmit={handleSave}>
            <div className="input-group">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary">
              Save changes
            </button>
          </form>
        </div>

        {/* Log Out Card (Full-width Outlined Button) */}
        <div className="account-card">
          <button type="button" className="btn-outline" onClick={handleLogout}>
            Log out
          </button>
        </div>

        {/* Danger Zone Card (Full-width Danger Button) */}
        <div className="account-card">
          <h3>Danger zone</h3>
          <button
            type="button"
            className="btn-danger-outline"
            onClick={handleDeleteAccount}
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;