import { Outlet } from "react-router-dom";
import PublicNavbar from "./PublicNavbar";
import PublicFooter from "./PublicFooter";
import "./PublicLayout.css";

function PublicLayout() {
  return (
    <div className="public-layout">
      <PublicNavbar />
      <div className="public-layout__content">
        <Outlet />
      </div>
      <PublicFooter />
    </div>
  );
}

export default PublicLayout;