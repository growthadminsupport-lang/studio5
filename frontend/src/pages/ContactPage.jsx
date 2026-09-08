import "./PublicPages.css";

function ContactPage() {
  return (
    <div className="public-page">
      <span className="public-page__eyebrow">Contact</span>
      <h1>Get in touch</h1>

      <div className="contact-card">
        <div className="contact-row">
          <span className="contact-icon">📍</span>
          <div>
            <h4>Department</h4>
            <p>
              Digital Media Engineering Program, Faculty of Engineering
              <br />
              Khon Kaen University, Mueang Khon Kaen District, Khon Kaen
              40002, Thailand
            </p>
          </div>
        </div>

        <div className="contact-row">
          <span className="contact-icon">✉️</span>
          <div>
            <h4>Email</h4>
            <p>
              Contact the Faculty of Engineering, KKU DME program directly —
              exact department email TBD.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;