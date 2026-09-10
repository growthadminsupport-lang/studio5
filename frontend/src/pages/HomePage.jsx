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
      {/* Nurturing Knowledge Section */}
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