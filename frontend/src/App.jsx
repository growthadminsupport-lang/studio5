import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import GrowthPage from "./pages/GrowthPage.jsx";
import ScreeningPage from "./pages/ScreeningPage.jsx";
import BoneAgePage from "./pages/BoneAgePage.jsx";
import KnowledgePage from "./pages/KnowledgePage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/growth" element={<GrowthPage />} />
      <Route path="/screening" element={<ScreeningPage />} />
      <Route path="/bone-age" element={<BoneAgePage />} />
      <Route path="/knowledge" element={<KnowledgePage />} />
    </Routes>
  );
}