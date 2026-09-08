import { createContext, useContext, useState } from "react";

const NotificationsContext = createContext(null);

const initial = [
  { id: 1, title: "Growth update available", description: "Your child's latest growth data has been updated.", time: "30 Min ago", read: false },
  { id: 2, title: "Profile updated", description: "Your profile information has been successfully updated.", time: "2 hours ago", read: false },
];

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(initial);

  const markAsRead = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  return (
    <NotificationsContext.Provider value={{ notifications, markAsRead, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}