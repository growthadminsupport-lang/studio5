import { useLocation, Link, useParams } from "react-router-dom";
import "./ArticlePage.css"; // Ensure styles match your design

function ArticlePage() {
  const { slug } = useParams();
  const location = useLocation();

  // Determine back link target & text based on navigation source
  const isFromHome = location.state?.from === "home";
  const backPath = isFromHome ? "/" : "/knowledge";
  const backLabel = isFromHome ? "Back to Home" : "Back to resources";

  return (
    <div className="gt-article-container">
      {/* Dynamic Back Button */}
      <Link to={backPath} className="gt-back-button">
        ← {backLabel}
      </Link>

      <article className="gt-article-content">
        {/* Article header & content rendering here */}
        <h1>Article Title for {slug}</h1>
      </article>
    </div>
  );
}

export default ArticlePage;