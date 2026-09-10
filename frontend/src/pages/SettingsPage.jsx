import { useState } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./SettingsPage.css";

function SettingsPage() {
  const { email } = useAuth();
  const initial = email ? email.charAt(0).toUpperCase() : "G";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Validation: At least 8 characters, 1 letter, and 1 number
  const isValidNewPassword = (pw) => {
    return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
  };

  const showNewPwError = newPassword.length > 0 && !isValidNewPassword(newPassword);
  const isFormValid = currentPassword.trim().length > 0 && isValidNewPassword(newPassword);

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
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
              <span className="avatar-letter">{initial}</span>
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
            {/* Current Password */}
            <div className="float-field">
              <input
                id="currentPassword"
                type="password"
                placeholder=" "
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordSuccess(false);
                }}
              />
              <label htmlFor="currentPassword">Current password</label>
            </div>

            {/* New Password */}
            <div className={`float-field ${showNewPwError ? "error" : ""}`}>
              <input
                id="newPassword"
                type="password"
                placeholder=" "
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordSuccess(false);
                }}
              />
              <label htmlFor="newPassword">New password</label>
            </div>

            {/* Helper or Error Message */}
            {showNewPwError ? (
              <p className="error-message">
                Password must be at least 8 characters and include a letter and a number
              </p>
            ) : (
              <p className="input-hint">
                At least 8 characters, with a letter and a number
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-update-password"
              disabled={!isFormValid}
            >
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;