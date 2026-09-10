import { Link } from "react-router-dom";

function KnowledgePage() {
  const allArticles = [
    { slug: "navigating-growth-spurts", title: "navigating-growth-spurts" },
    { slug: "early-puberty-signs", title: "Early Puberty Signs" },
    { slug: "nutrition-for-development", title: "Nutrition for Development" },
    // additional articles...
  ];

  return (
    <div className="gt-knowledge-container">
      <h1>Knowledge & Resources</h1>
      <div className="gt-articles-grid">
        {allArticles.map((article) => (
          <Link
            key={article.slug}
            to={`/knowledge/${article.slug}`}
            state={{ from: "knowledge" }}
            className="gt-article-card"
          >
            <h3>{article.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default KnowledgePage;