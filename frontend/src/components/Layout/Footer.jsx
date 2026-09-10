import { Link } from "react-router-dom";
import "./Footer.css"; // or your existing footer stylesheet

function Footer() {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-left">
          <strong className="footer-brand">GrowTH</strong>
          <p className="footer-disclaimer">
            Faculty of Engineering, Khon Kaen University - Digital Media Engineering Department
            <br />
            © 2026 GrowTH. Medical Disclaimer: this platform is for tracking purposes only and does not replace professional medical advice.
          </p>
        </div>

        <div className="footer-right">
          <Link to="/privacy-notice" className="footer-link">
            Privacy Policy
          </Link>
          <Link to="/contact" className="footer-link">
            Contact Support
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;