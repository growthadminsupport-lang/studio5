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

function App() {
  return (
    <Routes>
      {/* Auth pages — standalone without Navbar/Footer */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/privacy-notice" element={<PrivacyNoticePage />} />
      <Route path="/terms" element={<TermsOfUsePage />} />

      {/* App pages — wrapped in Navbar/Footer */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/growth" element={<GrowthPage />} />
          <Route path="/puberty" element={<PubertyPage />} />
          <Route path="/bone-age" element={<BoneAgePage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/knowledge/:slug" element={<ArticlePage />} />
          <Route path="/privacy" element={<PrivacyNoticePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;