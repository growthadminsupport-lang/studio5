import { useState } from "react";
import { X } from "lucide-react";
import profileAvatar from "../assets/profileAvator.png";
import "./NotificationsPage.css";
import { useNotifications } from "../context/NotificationsContext";
function NotificationsPage() {
  const { notifications, markAsRead } = useNotifications([
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
  markAsRead(id); 
  }

  return (
    <div className="notifications-page-container">
      <h1 className="notifications-title">Notifications</h1>

      {notifications.length === 0 ? (
        <p className="no-notifications-text">No notifications yet</p>
      ) : (
        <div className="notifications-list">
          {notifications.map((item) => (
            <div key={item.id} className="notification-card">
              <button
                type="button"
                className="dismiss-btn"
                onClick={() => handleDismiss(item.id)}
                aria-label="Dismiss notification"
              >
                <X size={15} color="#ffffff" strokeWidth={3} />
              </button>

              <div className="notification-body">
                <div className="notification-text">
                  <h3 className="notification-card-title">{item.title}</h3>
                  <p className="notification-card-desc">{item.description}</p>
                </div>

                <div className="notification-meta">
                  <img
                    src={profileAvatar}
                    alt="User avatar"
                    className="notification-avatar"
                  />
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