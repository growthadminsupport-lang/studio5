import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "./MainLayout.css";

function MainLayout() {
  return (
    <div className="main-layout">
      <Navbar />

      <main className="page-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default MainLayout;