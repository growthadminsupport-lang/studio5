import { Link } from "react-router-dom";
import "./Footer.css";

function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <div className="app-footer__col">
          <h3>GrowTH</h3>
          <p>
            Faculty of Engineering, Khon Kaen University &ndash; Digital Media Engineering Department. Helping
            parents track growth, puberty development, and bone age with clarity.
          </p>
        </div>

        <div className="app-footer__col">
          <h4>Company</h4>
          <Link to="/about">About GrowTH</Link>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div className="app-footer__col">
          <h4>Legal</h4>
          <Link to="/privacy-notice">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/references">References</Link>
        </div>
      </div>

      <div className="app-footer__bottom">
        <p>&copy; {new Date().getFullYear()} GrowTH. All rights reserved.</p>
        <p className="app-footer__disclaimer">
          Medical Disclaimer: GrowTH is intended for tracking purposes only and does not replace professional
          medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider with questions
          about your child&rsquo;s health or development.
        </p>
      </div>
    </footer>
  );
}

export default Footer;