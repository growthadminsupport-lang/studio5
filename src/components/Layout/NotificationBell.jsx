import { useState } from "react";
import { Link } from "react-router-dom";

const initialNotifications = [
  { id: 1, text: "Bone age result is ready for review.", read: false },
  { id: 2, text: "New article added: Understanding Puberty Stages.", read: false },
  { id: 3, text: "Growth measurement reminder for this month.", read: true },
];

function NotificationBell() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="notification-bell">
      <button onClick={() => setOpen(!open)} className="bell-button">
        🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          {notifications.length === 0 ? (
            <p className="empty-state">No notifications</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id} className={n.read ? "read" : "unread"}>
                  <span>{n.text}</span>
                  {!n.read && (
                    <button onClick={() => markAsRead(n.id)}>Mark as read</button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="dropdown-actions">
            <Link to="/notifications" onClick={() => setOpen(false)}>
              View All
            </Link>
            <button onClick={clearAll}>Clear All</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;