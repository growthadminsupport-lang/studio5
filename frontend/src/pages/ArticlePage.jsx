import { useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import growthSpurtImg from "../assets/knowledgeImg/growthPage1.png";
import growthIcon from "../assets/icons_knowledge/growthPageIcon1.png";
import pubertyIcon from "../assets/icons_knowledge/growthPageIcon2.png";
import healthyIcon from "../assets/icons_knowledge/growthPageIcon3.png";
import "./ArticlePage.css";

const articles = {
  "understanding-bone-age": {
    type: "Explainer",
    title: "Understanding Bone Age",
    description:
      "How skeletal maturity is read from a hand X-ray, why a doctor would order one, and the limits of what it can tell you.",

    sections: [
      {
        title: 'What "bone age" actually measures',
        content: (
          <p>
            Bone age is a reading of <strong>skeletal maturity</strong> —
            how far a child's bones have developed — rather than how long
            they have been alive. It's assessed from a single X-ray of the
            left hand and wrist, because the growing ends of those small
            bones (the growth plates) change shape in a predictable order
            from infancy through the end of growth.
            <br />
            <br />
            A radiologist compares that X-ray against a reference and
            reports an age. If a 9-year-old's bones look like the reference
            for an 11-year-old, their bone age is "advanced" by about two
            years. If they look like a 7-year-old's, it's "delayed".
          </p>
        ),
      },

      {
        title: "How it's read",
        content: (
          <>
            <p>Two methods dominate clinical practice:</p>

            <ul>
              <li>
                <strong>Greulich–Pyle (GP)</strong> — the reader matches the
                whole hand against an atlas of reference radiographs and
                picks the closest match. It's fast and simple, which is why
                it's the most widely used method.
              </li>

              <li>
                <strong>Tanner–Whitehouse (TW3)</strong> — each individual
                bone is scored separately and the scores are summed. It
                takes longer but is more granular.
              </li>
            </ul>

            <p>
              Increasingly these are assisted by automated software, which
              improves consistency between readers.
            </p>
          </>
        ),
      },

      {
        title: "Why a doctor might order one",
        content: (
          <>
            <p>
              Bone age is not a routine test. It's requested when a specific
              question needs answering:
            </p>

            <ul>
              <li>
                <strong>Predicting adult height.</strong> Bone age tells you
                how much growing time is left. Two children the same height
                at the same age can have very different adult heights if one
                has far more growth remaining.
              </li>

              <li>
                <strong>Investigating early or late puberty.</strong> Sex
                hormones accelerate skeletal maturation, so a bone age
                running ahead of chronological age is one of the signals
                that supports a precocious puberty workup.
              </li>

              <li>
                <strong>Investigating short stature or poor growth.</strong>{" "}
                A delayed bone age in a short child often means growth is
                simply happening on a later schedule, with more time in hand
                than the current height suggests.
              </li>
            </ul>
          </>
        ),
      },

      {
        title: "What it can't tell you",
        content: (
          <ul>
            <li>
              <strong>It is not a diagnosis.</strong> Bone age is one input
              among several — growth velocity, parental heights, pubertal
              stage, and blood work all matter.
            </li>

            <li>
              <strong>Readings vary between readers.</strong> Agreement
              between two radiologists reading the same film is good but not
              perfect, so small differences of a few months are not
              meaningful.
            </li>

            <li>
              <strong>The reference population matters.</strong> The GP
              atlas is built on radiographs of North American children
              collected in the 1930s and 40s. Applying it to contemporary
              children from different populations can introduce bias, which
              is a known limitation and an active area of research.
            </li>

            <li>
              <strong>Height predictions are estimates.</strong> They carry
              a real margin of error and become more reliable closer to the
              end of growth.
            </li>
          </ul>
        ),
      },

      {
        title: "What this means for you as a parent",
        content: (
          <>
            <p>
              If a bone age has been ordered, it is answering a question
              your doctor already has — it is not a screening test to seek
              out on your own. Bring the report to the appointment along
              with your child's height history; the trend over time is
              usually more informative than any single number.
            </p>

            <p>
              GrowTH's bone age feature is a{" "}
              <strong>preliminary, non-diagnostic</strong> tool and is
              clearly marked as such. It does not replace a radiologist's
              reading.
            </p>
          </>
        ),
      },
    ],

    sources: [
      "Near-Adult Heights and Adult Height Predictions Using Automated and Conventional Greulich–Pyle Bone Age Determinations — PMC",
      "Skeletal age in idiopathic short stature: an analytical study by the TW3 method, Greulich and Pyle method — PMC",
      "Bone Age Assessment Using Various Medical Imaging Techniques Enhanced by Artificial Intelligence — PMC",
      "Automatic assessment of bone age in Taiwanese children: GP vs TW3 — Kaohsiung Journal of Medical Sciences",
    ],
  },

  "nutrition-for-pre-teens": {
    type: "Guide",
    title: "Nutrition for Pre-teens",
    description:
      "Calcium, vitamin D, iron and protein targets for ages 9–13 — and the everyday habits that matter more than any single nutrient.",

    sections: [
      {
        title: "Why ages 9–13 matter so much",
        content: (
          <p>
            More than half of adult bone mass is laid down during
            adolescence. The skeleton a child builds in these years is
            roughly the skeleton they keep — bone that isn't built now is
            very difficult to add later. At the same time, appetite and
            growth rate rise sharply, and food choices start moving out of a
            parent's direct control.
            <br />
            <br />
            This is the window where nutrition has the most leverage.
          </p>
        ),
      },

      {
        title: "The numbers that matter",
        content: (
          <table className="article-table">
            <thead>
              <tr>
                <th>Nutrient</th>
                <th>Ages 9–13</th>
                <th>Why</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Calcium</td>
                <td>
                  <strong>1,300 mg/day</strong>
                </td>
                <td>
                  Bone mineral density; the same target for boys and girls
                </td>
              </tr>

              <tr>
                <td>Vitamin D</td>
                <td>
                  <strong>600 IU (15 µg)/day</strong>
                </td>
                <td>Needed to absorb calcium</td>
              </tr>

              <tr>
                <td>Protein</td>
                <td>
                  <strong>10–30% of daily calories</strong>
                </td>
                <td>Tissue growth during the spurt</td>
              </tr>

              <tr>
                <td>Iron</td>
                <td>Rises in both sexes</td>
                <td>Oxygen transport; deficiency is common</td>
              </tr>
            </tbody>
          </table>
        ),
      },

      {
        title: "Where to actually get them",
        content: (
          <>
            <p>
              <strong>Calcium.</strong> Milk, yoghurt and cheese are the
              densest sources. If dairy isn't part of your family's diet,
              small fish eaten with the bones, firm tofu set with calcium,
              fortified soy milk, and dark leafy greens such as kale, pak
              choi and Chinese broccoli all contribute meaningfully.
            </p>

            <p>
              <strong>Vitamin D.</strong> Few foods contain much. Oily fish,
              egg yolk and fortified milk are the main dietary sources;
              sensible sun exposure covers the rest for most children.
            </p>

            <p>
              <strong>Iron.</strong> Red meat, liver and blood-based dishes
              are absorbed best. Plant sources — beans, tofu, dark greens —
              are absorbed far better when eaten with something high in
              vitamin C in the same meal.
            </p>

            <p>
              <strong>Protein.</strong> Easy to meet in most diets: eggs,
              fish, chicken, pork, beans, tofu, nuts. Most children in this
              age group are not short on protein, and supplements are rarely
              needed.
            </p>
          </>
        ),
      },

      {
        title: "Habits that matter more than any single nutrient",
        content: (
          <ul>
            <li>
              <strong>Don't skip breakfast.</strong> It's the meal most
              often dropped at this age and the one that most reliably costs
              calcium and iron.
            </li>

            <li>
              <strong>Watch what drinks replace.</strong> Sweetened drinks
              displacing milk is one of the most common ways calcium intake
              quietly collapses.
            </li>

            <li>
              <strong>Be careful with restrictive dieting.</strong>{" "}
              Weight-loss dieting during the growth spurt can compromise
              both bone accrual and final height.
            </li>

            <li>
              <strong>Eat together where you can.</strong> Shared meals are
              consistently associated with better diet quality in this age
              group.
            </li>
          </ul>
        ),
      },

      {
        title: "When to ask a professional",
        content: (
          <p>
            Talk to a pediatrician or dietitian if your child follows a
            restricted diet, is persistently tired or pale, has dropped
            across growth percentile lines, or if you're considering
            supplements. Supplement doses for children are not scaled-down
            adult doses, and more is not better — particularly for vitamin D
            and iron, both of which are harmful in excess.
          </p>
        ),
      },
    ],

    sources: [
      "A Teenager's Nutritional Needs — HealthyChildren.org",
      "Adolescents — Micronutrient Information Center, Oregon State University",
      "Nutrition Through the Lifecycle: Adolescence — Nutrition Essentials",
      "Take Charge of Your Health: A Guide for Teenagers — NIDDK",
    ],
  },

  "navigating-growth-spurts": {
    type: "Article",
    title: "Navigating Growth Spurts",
    description:
      "A growth spurt happens when your body grows faster than usual, and it can change many things!",
    image: growthSpurtImg,
    sections: [
      {
        title: "When to expect it",
        content: (
          <div className="growth-info-grid">
          
            <div className="growth-info-box">
              <img
                src={growthIcon}
                alt=""
                className="growth-info-icon"
            />
        
              <div className="growth-info-text">
                <h3>Growth</h3>
                <p>
                  Becomes faster during puberty
                </p>
              </div>
            </div>
        
            <div className="growth-info-box">
              <img
                src={pubertyIcon}
                alt=""
                className="growth-info-icon"
              />
        
              <div className="growth-info-text">
                <h3>Timing</h3>
                
                <ul className="article-bullet-list">
                    <li>Genetics</li>
                    <li>Nutrition</li>
                    <li>Sleep</li>
                </ul>
              </div>
            </div>
        
            <div className="growth-info-box">
              <img
                src={healthyIcon}
                alt=""
                className="growth-info-icon"
              />
        
              <div className="growth-info-text">
                <h3>Individual differences</h3>
                <p>
                  Can be normal and healthy
                </p>
              </div>
            </div>
        
          </div>
        ),
      },
        

          
    ],

    sources: [
      "Growth and Normal Puberty — Pediatrics, American Academy of Pediatrics",
      "Physical Growth and Sexual Maturation of Adolescents — Merck Manual",
      "What is a Growth Spurt During Puberty? — Johns Hopkins Medicine",
      "Growth Spurts Occurring at Younger Ages for Both Girls and Boys — Epic Research",
    ],
  },
};

function ArticlePage() {
  const { slug } = useParams();
  const location = useLocation();

  // Scroll to the top whenever an article is opened or changed
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Determine back navigation route and label dynamically based on state
  const fromHome = location.state?.from === "/";
  const backTarget = fromHome ? "/" : "/knowledge";
  const backLabel = fromHome ? "← Back to Home" : "← Back to Resources";

  const article = articles[slug];

  if (!article) {
    return (
      <div className="article-bg">
      <div className="article-page">
        <div className="article-type">Article</div>

        <div className="article-card">
          <h1>Article Not Found</h1>
          <p>The article you are looking for does not exist.</p>

          <Link to={backTarget} className="article-back-link">
            {backLabel}
          </Link>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="article-bg">
    <div className="article-page">
      {/* This stays OUTSIDE the white box */}
      <div className="article-type">{article.type}</div>

      {/* Everything below is inside the white box */}
      <article className="article-card">
        <h1>{article.title}</h1>

        <p className="article-description">{article.description}</p>

        {article.image && (
          <img
            src={article.image}
            alt={article.title}
            className="article-main-image"
          />
        )}

        {article.sections.map((section, index) => (
          <section key={index} className="article-section">
            <h2>{section.title}</h2>
            <div className="article-section-content">
              {section.content}
            </div>
          </section>
        ))}

        <div className="article-sources">
          <h2>Sources</h2>

          <ul>
            {article.sources.map((source, index) => (
              <li key={index}>{source}</li>
            ))}
          </ul>
        </div>

        <p className="article-disclaimer">
          General information for parents — not medical advice. Talk to your
          child's doctor about anything specific to them.
        </p>

        <Link to={backTarget} className="article-back-link">
          {backLabel}
        </Link>
      </article>
    </div>
    </div>
  );
}

export default ArticlePage;