import { useMemo, useState } from "react";
import "./KnowledgePage.css";

const categories = ["All", "Bone Age", "Puberty", "Nutrition"];

const articles = [
  {
    id: "a1",
    category: "Puberty",
    title: "Navigating Growth Spurts",
    excerpt:
      "When the pubertal growth spurt happens, how fast it goes, and which changes are worth a doctor's attention.",
    body:
      "Growth spurts during puberty are among the most noticeable physical changes in a child's development. They typically begin earlier in girls (around ages 10–11) than boys (around ages 12–13) and can last two to three years. During peak growth, a child may gain several centimeters in a short window. Sudden clothing or shoe-size changes, increased appetite, and occasional joint discomfort are all common and expected. What's worth flagging to a pediatrician: growth that stalls unexpectedly, extreme pain, or a spurt that starts unusually early or late compared to peers.",
    citation: "American Academy of Pediatrics, Growth and Development guidelines.",
  },
  {
    id: "a2",
    category: "Nutrition",
    title: "Nutrition for Pre-teens",
    excerpt:
      "Calcium, vitamin D, iron and protein targets for ages 9–13 — and the everyday habits that matter more than any single nutrient.",
    body:
      "Pre-teens have some of the highest nutrient needs relative to body size of any life stage, driven by rapid bone and muscle growth. Calcium and vitamin D support the bone mass that will largely determine skeletal strength for life. Iron needs rise, especially once menstruation begins. Protein supports the lean tissue gained during growth spurts. Rather than obsessing over any single nutrient, focus on consistent, varied meals: dairy or fortified alternatives, iron-rich proteins, and regular meal timing to support steady energy through the day.",
    citation: "World Health Organization, Adolescent Nutrition Guidelines.",
  },
  {
    id: "a3",
    category: "Bone Age",
    title: "Understanding Bone Age",
    excerpt:
      "How skeletal maturity is read from a hand X-ray, why a doctor would order one, and the limits of what it can tell you.",
    body:
      "Bone age is estimated by comparing the growth plates and bone shapes visible on a hand-and-wrist X-ray against reference standards for typical development at each age. It offers a picture of skeletal, rather than chronological, maturity — useful when a child's growth pattern seems unusually fast or slow. A bone age a bit ahead of or behind chronological age is common and not automatically concerning; it becomes clinically relevant mainly when paired with other signs, like a significant height or pubertal timing discrepancy, which is why results are always interpreted alongside a full growth history.",
    citation: "Greulich & Pyle Atlas; Radiological Society of North America.",
  },
  {
    id: "a4",
    category: "Puberty",
    title: "Talking to Your Child About Puberty",
    excerpt: "Practical, age-appropriate ways to open the conversation before changes start, not after.",
    body:
      "Children generally feel more confident about physical changes when they've heard about them before those changes start, not after. Framing puberty as a normal, expected part of growing up — rather than something secretive — helps reduce anxiety. Short, ongoing conversations tend to land better than one long talk. Books, illustrated guides, and school health curricula can be useful supplements, but a parent's calm, matter-of-fact tone is often what a child remembers most.",
    citation: "American Academy of Pediatrics, Caring for Your Teenager.",
  },
  {
    id: "a5",
    category: "Nutrition",
    title: "Building Healthy Eating Habits Early",
    excerpt: "Why consistency and modeling matter more than restriction for children's long-term relationship with food.",
    body:
      "Research consistently shows that restrictive feeding practices can backfire, sometimes increasing a child's preoccupation with restricted foods. A more effective approach centers on offering a variety of foods regularly, modeling balanced eating as a caregiver, and avoiding using food as a reward or punishment. Involving children in meal preparation, even in small ways, has also been linked to more adventurous eating over time.",
    citation: "Academy of Nutrition and Dietetics, Pediatric Nutrition Position Paper.",
  },
  {
    id: "a6",
    category: "Bone Age",
    title: "When Is a Bone Age Assessment Recommended?",
    excerpt: "The signs that typically prompt a pediatrician to order this specific test.",
    body:
      "A bone age X-ray is usually ordered when a child's height, growth rate, or pubertal timing diverges noticeably from what's expected for their age — either significantly ahead or behind. It's a diagnostic tool, not a routine screening, and is most useful in combination with growth charts, family height history, and a physical exam. On its own, one result rarely changes clinical management; it's the trend over time that matters most.",
    citation: "Endocrine Society, Clinical Practice Guidelines.",
  },
];

export default function KnowledgePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [openArticle, setOpenArticle] = useState(null);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      const matchesCategory = category === "All" || a.category === category;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  return (
    <div className="page knowledge-page">
      <div className="page-header">
        <h1>Knowledge Center</h1>
        <p>Expert-reviewed articles to guide you through every stage.</p>
      </div>

      <div className="knowledge-controls">
        <div className="search-box">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search articles by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="category-filter">
          {categories.map((c) => (
            <button
              key={c}
              className={`category-chip ${category === c ? "category-chip--active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">No articles match your search.</div>
      ) : (
        <div className="article-grid">
          {filtered.map((a) => (
            <article className="article-card card" key={a.id}>
              <span className="badge badge--mint">{a.category}</span>
              <h3>{a.title}</h3>
              <p>{a.excerpt}</p>
              <button className="link-btn" onClick={() => setOpenArticle(a)}>
                Read More &rarr;
              </button>
            </article>
          ))}
        </div>
      )}

      {openArticle && (
        <div className="modal-backdrop" onClick={() => setOpenArticle(null)}>
          <div className="modal article-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <span className="badge badge--mint">{openArticle.category}</span>
              <button className="icon-btn" onClick={() => setOpenArticle(null)} aria-label="Close">
                &times;
              </button>
            </div>
            <h2>{openArticle.title}</h2>
            <p className="article-modal__body">{openArticle.body}</p>
            <p className="article-modal__citation">Source: {openArticle.citation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}