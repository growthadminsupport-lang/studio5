import { useState } from "react";

const articles = [
  {
    id: 1,
    title: "Understanding Bone Age Assessment",
    category: "bone age",
    snippet: "How bone age is measured and why it matters for growth tracking.",
    citation: "Source: American Academy of Pediatrics",
  },
  {
    id: 2,
    title: "Puberty Stages Explained",
    category: "puberty",
    snippet: "A guide to the physical stages of puberty in children.",
    citation: "Source: WHO Child Growth Standards",
  },
  {
    id: 3,
    title: "Nutrition for Healthy Growth",
    category: "nutrition",
    snippet: "Key nutrients that support healthy childhood development.",
    citation: "Source: UNICEF Nutrition Guidelines",
  },
];

const categories = ["all", "bone age", "puberty", "nutrition"];

function ArticleList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = articles.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || a.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="article-section">
      <input
        type="text"
        placeholder="Search articles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="article-search"
      />

      <div className="article-filters">
        {categories.map((cat) => (
          <button
            key={cat}
            className={category === cat ? "active" : ""}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="article-grid">
        {filtered.length === 0 ? (
          <p>No articles found.</p>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="article-card">
              <h3>{a.title}</h3>
              <p>{a.snippet}</p>
              <p className="article-citation">{a.citation}</p>
              <button>Read More</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ArticleList;