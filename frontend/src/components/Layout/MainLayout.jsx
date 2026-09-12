import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import { useAuth } from "../../context/AuthContext";
import "./MainLayout.css";

function MainLayout() {
  const { isLoggedIn } = useAuth() || {};

  return (
    <div className="main-layout">
      <Navbar />
      <main className="page-content">
        <Outlet />
      </main>
      <Footer />
      {isLoggedIn && <BottomNav />}
    </div>
  );
}

export default MainLayout;