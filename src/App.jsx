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
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import NotificationsPage from "./pages/NotificationsPage";
import HomePage from "./pages/HomePage";

function App() {
  return (
    <Routes>
      {/* Public routes — no login required */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/privacy-notice" element={<PrivacyNoticePage />} />

      {/* Protected routes — require login */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/growth" element={<GrowthPage />} />
          <Route path="/puberty" element={<PubertyPage />} />
          <Route path="/bone-age" element={<BoneAgePage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
export default App;