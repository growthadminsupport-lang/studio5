import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

function getInitialAuthState() {
  const remembered = localStorage.getItem("growth_logged_in") === "true";
  const sessionOnly = sessionStorage.getItem("growth_logged_in") === "true";
  return remembered || sessionOnly;
}

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(getInitialAuthState());
  const [email, setEmail] = useState(
    localStorage.getItem("growth_user_email") ||
      sessionStorage.getItem("growth_user_email") ||
      ""
  );

  const login = (userEmail, remember) => {
    if (remember) {
      localStorage.setItem("growth_logged_in", "true");
      localStorage.setItem("growth_user_email", userEmail);
    } else {
      sessionStorage.setItem("growth_logged_in", "true");
      sessionStorage.setItem("growth_user_email", userEmail);
    }
    setEmail(userEmail);
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("growth_logged_in");
    localStorage.removeItem("growth_user_email");
    sessionStorage.removeItem("growth_logged_in");
    sessionStorage.removeItem("growth_user_email");
    setEmail("");
    setIsLoggedIn(false);
  };


  const user = isLoggedIn ? { email } : null;

  return (
    <AuthContext.Provider value={{ isLoggedIn, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}