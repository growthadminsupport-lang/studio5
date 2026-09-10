import { useState } from "react";
import { User, Camera, CheckCircle2 } from "lucide-react";
import "./SettingsPage.css";

function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (currentPassword && newPassword) {
      // Simulate password update success
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    }
  };

  return (
    <div className="settings-page-container">
      <h1 className="settings-title">Settings</h1>

      <div className="settings-cards-container">
        {/* Profile Photo Card */}
        <div className="settings-card">
          <h2>Profile photo</h2>
          <div className="avatar-wrapper">
            <div className="photo-avatar">
              <User size={48} />
              <button
                type="button"
                className="camera-badge"
                aria-label="Upload photo"
              >
                <Camera size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="settings-card">
          <h2>Change password</h2>

          {passwordSuccess && (
            <div className="success-alert">
              <CheckCircle2 size={22} className="success-icon" />
              <span>Password updated.</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword}>
            <div className="settings-input-group">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="settings-input-group">
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <p className="input-hint">
                At least 8 characters, with a letter and a number
              </p>
            </div>

            <button type="submit" className="btn-primary">
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;