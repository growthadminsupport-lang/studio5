

import { Link } from "react-router-dom";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main Branding & Info */}
        <div className="footer-info">
          <h3>GrowTH</h3>
          <p>Faculty of Engineering, Khon Kaen University - Digital Media Engineering Department</p>
        </div>

        {/* Centered Links Row */}
        <div className="footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/contact">Contact Support</Link>
        </div>

        {/* Copyright / Disclaimer */}
        <p className="footer-disclaimer">
          © 2026 GrowTH. Medical Disclaimer: this platform is for tracking purposes only and does not replace professional medical advice.
        </p>
      </div>
    </footer>
  );
}

export default Footer;