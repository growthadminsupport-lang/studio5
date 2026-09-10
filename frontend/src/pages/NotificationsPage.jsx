import { useState } from "react";
import { X } from "lucide-react";
import profileAvatar from "../assets/profileAvator.png";
import "./NotificationsPage.css";

function NotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Growth update available",
      description: "Your child's latest growth data has been updated.",
      time: "30 Min ago",
    },
    {
      id: 2,
      title: "Profile updated",
      description: "Your profile information has been successfully updated.",
      time: "2 hours ago",
    },
  ]);

  const handleDismiss = (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="notifications-page-container">
      <h1 className="notifications-title">Notifications</h1>

      {notifications.length === 0 ? (
        <p className="no-notifications-text">No notifications yet</p>
      ) : (
        <div className="notifications-list">
          {notifications.map((item) => (
            <div key={item.id} className="notification-card">
              {/* Red Close Button */}
              <button
                type="button"
                className="dismiss-btn"
                onClick={() => handleDismiss(item.id)}
                aria-label="Dismiss notification"
              >
                <X size={15} color="#ffffff" strokeWidth={3} />
              </button>

              <div className="notification-body">
                {/* Left side text */}
                <div className="notification-text">
                  <h3 className="notification-card-title">{item.title}</h3>
                  <p className="notification-card-desc">{item.description}</p>
                </div>

                {/* Right side avatar & time */}
                <div className="notification-meta">
                  <div className="avatar-frame">
                    <img
                      src={profileAvatar}
                      alt="User Avatar"
                      className="notification-avatar"
                    />
                  </div>
                  <span className="notification-time">{item.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;