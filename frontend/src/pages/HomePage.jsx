import { Link } from "react-router-dom";
import "./HomePage.css";

function HomePage() {
  const featuredArticles = [
    {
      slug: "understanding-growth-spurts",
      title: "Understanding Growth Spurts",
      snippet: "Learn what triggers growth spurts and how to track height velocity accurately."
    },
    {
      slug: "early-puberty-signs",
      title: "Early Puberty Signs",
      snippet: "Recognize physical milestones and age norms for early developmental markers."
    },
    {
      slug: "nutrition-for-development",
      title: "Nutrition for Development",
      snippet: "Essential nutrients and sleep habits that foster healthy bone growth."
    }
  ];

  return (
    <div className="gt-home-container">
      {/* 1. Hero Section */}
      <section className="gt-hero">
        <div className="gt-hero-content">
          <span className="gt-hero-badge">Child Growth Tracking Aide</span>
          <h1 className="gt-hero-title">Track growth and development with confidence</h1>
          <p className="gt-hero-description">
            GrowTH helps parents and caregivers monitor height, weight, puberty signs, and bone age—all in one secure place between pediatric visits.
          </p>
          <div className="gt-hero-actions">
            <Link to="/register" className="gt-btn-primary">
              Get Started Free →
            </Link>
            <Link to="/about" className="gt-btn-secondary">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Features Section */}
      <section className="gt-features-section">
        <div className="gt-features-grid">
          <div className="gt-feature-card">
            <div className="gt-feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00685f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <h3>Growth Tracking</h3>
            <p>Plot height, weight, and BMI on standard pediatric growth references to track real trends.</p>
          </div>

          <div className="gt-feature-card">
            <div className="gt-feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00685f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
              </svg>
            </div>
            <h3>Puberty Screening</h3>
            <p>Guided questionnaires flag development timing outside typical pediatric age windows.</p>
          </div>

          <div className="gt-feature-card">
            <div className="gt-feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00685f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
              </svg>
            </div>
            <h3>Privacy First</h3>
            <p>Data is stored securely and accessible exclusively to authenticated guardians.</p>
          </div>
        </div>
      </section>

      {/* 3. Nurturing Knowledge Section */}
      <section className="gt-knowledge-section">
        <div className="gt-section-header">
          <div>
            <span className="gt-hero-badge">Knowledge</span>
            <h2>Nurturing Knowledge</h2>
          </div>
          <Link to="/knowledge" className="gt-view-all-btn">
            View all →
          </Link>
        </div>

        <div className="gt-articles-grid">
          {featuredArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/knowledge/${article.slug}`}
              state={{ from: "home" }}
              className="gt-article-card"
            >
              <div>
                <h3>{article.title}</h3>
                <p className="gt-article-snippet">{article.snippet}</p>
              </div>
              <span className="gt-article-link-text">Read Article →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;