import { useNavigate, Link } from "react-router-dom";
import { 
  TrendingUp, 
  Sparkles, 
  Play, 
  Ruler, 
  Utensils, 
  BriefcaseMedical, 
  ArrowRight 
} from "lucide-react";
import logoImg from "../assets/logo.png"; // Ensure path matches your project assets
import "./HomePage.css";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="gt-home-container">
      {/* Hero Section */}
      <section className="gt-home-hero">
        <div className="gt-hero-logo-wrapper">
          <img src={logoImg} alt="GrowTH Logo" className="gt-hero-logo-img" />
        </div>
        <h1 className="gt-hero-title">Nurture Every Milestone</h1>
        <p className="gt-hero-description">
          GrowTH is the intelligent companion for parents, providing actionable insights
          and calm tracking for your child's developmental journey.
        </p>
        <div className="gt-hero-cta-group">
          <button 
            type="button" 
            className="gt-btn-primary" 
            onClick={() => navigate("/login")}
          >
            Start tracking
          </button>
          <button 
            type="button" 
            className="gt-btn-secondary" 
            onClick={() => navigate("/about")}
          >
            Learn More
          </button>
        </div>
      </section>

      {/* Comprehensive Dashboard Preview Section */}
      <section className="gt-home-section gt-text-center">
        <h2 className="gt-section-title">Comprehensive Dashboard</h2>
        <p className="gt-section-subtitle">
          Monitor growth metrics with professional precision on any device.
        </p>

        <div className="gt-browser-mockup">
          <div className="gt-browser-header">
            <span className="gt-dot red"></span>
            <span className="gt-dot yellow"></span>
            <span className="gt-dot green"></span>
          </div>
          <div className="gt-browser-body">
            <div className="gt-mock-nav">
              <div className="gt-mock-line short"></div>
            </div>
            <div className="gt-mock-cards-row">
              <div className="gt-mock-card-stub"></div>
              <div className="gt-mock-card-stub"></div>
              <div className="gt-mock-card-stub"></div>
            </div>
            <div className="gt-mock-chart-container">
              <svg viewBox="0 0 500 100" className="gt-mock-chart-svg">
                <path
                  d="M 10 80 Q 150 75, 280 40 T 490 15"
                  fill="none"
                  stroke="#00685f"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* For Parents Who Care Section */}
      <section className="gt-home-section gt-about-split">
        <div className="gt-mobile-mockup-col">
          <div className="gt-mobile-frame">
            <div className="gt-mobile-header-bar"></div>
            <div className="gt-mobile-card-item"></div>
            <div className="gt-mobile-card-item"></div>
            <div className="gt-mobile-chart-area">
              <svg viewBox="0 0 200 60" className="gt-mobile-chart-svg">
                <path
                  d="M 10 45 Q 80 40, 120 25 T 190 10"
                  fill="none"
                  stroke="#00685f"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="gt-about-content-col">
          <span className="gt-section-tag">About GrowTH</span>
          <h2 className="gt-section-title left-align">For Parents Who Care</h2>
          <p className="gt-section-text">
            Designed specifically for proactive parents, GrowTH translates complex
            developmental data into simple, actionable insights. We believe in providing
            clarity over clutter, so you can focus on what matters most — your child's well-being.
          </p>

          <div className="gt-feature-cards-grid">
            <div className="gt-mini-feature-card">
              <TrendingUp size={20} color="#00685f" />
              <div>
                <h4>Track Progress</h4>
                <p>Log measurements and physical growth metrics with ease.</p>
              </div>
            </div>

            <div className="gt-mini-feature-card">
              <Sparkles size={20} color="#00685f" />
              <div>
                <h4>AI-Assisted</h4>
                <p>Bone age & trend predictions tailored to your child.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video / Demo Showcase Section */}
      <section className="gt-home-section">
        <div className="gt-video-card">
          <button type="button" className="gt-play-btn" aria-label="Play demo video">
            <Play size={28} color="#ffffff" fill="#ffffff" />
          </button>
          <span className="gt-video-tag">Demo video — coming soon</span>
        </div>
      </section>

      {/* Nurturing Knowledge Section */}
      <section className="gt-home-section">
        <div className="gt-section-header-flex">
          <div>
            <h2 className="gt-section-title left-align">Nurturing Knowledge</h2>
            <p className="gt-section-subtitle left-align">
              Expert articles to guide you through every stage.
            </p>
          </div>
          <Link to="/learn" className="gt-view-all-link">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="gt-articles-grid">
          {/* Article 1 */}
          <div className="gt-article-card" onClick={() => navigate("/learn")}>
            <div className="gt-article-banner teal-bg">
              <Ruler size={32} color="#00685f" />
            </div>
            <div className="gt-article-body">
              <span className="gt-article-category">Article</span>
              <h3 className="gt-article-title">Navigating Growth Spurts</h3>
              <p className="gt-article-desc">
                When the pubertal growth spurt happens, how fast it goes, and which changes are worth a doctor's attention.
              </p>
            </div>
          </div>

          {/* Article 2 */}
          <div className="gt-article-card" onClick={() => navigate("/learn")}>
            <div className="gt-article-banner mint-bg">
              <Utensils size={32} color="#00685f" />
            </div>
            <div className="gt-article-body">
              <span className="gt-article-category">Guide</span>
              <h3 className="gt-article-title">Nutrition for Pre-teens</h3>
              <p className="gt-article-desc">
                Calcium, vitamin D, iron and protein targets for ages 9–13 — and the everyday habits that matter more than any single nutrient.
              </p>
            </div>
          </div>

          {/* Article 3 */}
          <div className="gt-article-card" onClick={() => navigate("/learn")}>
            <div className="gt-article-banner yellow-bg">
              <BriefcaseMedical size={32} color="#d97706" />
            </div>
            <div className="gt-article-body">
              <span className="gt-article-category">Explainer</span>
              <h3 className="gt-article-title">Understanding Bone Age</h3>
              <p className="gt-article-desc">
                How skeletal maturity is read from a hand X-ray, why a doctor would order one, and the limits of what it can tell you.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;