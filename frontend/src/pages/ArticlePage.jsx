import { Link, useParams } from "react-router-dom";
import "./ArticlePage.css";

const articleContent = {
  "navigating-growth-spurts": {
    category: "Growth",
    title: "Navigating Growth Spurts",
    content: (
      <>
        <p>
          Puberty is a period of rapid physical growth and development.
          Children can grow at different rates, and the timing of their
          growth spurt can vary considerably.
        </p>

        <h2>What is a growth spurt?</h2>

        <p>
          A growth spurt is a period when height increases more quickly than
          usual. During puberty, children may experience significant changes
          in height, weight, and body composition.
        </p>

        <h2>When should you pay attention?</h2>

        <p>
          Differences in growth patterns are often normal. However, unusual
          changes in growth or concerns about development should be discussed
          with a qualified healthcare professional.
        </p>
      </>
    ),
  },

  "nutrition-for-pre-teens": {
    category: "Nutrition",
    title: "Nutrition for Pre-teens",
    content: (
      <>
        <p>
          Good nutrition supports healthy growth and development during
          childhood and adolescence.
        </p>

        <h2>Important nutrients</h2>

        <p>
          Calcium, vitamin D, iron, protein, and other nutrients contribute
          to healthy development. A balanced diet is generally more important
          than focusing on a single nutrient.
        </p>

        <h2>Healthy everyday habits</h2>

        <p>
          Regular meals, a variety of foods, adequate water, and sufficient
          sleep can all contribute to healthy development.
        </p>
      </>
    ),
  },

  "understanding-bone-age": {
    category: "Bone Age",
    title: "Understanding Bone Age",
    content: (
      <>
        <p>
          Bone age is an estimate of skeletal maturity. Healthcare
          professionals can assess bone development using an X-ray of the
          hand and wrist.
        </p>

        <h2>Why is bone age assessed?</h2>

        <p>
          A healthcare professional may request a bone-age assessment when
          evaluating a child's growth or pubertal development.
        </p>

        <h2>What are the limitations?</h2>

        <p>
          Bone-age assessment is an estimate and should be interpreted by a
          qualified healthcare professional together with other clinical
          information.
        </p>
      </>
    ),
  },
};

function ArticlePage() {
  const { slug } = useParams();

  const article = articleContent[slug];

  if (!article) {
    return (
      <div className="article-page">
        <h1>Article Not Found</h1>
        <p>The article you are looking for does not exist.</p>

        <Link to="/knowledge" className="article-back-link">
          ← Back to Resources
        </Link>
      </div>
    );
  }

  return (
    <div className="article-page">
      <Link to="/knowledge" className="article-back-link">
        ← Back to Resources
      </Link>

      <span className="article-category">
        {article.category}
      </span>

      <h1>{article.title}</h1>

      <div className="article-content">
        {article.content}
      </div>
    </div>
  );
}

export default ArticlePage;