
import { Link } from "react-router-dom";
import "../components/Auth/Auth.css";
import "./PrivacyNotice.css";

function TermsOfUsePage() {
  return (
    <div className="auth-page">
      <div className="privacy-card">
        <h1>Terms of Use</h1>

        <p>
          Welcome to GrowTH. GrowTH is a class project developed by Digital
          Media Engineering students at Khon Kaen University. By creating an
          account or using this website, you agree to use the service
          responsibly and according to these Terms of Use.
        </p>

        <h2>1. About GrowTH</h2>
        <p>
          GrowTH is designed to help users record and monitor child growth,
          review puberty screening information, and explore AI-assisted bone
          age screening results. The application is intended for educational
          and informational purposes.
        </p>

        <h2>2. Medical Disclaimer</h2>
        <p>
          GrowTH does not provide medical diagnosis, treatment, or professional
          medical advice. Growth percentiles, puberty screening summaries, and
          AI-assisted bone-age predictions are estimates and should not be
          used as a substitute for assessment by a qualified healthcare
          professional.
        </p>
        <p>
          If you have concerns about a child's growth, development, puberty,
          or bone age, please consult an appropriate healthcare professional.
        </p>

        <h2>3. Your Account</h2>
        <p>
          You are responsible for providing accurate information when creating
          an account and for keeping your account credentials secure. You
          should not share your password with other people or allow others to
          use your account.
        </p>

        <h2>4. Child Information</h2>
        <p>
          You should only add information about a child when you are
          authorized to provide and manage that information. You are
          responsible for ensuring that the information you enter is accurate
          and appropriate for the intended use of the application.
        </p>

        <h2>5. Use of the Service</h2>
        <p>
          You agree to use GrowTH only for lawful and appropriate purposes.
          You must not attempt to access another user's account, modify or
          damage the application, interfere with its operation, or use the
          service to upload harmful or inappropriate content.
        </p>

        <h2>6. AI-Assisted Results</h2>
        <p>
          Any AI-assisted bone-age prediction provided by GrowTH is an
          experimental or educational feature. AI results may contain errors
          and should not be treated as medically confirmed measurements or
          diagnoses.
        </p>

        <h2>7. Your Data</h2>
        <p>
          Information you provide to GrowTH is handled according to our
          Privacy Notice. We use the information to provide the features of
          the application and do not sell your personal information to third
          parties.
        </p>

        <h2>8. Accuracy and Availability</h2>
        <p>
          We aim to provide useful and accurate information, but GrowTH is a
          student project and may contain errors, incomplete information, or
          temporary technical problems. We do not guarantee that the service
          will always be available or that every result will be accurate.
        </p>

        <h2>9. Changes to the Service</h2>
        <p>
          GrowTH may be updated, changed, or discontinued as part of the
          development of the class project. Features and functionality may
          change without prior notice.
        </p>

        <h2>10. Acceptance of These Terms</h2>
        <p>
          By creating an account and using GrowTH, you acknowledge that you
          have read and understood these Terms of Use and agree to use the
          application responsibly.
        </p>

        <Link to="/register" className="privacy-back-link">
          ← Back to registration
        </Link>
      </div>
    </div>
  );
}

export default TermsOfUsePage;

