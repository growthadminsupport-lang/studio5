import { Link } from "react-router-dom";
import "./Footer.css";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-left">
          <h4>GrowTH</h4>

          <p>
            Faculty of Engineering, Khon Kaen University - Digital Media
            Engineering Department
          </p>

          <p className="footer-disclaimer">
            © 2026 GrowTH. Medical Disclaimer: this platform is for tracking
            purposes only and does not replace professional medical advice.
          </p>
        </div>

        <div className="footer-right">
          <Link to="/privacy-notice">Privacy Policy</Link>
          <Link to="/contact">Contact Support</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

