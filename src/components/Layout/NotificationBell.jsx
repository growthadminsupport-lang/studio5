import { useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../context/NotificationsContext";
import "./Notifications.css";

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, markAsRead, clearAll } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="profile-menu">
      <button className="bell-button" onClick={() => setOpen(!open)}>
        🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
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
                  <span className="notification-time">{n.time}</span>
                </div>
                <button className="notification-close" onClick={() => markAsRead(n.id)}>
                  ✕
                </button>
              </div>
            ))
          )}
          <div className="dropdown-actions">
            <Link to="/notifications" onClick={() => setOpen(false)}>View All</Link>
            <button onClick={clearAll}>Clear All</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;