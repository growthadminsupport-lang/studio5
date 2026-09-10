import { Link } from "react-router-dom";
import { useState } from "react";
import "./Knowledge.css";

// Import your icon assets (or use public folder URLs like "/images/ruler.png")
import rulerIcon from "./assets/ruler.png";
import cutleryIcon from "./assets/cutlery.png";
import bandageIcon from "./assets/bandage.png";

const articles = [
  {
    id: 1,
    slug: "navigating-growth-spurts",
    label: "Article",
    title: "Navigating Growth Spurts",
    desc: "When the pubertal growth spurt happens, how fast it goes, and which changes are worth a doctor's attention.",
    category: "growth",
    icon: rulerIcon,
    color: "teal",
  },
  {
    id: 2,
    slug: "nutrition-for-pre-teens",
    label: "Guide",
    title: "Nutrition for Pre-teens",
    desc: "Calcium, vitamin D, iron and protein targets for ages 9–13 — and the everyday habits that matter more than any single nutrient.",
    category: "nutrition",
    icon: cutleryIcon,
    color: "mint",
  },
  {
    id: 3,
    slug: "understanding-bone-age",
    label: "Explainer",
    title: "Understanding Bone Age",
    desc: "How skeletal maturity is read from a hand X-ray, why a doctor would order one, and the limits of what it can tell you.",
    category: "bone age",
    icon: bandageIcon,
    color: "cream",
  },
];

const categories = ["all", "bone age", "growth", "nutrition"];

function ArticleList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = articles.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || a.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="knowledge-section">
      <h2 className="knowledge-heading">Learn</h2>
      <input
        type="text"
        placeholder="Search articles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="knowledge-search"
      />

      <div className="knowledge-filters">
        {categories.map((cat) => (
          <button
            key={cat}
            className={category === cat ? "active" : ""}
            onClick={() => setCategory(cat)}
          >
            {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="knowledge-grid">
        {filtered.map((a) => (
          <div key={a.id} className="knowledge-card">
            <div className={`knowledge-icon-tile ${a.color}`}>
              <img src={a.icon} alt={a.title} className="knowledge-icon-img" />
            </div>
            <div className="knowledge-card-body">
              <span className="knowledge-label">{a.label}</span>
              <h3>{a.title}</h3>
              <p>{a.desc}</p>
              <p className="knowledge-citation">Source: reviewed medical references</p>
              <Link
                to={`/knowledge/${a.slug}`}
                className="knowledge-readmore"
              >
                Read More
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ArticleList;