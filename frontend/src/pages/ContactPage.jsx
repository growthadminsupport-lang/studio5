import { useState } from "react";
import { MapPin, Mail, Bug, Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./ContactPage.css";

function ContactPage() {
  const { email: userEmail } = useAuth() || {};
  const activeEmail = userEmail || "Momo mama@gmail.com";

  const [email, setEmail] = useState(activeEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    // Trigger success message state
    setShowSuccess(true);
    setSubject("");
    setMessage("");
  };

  return (
    <div className="contact-page-container">
      <span className="contact-subtitle">Contact</span>
      <h1 className="contact-title">Get in touch</h1>

      <div className="contact-cards-stack">
        {/* Department & Email Info Card */}
        <div className="contact-info-card">
          <div className="info-row">
            <div className="info-icon">
              <MapPin size={18} color="#00685f" />
            </div>
            <div className="info-content">
              <strong>Department</strong>
              <p>
                Digital Media Engineering Program, Faculty of Engineering
                <br />
                Khon Kaen University, Mueang Khon Kaen District, Khon Kaen 40002, Thailand
              </p>
            </div>
          </div>

          <div className="info-row">
            <div className="info-icon">
              <Mail size={18} color="#00685f" />
            </div>
            <div className="info-content">
              <strong>Email</strong>
              <p>
                Contact the Faculty of Engineering, KKU DME program directly — exact department email TBD.
              </p>
            </div>
          </div>
        </div>

        {/* Support Form Card */}
        <div className="contact-form-card">
          <div className="form-header">
            <div className="form-header-title">
              <Bug size={20} color="#00685f" className="bug-icon" />
              <h2>Report a bug / contact support</h2>
            </div>
            <p className="signed-in-text">
              Signed in as {activeEmail} — we’ll use this to follow up.
            </p>
          </div>

          {/* Thank You Success Banner */}
          {showSuccess && (
            <div className="contact-success-banner">
              <div className="banner-left">
                <Check size={16} className="check-icon" />
                <span>Thank - your message has been sent.</span>
              </div>
              <button
                type="button"
                className="close-banner-btn"
                onClick={() => setShowSuccess(false)}
                aria-label="Close notification"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="contact-form">
            {/* Your Email Field */}
            <div className="float-field">
              <input
                id="contactEmail"
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="contactEmail">Your email *</label>
            </div>

            {/* Subject Field */}
            <div className="float-field">
              <input
                id="contactSubject"
                type="text"
                placeholder=" "
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <label htmlFor="contactSubject">Subject*</label>
            </div>

            {/* Message Field */}
            <div className="float-field text-area-field">
              <textarea
                id="contactMessage"
                placeholder=" "
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <label htmlFor="contactMessage">Message*</label>
            </div>

            <button type="submit" className="btn-send-message">
              Send message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;