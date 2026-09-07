import { useNotifications } from "../context/NotificationsContext";
import "../components/Layout/Notifications.css";

function NotificationsPage() {
  const { notifications, markAsRead } = useNotifications();

  return (
    <div className="notifications-page">
      <h1>Notifications</h1>
      {notifications.length === 0 ? (
        <p className="empty-state">No notifications yet</p>
      ) : (
        notifications.map((n) => (
          <div key={n.id} className="notification-card full">
            <div className="notification-text">
              <h4>{n.title}</h4>
              <p>{n.description}</p>
            </div>
            <div className="notification-side">
              <button className="notification-close" onClick={() => markAsRead(n.id)}>✕</button>
              <span className="notification-time">{n.time}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default NotificationsPage;