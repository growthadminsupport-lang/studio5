import { useState } from "react";
import { MapPin, Mail, Bug, CheckCircle2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./ContactPage.css";

function ContactPage() {
  const { email: userEmail } = useAuth() || {};
  const activeEmail = userEmail || "growth.admin.support@gmail.com";

  const [email, setEmail] = useState(activeEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setShowSuccess(true);
    setSubject("");
    setMessage("");
  };

  return (
    <div className="gt-contact-wrapper">
      <span className="gt-contact-subtitle">Contact</span>
      <h1 className="gt-contact-title">Get in touch</h1>

      <div className="gt-contact-stack">
        {/* Top Info Card */}
        <div className="gt-contact-card">
          <div className="gt-info-row">
            <div className="gt-info-icon">
              <MapPin size={20} color="#00685f" />
            </div>
            <div className="gt-info-content">
              <strong>Department</strong>
              <p>
                Digital Media Engineering Program, Faculty of Engineering<br />
                Khon Kaen University, Mueang Khon Kaen District, Khon Kaen 40002, Thailand
              </p>
            </div>
          </div>

          <div className="gt-info-row">
            <div className="gt-info-icon">
              <Mail size={20} color="#00685f" />
            </div>
            <div className="gt-info-content">
              <strong>Email</strong>
              <p>
                Contact the Faculty of Engineering, KKU DME program directly — exact department email TBD.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Form Card */}
        <div className="gt-contact-card">
          <div className="gt-form-header">
            <div className="gt-title-with-icon">
              <Bug size={22} color="#00685f" className="gt-bug-icon" />
              <h2>Report a bug / contact support</h2>
            </div>
            <p className="gt-signed-in">
              Signed in as {activeEmail} — we’ll use this to follow up.
            </p>
          </div>

          {/* Success Banner */}
          {showSuccess && (
            <div className="gt-success-banner">
              <div className="gt-banner-text">
                <CheckCircle2 size={18} color="#00685f" />
                <span>Thank - your message has been sent.</span>
              </div>
              <button
                type="button"
                className="gt-banner-close"
                onClick={() => setShowSuccess(false)}
                aria-label="Close notification"
              >
                <X size={16} color="#00685f" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="gt-contact-form">
            {/* Email Field */}
            <div className="gt-float-field">
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
            <div className="gt-float-field">
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
            <div className="gt-float-field">
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

            <button type="submit" className="gt-send-btn">
              Send message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;