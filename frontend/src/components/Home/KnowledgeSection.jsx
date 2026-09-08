import { Link } from "react-router-dom";

const articles = [
  {
    tag: "EXPLAINER",
    title: "Understanding Bone Age",
    desc: "How skeletal maturity is read from a hand X-ray, why a doctor would order one, and the limits of what it can tell you.",
    icon: "🩺",
    bg: "bg-amber-50 text-night-950",
  },
  {
    tag: "GUIDE",
    title: "Nutrition for Pre-teens",
    desc: "Calcium, vitamin D, iron and protein targets for ages 9-13 — and the everyday habits that matter more than any single nutrient.",
    icon: "🍴",
    bg: "bg-emerald-800 text-white",
  },
  {
    tag: "MILESTONE",
    title: "Growth Spurts Explained",
    desc: "What triggers rapid height gain during puberty, typical timing differences between boys and girls, and when to seek advice.",
    icon: "📏",
    bg: "bg-blue-50 text-night-950",
  },
];

export default function KnowledgeSection() {
  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-emerald-400 text-xs font-semibold tracking-widest mb-2">
            KNOWLEDGE HUB
          </p>
          <h2 className="text-3xl font-bold">Latest Articles</h2>
        </div>
        <Link
          to="/knowledge"
          className="text-sm font-semibold text-emerald-400 hover:underline"
        >
          View All →
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {articles.map((a) => (
          <div
            key={a.title}
            className="bg-night-800 border border-white/5 rounded-2xl overflow-hidden hover:-translate-y-1 transition"
          >
            <div className={`${a.bg} h-32 flex items-center justify-center text-4xl`}>
              {a.icon}
            </div>
            <div className="p-5">
              <span className="text-[10px] font-bold text-emerald-400 tracking-widest">
                {a.tag}
              </span>
              <h3 className="font-semibold text-lg mt-2 mb-2">{a.title}</h3>
              <p className="text-sm text-gray-400 mb-4">{a.desc}</p>
              <Link
                to="/knowledge"
                className="text-sm font-semibold text-emerald-400 hover:underline"
              >
                Read More →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}