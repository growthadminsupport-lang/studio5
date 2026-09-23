import { Routes, Route, Navigate } from "react-router-dom";
import ChildFormPage from "./pages/ChildFormPage";
// ...

// Auth & Context
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/Auth/ProtectedRoute";

// Layouts
import MainLayout from "./components/Layout/MainLayout";

// Pages
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ResendVerificationPage from "./pages/ResendVerificationPage";
import DashboardPage from "./pages/DashboardPage";
import GrowthPage from "./pages/GrowthPage";
import PubertyPage from "./pages/PubertyPage";
import BoneAgePage from "./pages/BoneAgePage";
import KnowledgePage from "./pages/KnowledgePage";
import ArticlePage from "./pages/ArticlePage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import PrivacyNoticePage from "./pages/PrivacyNoticePage";
import TermsOfUsePage from "./pages/TermsOfUsePage";
import ContactPage from "./pages/ContactPage";

function App() {
  const { isLoggedIn, loading } = useAuth() || {};

  if (loading) return <div role="status" className="auth-page">Restoring your session…</div>;

  return (
    <Routes>
      {/* Standalone Auth Pages */}
      <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/resend-verification" element={<ResendVerificationPage />} />

      {/* Public Pages with Navigation Header/Footer */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/knowledge/:slug" element={<ArticlePage />} />
        <Route path="/privacy-notice" element={<PrivacyNoticePage />} />
        <Route path="/terms" element={<TermsOfUsePage />} />
      </Route>

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
          <Route path="/children/new" element={<ChildFormPage />} />
          <Route path="/children/:id/edit" element={<ChildFormPage />} />
        </Route>
      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
