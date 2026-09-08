import { Link } from "react-router-dom";
import "./PublicLayout.css";

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div>
          <h3>GrowTH</h3>
          <p>
            Faculty of Engineering, Khon Kaen University — Digital Media
            Engineering Department
          </p>
          <p className="public-footer__disclaimer">
            © 2026 GrowTH. Medical Disclaimer: this platform is for tracking
            purposes only and does not replace professional medical advice.
          </p>
        </div>
        <div className="public-footer__links">
          <Link to="/privacy-notice">Privacy Policy</Link>
          <Link to="/contact">Contact Support</Link>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;