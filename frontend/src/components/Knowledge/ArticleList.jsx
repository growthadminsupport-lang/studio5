import { Link } from "react-router-dom";
import { useState } from "react";

import growthIcon from "../../assets/icons_knowledge/growth.png";
import nutritionIcon from "../../assets/icons_knowledge/nutrition.png";
import boneIcon from "../../assets/icons_knowledge/bone.png";
import pubertyIcon from "../../assets/icons_knowledge/puberty.png";
import healthyHabitsIcon from "../../assets/icons_knowledge/healthy.png";

import boneAgeImg from "../../assets/knowledgeImg/ba1.png";
import nutritionExploreImg from "../../assets/knowledgeImg/nutritionExplore.png";
import growthExploreImg from "../../assets/knowledgeImg/growthExplore.png";
import pubertyExploreImg from "../../assets/knowledgeImg/pubertyExplore.png";
import boneAgeExploreImg from "../../assets/knowledgeImg/boneAgeExplore.png";
import supportHealthExploreImg from "../../assets/knowledgeImg/supportHealthExplore.png";
import quickFactsImg from "../../assets/knowledgeImg/quickFacts.png";
import "./Knowledge.css";

import knowledgeBG from "../../assets/knowledgeBG.png";


/* =========================================================
   ARTICLES
   ========================================================= */

const articles = [
  {
    id: 1,
    slug: "navigating-growth-spurts",
    label: "Article",
    tag: "growth",
    title: "Growth Spurts",
    blurb: "When and how your body speeds up.",
    category: "growth",
  },

  {
    id: 2,
    slug: "nutrition-for-pre-teens",
    label: "Guide",
    tag: "nutrition",
    title: "Nutrition",
    blurb: "Key nutrients for strong bones and healthy growth.",
    category: "nutrition",
  },

  {
    id: 3,
    slug: "understanding-puberty",
    label: "Explainer",
    tag: "puberty",
    title: "Puberty",
    blurb: "What to expect and how to prepare.",
    category: "puberty",
  },

  {
    id: 4,
    slug: "understanding-bone-age",
    label: "Explainer",
    tag: "bone age",
    title: "Understanding Bone Age",
    blurb: "How skeletal maturity is read from a hand X-ray.",
    category: "bone age",
  },

  {
    id: 5,
    slug: "support-healthy-growth",
    label: "Guide",
    tag: "healthy habits",
    title: "Support Healthy Growth",
    blurb: "Everyday habits that make a big difference.",
    category: "healthy habits",
  },
];


/* =========================================================
   FEATURED ARTICLE
   ========================================================= */

const featuredSlug = "understanding-bone-age";

const featured = articles.find(
  (article) => article.slug === featuredSlug
);


/* =========================================================
   EXPLORE MORE
   ========================================================= */

const exploreMore = articles
  .filter((article) => article.slug !== featuredSlug)
  .slice(0, 3);


/* =========================================================
   CATEGORY CHIPS
   ========================================================= */

const categoryChips = [
  {
    key: "growth",
    label: "Growth",
    icon: growthIcon,
    color: "chip-blue",
  },

  {
    key: "nutrition",
    label: "Nutrition",
    icon: nutritionIcon,
    color: "chip-red",
  },

  {
    key: "bone age",
    label: "Bone Age",
    icon: boneIcon,
    color: "chip-mint",
  },

  {
    key: "puberty",
    label: "Puberty",
    icon: pubertyIcon,
    color: "chip-indigo",
  },

  {
    key: "healthy habits",
    label: "Healthy Habits",
    icon: healthyHabitsIcon,
    color: "chip-pink",
  },
];


/* =========================================================
   EXPLORE MORE IMAGES
   ========================================================= */

const exploreImages = {
  growth: growthExploreImg,
  nutrition: nutritionExploreImg,
  puberty: pubertyExploreImg,
  "bone age": boneAgeExploreImg,
  "healthy habits": supportHealthExploreImg,
};


/* =========================================================
   MAIN COMPONENT
   ========================================================= */

function ArticleList() {
  const [category, setCategory] = useState("all");


  /* -------------------------------------------------------
     Filter articles
     ------------------------------------------------------- */

  const filtered =
    category === "all"
      ? articles
      : articles.filter(
          (article) => article.category === category
        );


  return (
    <div className="knowledge-section">


      {/* =====================================================
         HERO
         ===================================================== */}

      <div className="kn-hero">


        {/* Background image */}

        <div
          className="kn-hero-art"
          aria-hidden="true"
        >
          <img
            src={knowledgeBG}
            className="kn-hero-bg"
            alt=""
          />
        </div>


        {/* Hero text */}

        <div className="kn-hero-text">

          <h1 className="kn-hero-title">
            <Spark className="kn-spark kn-spark-left" />
            <span>Knowledge &amp; Resources</span>
            <Spark className="kn-spark kn-spark-right" />
          </h1>

          <p>
            Learn about growth, nutrition, puberty,
            and healthy development.
          </p>


          {/* Category buttons */}

          <div className="kn-chip-row">

            {categoryChips.map(
              ({ key, label, icon, color }) => (

                <button
                  key={key}
                  type="button"
                  className={`kn-chip ${color} ${
                    category === key ? "active" : ""
                  }`}
                  onClick={() =>
                    setCategory(
                      category === key
                        ? "all"
                        : key
                    )
                  }
                >

                  <span className="kn-chip-icon">

                    <img
                      src={icon}
                      alt=""
                    />

                  </span>

                  <span>
                    {label}
                  </span>

                </button>

              )
            )}

          </div>

        </div>

      </div>


      {/* Everything below the hero: full width */}
      <div className="kn-content">

      {/* =====================================================
         MAIN HEADING
         ===================================================== */}

      <h2 className="knowledge-heading">
        Parenting Resources
      </h2>


      {/* =====================================================
         MAIN LAYOUT
         ===================================================== */}

      <div className="kn-layout">


        {/* ===================================================
           MAIN CONTENT
           =================================================== */}

        <div className="kn-main">


          {/* =================================================
             FEATURED ARTICLE
             ================================================= */}

          {featured && (

            <Link
              to={`/knowledge/${featured.slug}`}
              state={{ from: "/knowledge" }}
              className="kn-featured"
            >


              {/* ---------------------------------------------
                 Featured image
                 --------------------------------------------- */}

              <div
                className={`kn-featured-art art-${featured.tag.replace(
                  /\s/g,
                  "-"
                )}`}
              >

                <img
                  src={boneAgeImg}
                  alt=""
                  className="kn-feature-icon"
                />

              </div>


              {/* ---------------------------------------------
                 Featured text
                 --------------------------------------------- */}

              <div className="kn-featured-body">

                <span className="kn-tag">
                  {featured.tag.toUpperCase()}
                </span>

                <h3>
                  {featured.title}
                </h3>

                <p>
                  {featured.blurb}
                </p>

                <span className="knowledge-readmore">

                  Read More

                  <span className="arrow-icon">
                    →
                  </span>

                </span>

              </div>

            </Link>

          )}


          {/* =================================================
             EXPLORE MORE
             ================================================= */}

          <h2 className="knowledge-heading kn-explore-heading">
            Explore More
          </h2>


          <div className="knowledge-grid">

            {(category === "all"
              ? exploreMore
              : filtered
            ).map((article) => (

              <Link
                key={article.id}
                to={`/knowledge/${article.slug}`}
                state={{ from: "/knowledge" }}
                className="knowledge-card"
              >


                {/* -------------------------------------------
                   Explore image
                   ------------------------------------------- */}

                <div
                  className={`knowledge-icon-tile art-${article.tag.replace(
                    /\s/g,
                    "-"
                  )}`}
                >

                  <ExploreImage
                    tag={article.tag}
                  />

                </div>


                {/* -------------------------------------------
                   Card text
                   ------------------------------------------- */}

                <div className="knowledge-card-body">

                  <h3>
                    {article.title}
                  </h3>

                  <p>
                    {article.blurb}
                  </p>

                  <span className="knowledge-readmore">

                    Read More

                    <span className="arrow-icon">
                      →
                    </span>

                  </span>

                </div>

              </Link>

            ))}


            {/* No articles */}

            {category !== "all" &&
              filtered.length === 0 && (

                <p className="kn-empty">
                  No articles in this category yet.
                </p>

              )}

          </div>

        </div>


        {/* ===================================================
           SIDEBAR
           =================================================== */}

        <aside className="kn-sidebar">


          {/* =================================================
             QUICK FACTS
             ================================================= */}

          <div className="kn-quickfacts">
            <div className="kn-quickfacts-content">
              <div className="kn-quickfacts-text">
                <div className="kn-quickfacts-head">
                  <span className="quickfacts-icon">
                    💡
                  </span>

                  <span>
                    Quick Facts
                  </span>
                </div>

                <div className="kn-quickfacts-value">
                  1,300 mg
                </div>

                <p>
                  Recommended calcium intake
                  for ages 9–13.
                </p>
              </div>

              <img
                src={quickFactsImg}
                alt=""
                className="kn-quickfacts-image"
              />
            </div>
          </div>


          {/* =================================================
             HEALTHY GROWTH
             ================================================= */}

          <Link
            to="/knowledge/support-healthy-growth"
            state={{ from: "/knowledge" }}
            className="kn-support-card"
          >

            <img
              src={healthyHabitsIcon}
              alt=""
              className="kn-support-icon"
            />


            <div>

              <strong>
                Support Healthy Growth
              </strong>

              <p>
                Small habits make a big difference!
              </p>

            </div>


            <span className="kn-support-arrow">
              →
            </span>

          </Link>


          {/* =================================================
             RESOURCES
             ================================================= */}

          <div className="kn-resources-list">

            <h3>
              Resources
            </h3>


            {articles.map((article) => (

              <Link
                key={article.id}
                to={`/knowledge/${article.slug}`}
                state={{ from: "/knowledge" }}
                className="kn-resource-row"
              >

                <span>
                  {article.title}
                </span>

                <span className="arrow-icon">
                  →
                </span>

              </Link>

            ))}

          </div>

        </aside>

      </div>

      </div>

    </div>
  );
}


/* =========================================================
   SPARKLE MARK (yellow dashes beside the hero title)
   ========================================================= */

function Spark({ className }) {
  return (
    <svg className={className} viewBox="0 0 26 24" aria-hidden="true">
      <path
        d="M3 4L22 10M3 20L22 14"
        fill="none"
        stroke="#ffc83d"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}


/* =========================================================
   EXPLORE MORE IMAGE COMPONENT
   ========================================================= */

function ExploreImage({ tag }) {

  const image = exploreImages[tag] || growthExploreImg;

  return (
    <img
      src={image}
      alt=""
      className="kn-explore-image"
    />
  );
}


export default ArticleList;