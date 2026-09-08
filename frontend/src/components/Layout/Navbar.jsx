import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import logo from "../../assets/logo.png";
import "./Navbar.css";
 
function Navbar() {
  const { name, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const navigate = useNavigate();
 
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
 
  // Close dropdowns on outside click.
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
 
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };
 
  const recentNotifications = notifications.slice(0, 5);
 
  return (
    <header className="app-navbar">
      <div className="app-navbar__inner">
        <Link to="/dashboard" className="app-navbar__brand">
          <img src={logo} alt="GrowTH" className="app-navbar__logo" />
          <span>GrowTH</span>
        </Link>
 
        <nav className="app-navbar__links">
          <Link to="/dashboard" className="app-navbar__link">
            Dashboard
          </Link>
          <Link to="/knowledge" className="app-navbar__link">
            Knowledge Center
          </Link>
        </nav>
 
        <div className="app-navbar__actions">
          {/* Notifications */}
          <div className="dropdown-wrap" ref={notifRef}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => setShowNotifications((s) => !s)}
            >
              <BellIcon />
              {unreadCount > 0 && <span className="notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
 
            {showNotifications && (
              <div className="dropdown-panel notif-dropdown">
                <div className="dropdown-panel__header">
                  <strong>Notifications</strong>
                  {notifications.length > 0 && (
                    <button className="link-btn" onClick={clearAll}>
                      Clear all
                    </button>
                  )}
                </div>
 
                {recentNotifications.length === 0 ? (
                  <p className="dropdown-panel__empty">You&rsquo;re all caught up.</p>
                ) : (
                  <ul className="notif-dropdown__list">
                    {recentNotifications.map((n) => (
                      <li
                        key={n.id}
                        className={`notif-dropdown__item ${n.read ? "" : "notif-dropdown__item--unread"}`}
                        onClick={() => markAsRead(n.id)}
                      >
                        <strong>{n.title}</strong>
                        <p>{n.body}</p>
                        <span>{n.time}</span>
                      </li>
                    ))}
                  </ul>
                )}
 
                <button
                  className="dropdown-panel__viewall"
                  onClick={() => {
                    setShowNotifications(false);
                    navigate("/notifications");
                  }}
                >
                  View All
                </button>
              </div>
            )}
          </div>
 
          {/* Profile */}
          <div className="dropdown-wrap" ref={profileRef}>
            <button
              type="button"
              className="app-navbar__profile-btn"
              onClick={() => setShowProfileMenu((s) => !s)}
            >
              <span className="app-navbar__avatar">{(name || "U").charAt(0).toUpperCase()}</span>
            </button>
 
            {showProfileMenu && (
              <div className="dropdown-panel profile-dropdown">
                <Link to="/profile" className="profile-dropdown__item" onClick={() => setShowProfileMenu(false)}>
                  Profile
                </Link>
                <button className="profile-dropdown__item profile-dropdown__item--danger" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
 
function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
 
export default Navbar;
 