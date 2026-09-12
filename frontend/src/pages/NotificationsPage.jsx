import { X } from "lucide-react";
import { useNotifications } from "../context/NotificationsContext";
import profileAvatar from "../assets/profileAvator.png";
import "./NotificationsPage.css";

function NotificationsPage() {
  // Read shared notifications and dismissal handler from global context
  const { notifications, markAsRead } = useNotifications();

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
                onClick={() => markAsRead(item.id)}
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