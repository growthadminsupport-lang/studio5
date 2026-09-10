import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../components/Auth/Auth.css";
import "./PrivacyNotice.css";

function PrivacyNoticePage() {
  const navigate = useNavigate();
  const auth = useAuth();

  // Checks for either email or user object from AuthContext
  const isLoggedIn = Boolean(auth?.email || auth?.user);

  const handleBack = () => {
    if (isLoggedIn) {
      navigate(-1); // Returns to previous page in app
    } else {
      navigate("/register");
    }
  };

  return (
    <div className="auth-page">
      <div className="privacy-card">
        <h1>Privacy Notice</h1>
        <p>
          GrowTH is a class project (Digital Media Engineering, Khon Kaen
          University) for tracking child growth, puberty development, and
          AI-assisted bone age screening. This notice explains what data we
          collect, why, and how it's handled, in the spirit of Thailand's
          Personal Data Protection Act (PDPA).
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Account: full name, email, phone number, hashed password.</li>
          <li>Child profile: name, sex, date of birth, and your relationship to the child.</li>
          <li>Growth records: height, weight, and the date measured.</li>
          <li>Puberty screening answers, as reported by you.</li>
          <li>Bone-age X-ray images you choose to upload, and any resulting prediction.</li>
        </ul>
        <p>
          We only collect what each feature needs to function (data
          minimization) — nothing is sold or shared with third parties.
        </p>

        <h2>How it's used</h2>
        <p>
          To calculate growth percentiles/SDS against standard pediatric
          growth references, compile puberty screening summaries, and (once
          connected) run bone-age prediction — all shown back to you inside
          your own account. None of these results are a clinical diagnosis.
        </p>

        <h2>How it's stored</h2>
        <p>
          Data lives in a PostgreSQL database. Passwords are hashed (never
          stored in plain text). A child's records are only visible to
          accounts linked to that child as a guardian — not to other users.
        </p>

        <h2>Your controls</h2>
        <p>
          You can edit or delete any growth record, puberty screening, or
          child profile at any time from within the app. You can delete your
          entire account from your Profile page, which removes your login
          and unlinks you from any children's records.
        </p>

        <button
          type="button"
          className="privacy-back-link"
          onClick={handleBack}
        >
          ← {isLoggedIn ? "Back" : "Back to registration"}
        </button>
      </div>
    </div>
  );
}

export default PrivacyNoticePage;