<section className="gt-knowledge-section">
  <div className="gt-knowledge-header">
    <div>
      <span className="gt-knowledge-tag">Knowledge</span>
      <h2 className="gt-knowledge-title">Nurturing Knowledge</h2>
    </div>
    <Link to="/knowledge" className="gt-view-all-link">
      View all →
    </Link>
  </div>

  <div className="gt-articles-grid">
    <Link
      to="/knowledge/understanding-growth-spurts"
      state={{ from: "home" }}
      className="gt-article-card"
    >
      <h3>Understanding Growth Spurts</h3>
      <p>Learn what triggers growth spurts and how to track height velocity accurately.</p>
      <span className="gt-read-more">Read article →</span>
    </Link>

    <Link
      to="/knowledge/early-puberty-signs"
      state={{ from: "home" }}
      className="gt-article-card"
    >
      <h3>Early Puberty Signs</h3>
      <p>Recognize physical indicators and know when to consult a specialist.</p>
      <span className="gt-read-more">Read article →</span>
    </Link>

    <Link
      to="/knowledge/nutrition-for-development"
      state={{ from: "home" }}
      className="gt-article-card"
    >
      <h3>Nutrition for Development</h3>
      <p>Essential dietary habits and nutrients that support optimal physical growth.</p>
      <span className="gt-read-more">Read article →</span>
    </Link>
  </div>
</section>