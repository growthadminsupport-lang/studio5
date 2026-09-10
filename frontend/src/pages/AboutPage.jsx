import "./AboutPage.css";

function AboutPage() {
  return (
    <div className="gt-about-container">
      <div className="gt-about-header">
        <span className="gt-about-tag">About</span>
        <h1 className="gt-about-title">What GrowTH is, and who it's for</h1>
        <p className="gt-about-description">
          GrowTH is a web application built for parents and caregivers of children from infancy
          through adolescence — anyone who wants to track a child's physical growth, screen
          for early or delayed puberty, and keep that history in one place between clinic visits.
          It's a screening and record-keeping aid, not a diagnostic tool, and it's not a substitute
          for a pediatrician.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="gt-about-grid">
        <div className="gt-about-card">
          <div className="gt-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00685f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <h3>Growth Tracking</h3>
          <p>
            Log height, weight, and BMI over time, plotted against standard pediatric growth references — not just raw numbers.
          </p>
        </div>

        <div className="gt-about-card">
          <div className="gt-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00685f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
            </svg>
          </div>
          <h3>Puberty Screening</h3>
          <p>
            A guided, sex-specific questionnaire that flags signs that fall outside the typical age range, as a screening aid.
          </p>
        </div>

        <div className="gt-about-card">
          <div className="gt-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00685f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2"></rect>
              <path d="M8 12h8"></path>
              <path d="M12 8v8"></path>
            </svg>
          </div>
          <h3>AI Bone Age (in progress)</h3>
          <p>
            Upload a hand X-ray for an AI-assisted bone age estimate to support — never replace — clinical assessment.
          </p>
        </div>

        <div className="gt-about-card">
          <div className="gt-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00685f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
            </svg>
          </div>
          <h3>Privacy by design</h3>
          <p>
            Data collection is limited to what each feature needs. A child's records stay visible only to their linked guardians.
          </p>
        </div>
      </div>

      {/* Origin Banner */}
      <div className="gt-about-origin-box">
        <h3>Where this comes from</h3>
        <p>
          GrowTH is developed as a project for the Digital Media Engineering program, Faculty of Engineering, Khon Kaen University. It's built as a class/capstone project, not a certified medical device — see the disclaimer in the footer of every page.
        </p>
      </div>
    </div>
  );
}

export default AboutPage;