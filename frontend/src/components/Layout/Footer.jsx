import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Footer.css";

function Footer() {
  const { isLoggedIn } = useAuth() || {};

  return (
    <footer className={`footer-container ${isLoggedIn ? "has-bottom-nav" : ""}`}>
      <div className="footer-content">
        <div className="footer-info">
          <h3 className="footer-brand">GrowTH</h3>
          <p className="footer-subtitle">
            Faculty of Engineering, Khon Kaen University - Digital Media Engineering Department
          </p>
          <p className="footer-disclaimer">
            © 2026 GrowTH. Medical Disclaimer: this platform is for tracking purposes only and does not replace professional medical advice.
          </p>
        </div>

        <div className="footer-links">
          <Link to="/privacy-notice">Privacy Policy</Link>
          <Link to="/contact">Contact Support</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;