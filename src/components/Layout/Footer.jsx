import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-section">
        <h4>About GrowTH</h4>
        <p>
          GrowTH helps caregivers track children's growth, bone age, and
          puberty development with AI-assisted tools and trusted medical
          resources.
        </p>
      </div>

      <div className="footer-links">
        <Link to="/privacy-policy">Privacy Policy</Link>
        <Link to="/terms-of-service">Terms of Service</Link>
        <Link to="/contact">Contact Us</Link>
        <Link to="/references">References</Link>
      </div>

      <div className="footer-disclaimer">
        <p>
          <strong>Medical Disclaimer:</strong> GrowTH provides informational
          and supportive tools only and does not replace professional medical
          advice, diagnosis, or treatment. Always consult a qualified
          healthcare provider.
        </p>
      </div>

      <p className="footer-copyright">
        &copy; {new Date().getFullYear()} GrowTH. All rights reserved.
      </p>
    </footer>
  );
}

export default Footer;