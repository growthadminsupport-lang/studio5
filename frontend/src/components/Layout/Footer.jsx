import { Link } from "react-router-dom";
import "./Footer.css";

function Footer() {
  return (
    <footer className="gt-footer">
      <div className="gt-footer-container">
        {/* Left Side: Brand & Disclaimer */}
        <div className="gt-footer-brand">
          <h3 className="gt-footer-logo">GrowTH</h3>
          <p className="gt-footer-subtext">
            Faculty of Engineering, Khon Kaen University - Digital Media Engineering Department
          </p>
          <p className="gt-footer-disclaimer">
            © 2026 GrowTH. Medical Disclaimer: this platform is for tracking purposes only and does not replace professional medical advice.
          </p>
        </div>

        {/* Right Side: Links */}
        <div className="gt-footer-links">
          <Link to="/privacy-notice">Privacy Policy</Link>
          <Link to="/contact">Contact Support</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;