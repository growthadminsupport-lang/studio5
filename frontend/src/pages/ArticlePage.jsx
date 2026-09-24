import { Fragment, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import growthSpurtImg from "../assets/knowledgeImg/growthPage1.png";
import nutriImg from "../assets/knowledgeImg/nutriPage1.png";
import calciumIcon from "../assets/knowledgeImg/nutriPage2.png";
import vitaminDIcon from "../assets/knowledgeImg/nutriPage3.png";
import proteinIcon from "../assets/knowledgeImg/nutriPage4.png";
import ironIcon from "../assets/knowledgeImg/nutriPage5.png";
import calciumFoodIcon from "../assets/knowledgeImg/nutriPage6.png";
import vitaminDFoodIcon from "../assets/knowledgeImg/nutriPage7.png";
import proteinFoodIcon from "../assets/knowledgeImg/nutriPage8.png";
import ironFoodIcon from "../assets/knowledgeImg/nutriPage9.png";
import boneHeroImg from "../assets/knowledgeImg/boneAgePage1.png";
import chronoAgeIcon from "../assets/knowledgeImg/bonAgePage2.png";
import boneAgeIcon from "../assets/knowledgeImg/bonAgePage3.png";
import xrayStepIcon from "../assets/knowledgeImg/bonAgePage4.png";
import compareStepIcon from "../assets/knowledgeImg/bonAgePage5.png";
import estimateStepIcon from "../assets/knowledgeImg/bonAgePage6.png";
import gpMethodIcon from "../assets/knowledgeImg/bonAgePage7.png";
import twMethodIcon from "../assets/knowledgeImg/bonAgePage8.png";
import pubertyHeroImg from "../assets/knowledgeImg/pubertyPage1.png";
import tallerIcon from "../assets/knowledgeImg/pubertyPage2.png";
import skinIcon from "../assets/knowledgeImg/pubertyPage3.png";
import bodyDevIcon from "../assets/knowledgeImg/pubertyPage4.png";
import feelingsIcon from "../assets/knowledgeImg/pubertyPage5.png";
import talkIcon from "../assets/knowledgeImg/pubertyPage6.png";
import careIcon from "../assets/knowledgeImg/pubertyPage7.png";
import restIcon from "../assets/knowledgeImg/pubertyPage8.png";
import eatWellImg from "../assets/knowledgeImg/supportHealthPage1.png";
import stayActiveImg from "../assets/knowledgeImg/supportHealthPage2.png";
import sleepWellImg from "../assets/knowledgeImg/supportHealthPage3.png";
import trackGrowthImg from "../assets/knowledgeImg/supportHealthPage4.png";
import growthIcon from "../assets/icons_knowledge/growthPageIcon1.png";
import pubertyIcon from "../assets/icons_knowledge/growthPageIcon2.png";
import healthyIcon from "../assets/icons_knowledge/growthPageIcon3.png";
import logoDidyouknow from "../assets/logo_knowledge.png";
import "./ArticlePage.css";

/* ---------- Nutrition page data ---------- */

const keyNutrients = [
  {
    name: "Calcium",
    amount: "1,300 mg/day",
    note: "Builds strong bones and teeth.",
    icon: calciumIcon,
    tone: "blue",
  },
  {
    name: "Vitamin D",
    amount: "600 IU/day",
    note: "Helps your body absorb calcium.",
    icon: vitaminDIcon,
    tone: "amber",
  },
  {
    name: "Protein",
    amount: "10–30% of daily calories",
    note: "Supports tissue growth and repair.",
    icon: proteinIcon,
    tone: "green",
  },
  {
    name: "Iron",
    amount: "8 mg/day (ages 9–13)",
    note: "Rises in both sexes; higher in girls after menarche.",
    icon: ironIcon,
    tone: "peach",
  },
];

const foodSources = [
  { name: "Calcium", foods: "Milk, yogurt, cheese, tofu, leafy greens", icon: calciumFoodIcon },
  { name: "Vitamin D", foods: "Fish, egg yolk, fortified foods", icon: vitaminDFoodIcon },
  { name: "Protein", foods: "Eggs, fish, meat, beans, tofu", icon: proteinFoodIcon },
  { name: "Iron", foods: "Meat, beans, tofu, leafy greens", icon: ironFoodIcon },
];

/* ---------- Bone age page data ---------- */

const ageTypes = [
  {
    name: "Chronological age",
    note: "How long you have been alive.",
    icon: chronoAgeIcon,
  },
  {
    name: "Bone age",
    note: "How mature your bones are.",
    icon: boneAgeIcon,
  },
];

const measureSteps = [
  { title: "X-ray", note: "Hand and Wrist", icon: xrayStepIcon },
  { title: "Compare", note: "With reference images", icon: compareStepIcon },
  { title: "Estimate", note: "Skeletal maturity", icon: estimateStepIcon },
];

const boneMethods = [
  {
    name: "Greulich–Pyle (GP)",
    note: "Compare the whole hand with an atlas.",
    icon: gpMethodIcon,
  },
  {
    name: "Tanner–Whitehouse (TW3)",
    note: "Score individual bones separately.",
    icon: twMethodIcon,
  },
];

/* ---------- Puberty page data ---------- */

const pubertyChanges = [
  {
    title: "Growing taller",
    note: "Height and body shape change.",
    icon: tallerIcon,
  },
  {
    title: "Skin & body hair",
    note: "Sweat, oily skin, and new hair may appear.",
    icon: skinIcon,
  },
  {
    title: "Body development",
    note: "Breasts, periods, or voice changes may begin.",
    icon: bodyDevIcon,
  },
  {
    title: "Feelings & emotions",
    note: "New feelings and mood changes are common.",
    icon: feelingsIcon,
  },
];

const pubertySupport = [
  {
    title: "Talk openly",
    note: "Ask questions with a trusted adult.",
    icon: talkIcon,
  },
  {
    title: "Care for your body",
    note: "Keep clean, eat well, and stay active.",
    icon: careIcon,
  },
  {
    title: "Rest well",
    note: "Make time for sleep and relaxation.",
    icon: restIcon,
  },
];

/* ---------- Support healthy growth page data ---------- */

const healthyHabits = [
  {
    title: "Eat Well",
    note: "Choose a variety of nutritious foods.",
    image: eatWellImg,
  },
  {
    title: "Stay Active",
    note: "Regular activity supports bone and muscle health.",
    image: stayActiveImg,
  },
  {
    title: "Sleep Well",
    note: "Get enough sleep for better growth and mood.",
    image: sleepWellImg,
  },
  {
    title: "Track Your Growth",
    note: "Regular checkups help monitor your progress.",
    image: trackGrowthImg,
  },
];

const articles = {
  "understanding-bone-age": {
    type: "Explainer",
    title: "Understanding Bone Age",
    description:
      "Bone age is a way to measure how mature a child's skeleton is.",
    image: boneHeroImg,
    imageClass: "article-main-image--hero",

    sections: [
      {
        title: "What is Bone Age?",
        content: (
          <>
            <p>
              Bone age is not the same as chronological age. It shows how much
              a child's bones have developed, rather than how long they have
              been alive.
            </p>

            <div className="bone-age-grid">
              {ageTypes.map((item) => (
                <div key={item.name} className="bone-age-card">
                  <img src={item.icon} alt="" className="bone-age-icon" />

                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ),
      },

      {
        title: "How is it measured?",
        content: (
          <div className="bone-steps">
            {measureSteps.map((step, index) => (
              <Fragment key={step.title}>
                <div className="bone-step">
                  <span className="bone-step-num">{index + 1}</span>
                  <img src={step.icon} alt="" className="bone-step-icon" />
                  <h3>{step.title}</h3>
                  <p>{step.note}</p>
                </div>

                {index < measureSteps.length - 1 && (
                  <svg
                    className="bone-step-arrow"
                    viewBox="0 0 48 14"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 7H44M38 2L45 7L38 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </Fragment>
            ))}
          </div>
        ),
      },

      {
        title: "Two common methods",
        content: (
          <div className="bone-method-grid">
            {boneMethods.map((item) => (
              <div key={item.name} className="bone-method-card">
                <img src={item.icon} alt="" className="bone-method-icon" />

                <div>
                  <h3>{item.name}</h3>
                  <p>{item.note}</p>
                </div>
              </div>
            ))}
          </div>
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
      "Good nutrition gives your body the energy and nutrients it needs to grow, stay healthy and feel your best.",
    image: nutriImg,
    imageClass: "article-main-image--hero",
    sections: [
      {
        title: "The 4 key nutrients",
        content: (
          <div className="nutri-grid">
            {keyNutrients.map((item) => (
              <div key={item.name} className={`nutri-card nutri-${item.tone}`}>
                <img src={item.icon} alt="" className="nutri-card-icon" />

                <div className="nutri-card-text">
                  <h3>{item.name}</h3>
                  <p className="nutri-card-amount">{item.amount}</p>
                  <p className="nutri-card-note">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        ),
      },

      {
        title: "Food sources",
        content: (
          <div className="food-grid">
            {foodSources.map((item) => (
              <div key={item.name} className="food-card">
                <img src={item.icon} alt="" className="food-card-icon" />
                <h3>{item.name}</h3>
                <p>{item.foods}</p>
              </div>
            ))}
          </div>
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

  "understanding-puberty": {
    type: "Explainer",
    title: "Understanding Puberty",
    description: "Growing up brings changes to your body and feelings.",
    image: pubertyHeroImg,
    imageClass: "article-main-image--hero",

    sections: [
      {
        title: "What is puberty?",
        content: (
          <p>
            Puberty is the time when a child's body gradually develops into an
            adult body. Everyone grows at their own pace.
          </p>
        ),
      },

      {
        title: "Changes you may notice",
        content: (
          <div className="pub-change-grid">
            {pubertyChanges.map((item) => (
              <div key={item.title} className="pub-change-card">
                <img src={item.icon} alt="" className="pub-change-icon" />

                <div>
                  <h3>{item.title}</h3>
                  <p>{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        ),
      },

      {
        title: "Support through the changes",
        content: (
          <>
            <div className="pub-support-grid">
              {pubertySupport.map((item) => (
                <div key={item.title} className="pub-support-card">
                  <div className="pub-support-art">
                    <img src={item.icon} alt="" className="pub-support-icon" />
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>

            <div className="info-note">
              <img src={logoDidyouknow} alt="" className="info-note-logo" />

              <div className="info-note-text">
                <h3>Everyone has their own timeline</h3>
                <p>
                  Changes happen at different times. If you feel worried, talk
                  with a healthcare professional.
                </p>
              </div>
            </div>
          </>
        ),
      },
    ],

    sources: [
      "Growth and Normal Puberty — Pediatrics, American Academy of Pediatrics",
      "Physical Growth and Sexual Maturation of Adolescents — Merck Manual",
    ],
  },

  "support-healthy-growth": {
    type: "Guide",
    title: "Support Healthy Growth",
    description: "Healthy habits today build a stronger, healthier you tomorrow.",

    sections: [
      {
        content: (
          <>
            <div className="hg-grid">
              {healthyHabits.map((item) => (
                <div key={item.title} className="hg-card">
                  <img src={item.image} alt="" className="hg-card-img" />

                  <div className="hg-card-body">
                    <h3>{item.title}</h3>
                    <p>{item.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="info-note">
              <img src={logoDidyouknow} alt="" className="info-note-logo" />

              <div className="info-note-text">
                <h3>Remember</h3>
                <p>
                  Healthy growth isn't just about being taller — it's about
                  being stronger, healthier and happier!
                </p>
              </div>
            </div>
          </>
        ),
      },
    ],

    sources: [
      "A Teenager's Nutritional Needs — HealthyChildren.org",
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
        title: "What to expect",
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

            <div className="growth-info-box">
              <img
                src={logoDidyouknow}
                alt=""
                className="growth-info-icon"
              />

              <div className="growth-info-text">
                <h3>Did you know?</h3>
                <p className="growth-peak-text">
                  Girls usually reach their peak growth around 10.5-12.8 years,
                  while boys usually reach it around 12-16 years.
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
      {/* Back link + type label stay OUTSIDE the white box */}
      <Link to={backTarget} className="article-back-link article-back-top">
        {backLabel}
      </Link>

      <div className="article-type">{article.type}</div>

      {/* Everything below is inside the white box */}
      <article className="article-card">
        <h1 className="article-title">{article.title}</h1>

        <p className="article-description">{article.description}</p>

        {article.image && (
          <img
            src={article.image}
            alt={article.title}
            className={`article-main-image ${article.imageClass || ""}`}
          />
        )}

        {article.sections.map((section, index) => (
          <section key={index} className="article-section">
            {section.title && (
              <h2 style={{ fontWeight: 700 }}>{section.title}</h2>
            )}
            <div className="article-section-content">
              {section.content}
            </div>
          </section>
        ))}

        <p className="article-disclaimer">
          General information for parents — not medical advice. Talk to your
          child's doctor about anything specific to them.
        </p>

      </article>
    </div>
    </div>
  );
}

export default ArticlePage;