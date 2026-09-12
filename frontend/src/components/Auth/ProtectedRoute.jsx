// src/components/Auth/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute() {
  const { isLoggedIn } = useAuth() || {};

  // Redirect to Home Page ('/') if unauthenticated
  return isLoggedIn ? <Outlet /> : <Navigate to="/" replace />;
}