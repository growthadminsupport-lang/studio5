import { Link } from "react-router-dom";
import "./LegalPage.css";

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-page__inner">
        <Link to="/register" className="legal-page__back">
          &larr; Back to Registration
        </Link>

        <h1>Terms of Service</h1>
        <p className="legal-page__updated">Last updated: September 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account and using GrowTH, you agree to these Terms of Service. If you do not agree,
            please do not use the platform.
          </p>
        </section>

        <section>
          <h2>2. Who Can Use GrowTH</h2>
          <p>
            GrowTH is intended for parents and legal guardians tracking the growth and development of children in
            their care. You are responsible for the accuracy of the information you enter about your family.
          </p>
        </section>

        <section>
          <h2>3. Not a Medical Service</h2>
          <p>
            GrowTH provides tracking tools and AI-assisted screening features, including bone age estimation and
            puberty questionnaires. These features are informational only and do not constitute medical advice,
            diagnosis, or treatment. Always consult a qualified healthcare provider for medical decisions
            concerning your child.
          </p>
        </section>

        <section>
          <h2>4. Your Account</h2>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials and for all activity
            under your account. Notify us immediately if you suspect unauthorized access.
          </p>
        </section>

        <section>
          <h2>5. Acceptable Use</h2>
          <p>
            You agree not to misuse the platform, including uploading content that isn&rsquo;t your own child&rsquo;s
            medical images, attempting to access other users&rsquo; data, or using the service for any unlawful
            purpose.
          </p>
        </section>

        <section>
          <h2>6. Data &amp; Privacy</h2>
          <p>
            Your use of GrowTH is also governed by our{" "}
            <Link to="/privacy-notice">Privacy Policy</Link>, which explains how we collect, store, and protect
            your family&rsquo;s data.
          </p>
        </section>

        <section>
          <h2>7. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of GrowTH after changes are posted
            constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2>8. Contact</h2>
          <p>
            Questions about these Terms can be sent via the <Link to="/contact">Contact Us</Link> page.
          </p>
        </section>
      </div>
    </div>
  );
}