import { useState } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

function KnowledgePage() {
  const [search, setSearch] = useState("");

  const articles = [
    { slug: "understanding-growth-spurts", title: "Understanding Growth Spurts", snippet: "Track height velocity and biological growth spurts." },
    { slug: "early-puberty-signs", title: "Early Puberty Signs", snippet: "Physical milestones and Tanner staging guides." },
    { slug: "nutrition-for-development", title: "Nutrition for Development", snippet: "Dietary habits supporting bone growth." }
  ];

  const filtered = articles.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="gt-home-container" style={{ paddingTop: "40px" }}>
      <div className="gt-section-header">
        <h2>Knowledge Library</h2>
      </div>
      <div className="gt-articles-grid">
        {filtered.map((art) => (
          <Link key={art.slug} to={`/knowledge/${art.slug}`} className="gt-article-card">
            <h3>{art.title}</h3>
            <p className="gt-article-snippet">{art.snippet}</p>
            <span className="gt-article-link-text">Read Article →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default KnowledgePage;