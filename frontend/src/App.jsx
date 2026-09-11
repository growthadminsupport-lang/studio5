import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/Layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import GrowthPage from "./pages/GrowthPage";
import PubertyPage from "./pages/PubertyPage";
import BoneAgePage from "./pages/BoneAgePage";
import KnowledgePage from "./pages/KnowledgePage";
import ProfilePage from "./pages/ProfilePage";
import PrivacyNoticePage from "./pages/PrivacyNoticePage";
import TermsOfUsePage from "./pages/TermsOfUsePage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import NotificationsPage from "./pages/NotificationsPage";
import ArticlePage from "./pages/ArticlePage";
import SettingsPage from "./pages/SettingsPage";
import ContactPage from "./pages/ContactPage";
import { useAuth } from "./context/AuthContext"; // adjust path if needed

function App() {
  const { isLoggedIn } = useAuth() || {};

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
      />

      {/* Public Pages */}
      <Route element={<MainLayout />}>
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/knowledge/:slug" element={<ArticlePage />} />
        <Route path="/privacy-notice" element={<PrivacyNoticePage />} />
        <Route path="/terms" element={<TermsOfUsePage />} />
      </Route>

      {/* Standalone Auth Pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected App Pages */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/growth" element={<GrowthPage />} />
          <Route path="/puberty" element={<PubertyPage />} />
          <Route path="/bone-age" element={<BoneAgePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;