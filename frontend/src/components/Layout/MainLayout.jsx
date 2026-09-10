import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

function MainLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Outlet /> {/* Required to render child routes like AboutPage */}
      </main>
      <Footer />
    </div>
  );
}

export default MainLayout;