import { Link } from "react-router-dom";

function HomePage() {
  // Sample 3 featured articles
  const featuredArticles = [
    { slug: "understanding-growth-spurts", title: "Understanding Growth Spurts" },
    { slug: "early-puberty-signs", title: "Early Puberty Signs" },
    { slug: "nutrition-for-development", title: "Nutrition for Development" },
  ];

  return (
    <section className="gt-knowledge-section">
      <div className="gt-section-header">
        <h2>Nurturing Knowledge</h2>
        {/* "View all" goes to the Knowledge / Resources page */}
        <Link to="/knowledge" className="gt-view-all-btn">
          View all
        </Link>
      </div>

      <div className="gt-articles-grid">
        {featuredArticles.map((article) => (
          <Link
            key={article.slug}
            to={`/knowledge/${article.slug}`}
            state={{ from: "home" }} /* Passes origin state */
            className="gt-article-card"
          >
            <h3>{article.title}</h3>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default HomePage;