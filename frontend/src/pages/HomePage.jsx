import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import dashboardPreview from "../assets/logo_dashboard.png";
import IntroVideo from "../components/Layout/IntroVideo";
import { useTheme } from "../context/ThemeContext";
import "./HomePage.css";

/**
 * Public landing page — shown when there is no logged-in user.
 * Route this at "/" (or "/home") BEFORE the auth-gated Dashboard route.
 * Once a user logs in, redirect them to the real DashboardPage instead.
 */
export default function HomePage() {
  const { theme, toggleTheme } = useTheme();

  const articles = [
    {
      icon: <RulerIcon />,
      badge: "Article",
      badgeClass: "badge-mint",
      title: "Navigating Growth Spurts",
      description:
        "When the pubertal growth spurt happens, how fast it goes, and which changes are worth a doctor's attention.",
    },
    {
      icon: <ForkIcon />,
      badge: "Guide",
      badgeClass: "badge-mint",
      title: "Nutrition for Pre-teens",
      description:
        "Calcium, vitamin D, iron and protein targets for ages 9–13 — and the everyday habits that matter more than any single nutrient.",
    },
    {
      icon: <MedkitIcon />,
      badge: "Explainer",
      badgeClass: "badge-cream",
      title: "Understanding Bone Age",
      description:
        "How skeletal maturity is read from a hand X-ray, why a doctor would order one, and the limits of what it can tell you.",
    },
  ];

  return (
    <div className="home">
      {/* ---------- Navbar ---------- */}
      <header className="navbar">
        <div className="navbar__inner">
          <Link to="/" className="navbar__brand">
            <img src={logo} alt="GrowTH" className="navbar__logo" />
            <span className="navbar__brand-text">GrowTH</span>
          </Link>

          <nav className="navbar__links">
            <a href="#home" className="navbar__link navbar__link--active">
              Home
            </a>
            <a href="#about" className="navbar__link">
              About
            </a>
            <a href="#contact" className="navbar__link">
              Contact
            </a>
          </nav>

          <div className="navbar__actions">
            <Link to="/login" className="btn btn--primary btn--sm">
              Login / Sign Up
            </Link>
            <button
              type="button"
              className="icon-btn"
              aria-label="Toggle dark mode"
              onClick={toggleTheme}
            >
              <MoonIcon />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section id="home" className="hero">
          <div className="hero__plus" aria-hidden="true">
            <PlusIcon />
          </div>

          <img src={logo} alt="" className="hero__mascot" aria-hidden="true" />

          <h1 className="hero__title">Nurture Every Milestone</h1>
          <p className="hero__subtitle">
            GrowTH is the intelligent companion for parents, providing
            actionable insights and calm tracking for your child&rsquo;s
            developmental journey.
          </p>

          <div className="hero__actions">
            <Link to="/register" className="btn btn--primary">
              Start tracking
            </Link>
            <a href="#about" className="btn btn--outline">
              Learn More
            </a>
          </div>
        </section>

        {/* ---------- Comprehensive Dashboard ---------- */}
        <section className="section section--white">
          <div className="section__heading">
            <h2>Comprehensive Dashboard</h2>
            <p>Monitor growth metrics with professional precision on any device.</p>
          </div>

          <div className="browser-frame">
            <div className="browser-frame__bar">
              <span className="dot dot--red" />
              <span className="dot dot--yellow" />
              <span className="dot dot--green" />
            </div>
            <div className="browser-frame__body">
              {dashboardPreview ? (
                <img
                  src={dashboardPreview}
                  alt="GrowTH dashboard preview"
                  className="browser-frame__image"
                />
              ) : (
                <DashboardPlaceholder />
              )}
            </div>
          </div>
        </section>

        {/* ---------- About ---------- */}
        <section id="about" className="section section--tinted about">
          <div className="about__visual">
            <div className="phone-mockup">
              <div className="phone-mockup__notch" />
              <DashboardPlaceholder compact />
            </div>
          </div>

          <div className="about__content">
            <span className="eyebrow">About GROWTH</span>
            <h2>For Parents Who Care</h2>
            <p>
              Designed specifically for proactive parents, GrowTH translates
              complex developmental data into simple, actionable insights. We
              believe in providing clarity over clutter, so you can focus on
              what matters most — your child&rsquo;s well-being.
            </p>

            <div className="feature-cards">
              <div className="feature-card">
                <ChartIcon />
                <h3>Track Progress</h3>
                <p>Log milestones and physical growth with ease.</p>
              </div>
              <div className="feature-card">
                <BrainIcon />
                <h3>AI-Assisted</h3>
                <p>Bone age screening support, in one place.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Promo video ---------- */}
        <section className="section section--white">
          {/* Pass a real src once the intro video is hosted, e.g.
              <IntroVideo src="/videos/growth-intro.mp4" poster={dashboardPreview} /> */}
          <IntroVideo />
        </section>

        {/* ---------- Knowledge ---------- */}
        <section className="section section--tinted">
          <div className="knowledge__header">
            <div>
              <h2>Nurturing Knowledge</h2>
              <p>Expert articles to guide you through every stage.</p>
            </div>
            <Link to="/knowledge" className="link-cta">
              View all
            </Link>
          </div>

          <div className="knowledge__grid">
            {articles.map((item) => (
              <article className="knowledge-card" key={item.title}>
                <div className={`knowledge-card__banner ${item.badgeClass}`}>
                  {item.icon}
                </div>
                <div className="knowledge-card__body">
                  <span className="knowledge-card__badge">{item.badge}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer id="contact" className="footer">
        <div className="footer__inner">
          <div>
            <h3>GrowTH</h3>
            <p>Faculty of Engineering, Khon Kaen University – Digital Media Engineering Department</p>
            <p className="footer__disclaimer">
              © 2026 GrowTH. Medical Disclaimer: this platform is for tracking
              purposes only and does not replace professional medical advice.
            </p>
          </div>
          <div className="footer__links">
            <Link to="/privacy-notice">Privacy Policy</Link>
            <Link to="/contact">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Fallback placeholder (used if a screenshot image isn't wired up yet) ---------- */
function DashboardPlaceholder({ compact = false }) {
  return (
    <div className={`dashboard-placeholder ${compact ? "dashboard-placeholder--compact" : ""}`}>
      <div className="dashboard-placeholder__header">
        <span className="dashboard-placeholder__avatar" />
        <span className="dashboard-placeholder__line" />
      </div>
      <div className="dashboard-placeholder__row">
        <span className="dashboard-placeholder__box" />
        <span className="dashboard-placeholder__box" />
        <span className="dashboard-placeholder__box" />
      </div>
      <svg viewBox="0 0 300 80" className="dashboard-placeholder__chart" preserveAspectRatio="none">
        <polyline
          points="0,60 50,55 100,45 150,48 200,30 250,22 300,15"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

/* ---------- Inline icons (no external icon library required) ---------- */
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 15l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BrainIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3M9 4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3M9 4c0-.34.03-.67.08-1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function RulerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="9" width="18" height="6" rx="1" strokeLinejoin="round" />
      <path d="M7 9v2M11 9v3M15 9v2" strokeLinecap="round" />
    </svg>
  );
}
function ForkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11M17 3c-1.5 1.5-2 3-2 5s.5 3 2 3 2-1 2-3-.5-3.5-2-5Zm0 8v9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MedkitIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="8" width="18" height="12" rx="2" strokeLinejoin="round" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M12 12v4M10 14h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}