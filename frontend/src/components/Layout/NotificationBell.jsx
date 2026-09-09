import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useNotifications } from "../../context/NotificationsContext";
import "./Notifications.css";

function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { notifications, markAsRead, clearAll } = useNotifications();

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notification-menu">
      <button
        className="bell-button"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <Bell size={21} strokeWidth={1.8} />

        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          {notifications.length === 0 ? (
            <p className="empty-state">No notifications yet</p>
          ) : (
            notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="notification-card">
                <div className="notification-text">
                  <h4>{n.title}</h4>
                  <p>{n.description}</p>
                  <span className="notification-time">
                    {n.time}
                  </span>
                </div>

                <button
                  className="notification-close"
                  onClick={() => markAsRead(n.id)}
                  aria-label="Remove notification"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}

          <div className="dropdown-actions">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
            >
              View All
            </Link>

            <button onClick={clearAll}>
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;

