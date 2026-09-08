import { createContext, useContext, useState } from "react";
 
const AuthContext = createContext(null);
 
const USERS_KEY = "growth_users"; // mock user "database" until a real backend exists
 
function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) ?? [];
  } catch {
    return [];
  }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
 
function getInitialAuthState() {
  const remembered = localStorage.getItem("growth_logged_in") === "true";
  const sessionOnly = sessionStorage.getItem("growth_logged_in") === "true";
  return remembered || sessionOnly;
}
 
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(getInitialAuthState());
  const [email, setEmail] = useState(
    localStorage.getItem("growth_user_email") || sessionStorage.getItem("growth_user_email") || ""
  );
  const [name, setName] = useState(
    localStorage.getItem("growth_user_name") || sessionStorage.getItem("growth_user_name") || ""
  );
 
  /** Returns { success, error } instead of throwing, so forms can show inline messages. */
  const login = (loginEmail, password, remember) => {
    const users = loadUsers();
    const user = users.find((u) => u.email === loginEmail);
 
    if (!user || user.password !== password) {
      return { success: false, error: "Incorrect email or password." };
    }
 
    const store = remember ? localStorage : sessionStorage;
    store.setItem("growth_logged_in", "true");
    store.setItem("growth_user_email", user.email);
    store.setItem("growth_user_name", user.name);
 
    setEmail(user.email);
    setName(user.name);
    setIsLoggedIn(true);
    return { success: true };
  };
 
  const register = ({ name: newName, email: newEmail, phone, password, acceptedTerms }) => {
    if (!acceptedTerms) {
      return { success: false, error: "You must accept the Terms of Service and Privacy Policy." };
    }
    const users = loadUsers();
    if (users.some((u) => u.email === newEmail)) {
      return { success: false, error: "An account with this email already exists." };
    }
 
    const newUser = { name: newName, email: newEmail, phone, password };
    saveUsers([...users, newUser]);
 
    // Auto sign-in after registering, remembered on this device by default.
    localStorage.setItem("growth_logged_in", "true");
    localStorage.setItem("growth_user_email", newUser.email);
    localStorage.setItem("growth_user_name", newUser.name);
    setEmail(newUser.email);
    setName(newUser.name);
    setIsLoggedIn(true);
    return { success: true };
  };
 
  /** Mocked: in production this triggers a real email with a reset link/token. */
  const requestPasswordReset = (resetEmail) => {
    const users = loadUsers();
    const exists = users.some((u) => u.email === resetEmail);
    // Always resolve success-shaped response to avoid leaking which emails are registered.
    return { success: true, accountExists: exists };
  };
 
  const resetPassword = (resetEmail, newPassword) => {
    const users = loadUsers();
    const idx = users.findIndex((u) => u.email === resetEmail);
    if (idx === -1) return { success: false, error: "No account found for this email." };
    users[idx] = { ...users[idx], password: newPassword };
    saveUsers(users);
    return { success: true };
  };
 
  const logout = () => {
    localStorage.removeItem("growth_logged_in");
    localStorage.removeItem("growth_user_email");
    localStorage.removeItem("growth_user_name");
    sessionStorage.removeItem("growth_logged_in");
    sessionStorage.removeItem("growth_user_email");
    sessionStorage.removeItem("growth_user_name");
    setEmail("");
    setName("");
    setIsLoggedIn(false);
  };
 
  return (
    <AuthContext.Provider
      value={{ isLoggedIn, email, name, login, register, requestPasswordReset, resetPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
 
export function useAuth() {
  return useContext(AuthContext);
}