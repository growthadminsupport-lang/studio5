import React from "react";
import { Link } from "react-router-dom";
import { 
  Play, 
  TrendingUp, 
  Sparkles, 
  Ruler, 
  Utensils, 
  Bandage 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logoDarkVideo from "../assets/logo_motion_black_small.mp4";
import logoLightVideo from "../assets/logo_motion_white_small.mp4";
import posterDark from "../assets/poster_dark.webp";
import posterLight from "../assets/poster_light.webp";
import { useTheme } from "../context/ThemeContext";

// Shared article dataset
const articles = [
  {
    id: 1,
    slug: "navigating-growth-spurts",
    label: "Article",
    title: "Navigating Growth Spurts",
    desc: "When the pubertal growth spurt happens, how fast it goes, and which changes are worth a doctor's attention.",
    category: "growth",
    Icon: Ruler,
    bgColor: "bg-[#d9f0ed] dark:bg-teal-500/10",
  },
  {
    id: 2,
    slug: "nutrition-for-pre-teens",
    label: "Guide",
    title: "Nutrition for Pre-teens",
    desc: "Calcium, vitamin D, iron and protein targets for ages 9–13 — and the everyday habits that matter more than any single nutrient.",
    category: "nutrition",
    Icon: Utensils,
    bgColor: "bg-[#e4f4ec] dark:bg-emerald-500/10",
  },
  {
    id: 3,
    slug: "understanding-bone-age",
    label: "Explainer",
    title: "Understanding Bone Age",
    desc: "How skeletal maturity is read from a hand X-ray, why a doctor would order one, and the limits of what it can tell you.",
    category: "bone age",
    Icon: Bandage,
    bgColor: "bg-[#f7f0df] dark:bg-amber-500/10",
  },
];

export default function HomePage() {
  const { theme } = useTheme();
  const { isLoggedIn } = useAuth() || {};

  return (
    <div className="bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans transition-colors">
      
      {/* ----------------- Hero Section ----------------- */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-20 text-center flex flex-col items-center">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-44 h-44 md:w-64 md:h-64 mb-2 flex items-center justify-center">
            <video
              key={theme}
              src={theme === "dark" ? logoDarkVideo : logoLightVideo}
              poster={theme === "dark" ? posterDark : posterLight}
              preload="auto"
              autoPlay
              loop
              muted
              playsInline
              className={`w-full h-full object-contain ${theme === "dark" ? "mix-blend-lighten" : "mix-blend-darken"}`}
              aria-label="GrowTH Logo"
            />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#056559] dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-teal-300 dark:to-cyan-400">
          Nurture Every Milestone
        </h1>
        
        <p className="max-w-2xl text-slate-600 dark:text-slate-400 text-base md:text-lg mb-8 leading-relaxed">
          GrowTH is the intelligent companion for parents, providing actionable insights
          and calm tracking for your child's developmental journey.
        </p>

        <div className="flex items-center gap-4">
            <Link
              to={isLoggedIn ? "/dashboard" : "/register"}
              className="px-6 py-3 bg-[#056559] hover:bg-[#03443c] dark:bg-teal-400 dark:hover:bg-teal-300 text-white dark:text-slate-950 font-medium text-sm rounded-full transition shadow-sm"
            >
              Start tracking
            </Link>

            <Link
              to="/about"
              className="px-6 py-3 rounded-full text-sm font-semibold text-slate-700 hover:text-teal-700 bg-slate-100 hover:bg-slate-200 dark:bg-transparent dark:text-teal-300 dark:border dark:border-teal-400/40 dark:hover:bg-teal-400/10 transition-colors"
            >
              Learn More
            </Link>
        </div>
      </section>

      {/* ----------------- Dashboard Preview Section ----------------- */}
      <section className="w-full bg-white dark:bg-slate-800/30 py-16 md:py-24 my-12 text-center border-y border-slate-100 dark:border-slate-800/80 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            Comprehensive Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base mb-12 max-w-2xl mx-auto">
            Monitor growth metrics with professional precision on any device.
          </p>

          <div className="bg-[#f0f5f4] dark:bg-slate-800/40 p-3 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-2xl shadow-slate-300/40 dark:shadow-black/40">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-left shadow-xs">

              <div className="bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff7675] block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#fdcb6e] block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#55efc4] block"></span>
              </div>

              <div className="p-2 sm:p-3 bg-[#f7fcfb] dark:bg-slate-800/50 border border-[#d2efe9] dark:border-slate-700 m-2 sm:m-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-[#056559] dark:text-teal-300">GrowTH</span>
                  <div className="w-4 h-4 rounded-full bg-[#a3eadc] dark:bg-teal-500/50"></div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg py-1.5 px-3 border border-[#e2f4f0] dark:border-slate-700 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-[#a3eadc] dark:bg-teal-500/50 shrink-0"></div>
                  <div className="space-y-1 w-full">
                    <div className="h-2 w-28 bg-[#444444] dark:bg-slate-300 rounded-full"></div>
                    <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-600 rounded-full"></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((_, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 rounded-lg py-1.5 px-2.5 border border-[#056559] dark:border-teal-500/50 space-y-1 shadow-2xs">
                      <div className="h-1 w-8 bg-slate-200 dark:bg-slate-600 rounded-full"></div>
                      <div className="h-2 w-12 bg-[#444444] dark:bg-slate-300 rounded-full"></div>
                    </div>
                  ))}
                </div>
              
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-[#e2f4f0] dark:border-slate-700 space-y-2 shadow-2xs">
                  <div className="h-2 w-24 bg-[#444444] dark:bg-slate-300 rounded-full"></div>
              
                  <div className="relative h-10 sm:h-12 w-full overflow-hidden rounded-md text-[#056559] dark:text-teal-400">
                    <svg className="w-full h-full" viewBox="0 0 500 50" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="dashboardChartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d="M 0 42 L 500 20 L 500 50 L 0 50 Z" fill="url(#dashboardChartGradient)" />
                      <path d="M 0 42 L 500 20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              
              </div>
            </div>
          </div>
              
        </div>
      </section>

      {/* ----------------- About Section ----------------- */}
      <section id="about" className="max-w-5xl mx-auto px-6 mb-24">
        <div className="grid md:grid-cols-12 gap-12 items-center">

          {/* Left Mockup Preview */}
          <div className="md:col-span-4 flex justify-center">
            <div className="w-60 h-[370px] bg-[#f4f9f8] dark:bg-slate-900/70 rounded-[32px] border-4 border-slate-200 dark:border-slate-700 shadow-md p-3.5 flex flex-col justify-between select-none">

              {/* Header */}
              <div className="flex items-center justify-between px-1 pt-0.5">
                <span className="text-xs font-bold text-[#056559] dark:text-teal-300">GrowTH</span>
                <div className="w-5 h-5 rounded-full bg-[#a7ebd9] dark:bg-teal-500/50" />
              </div>

              {/* Profile Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 border border-[#bcece0] dark:border-slate-700 flex items-center gap-2.5 shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-[#a7ebd9] dark:bg-teal-500/50 shrink-0" />
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="h-2 bg-slate-700 dark:bg-slate-200 rounded-full w-4/5" />
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full w-1/2" />
                </div>
              </div>

              {/* 3 Metric Cards Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((item) => (
                  <div 
                    key={item} 
                    className="bg-white dark:bg-slate-800 rounded-lg p-1.5 border border-[#00685f] dark:border-teal-500/50 flex flex-col gap-1"
                  >
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full w-2/3" />
                    <div className="h-2 bg-slate-700 dark:bg-slate-200 rounded-full w-full" />
                  </div>
                ))}
              </div>
            
              {/* Growth Chart Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 border border-[#bcece0] dark:border-slate-700 flex flex-col gap-2 shadow-2xs">
                <div className="h-2 bg-slate-700 dark:bg-slate-200 rounded-full w-3/5 my-0.5" />
                <div className="relative h-20 w-full rounded-xl overflow-hidden bg-gradient-to-t from-[#a7ebd9]/60 via-[#a7ebd9]/20 dark:from-teal-500/25 dark:via-teal-500/10 to-transparent flex items-end">
                  <svg 
                    className="w-full h-full text-slate-900 dark:text-teal-300" 
                    viewBox="0 0 100 40" 
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 0 35 L 25 28 L 65 20 L 100 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            
            </div>
          </div>
            
          {/* Right Content */}
          <div className="md:col-span-8">
            <span className="text-teal-700 dark:text-teal-300 text-xs font-semibold tracking-wider uppercase mb-2 block">
              About GrowTH
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              For Parents Who Care
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8">
              Designed specifically for proactive parents, GrowTH translates complex developmental data 
              into simple, actionable insights. We believe in providing clarity over clutter, 
              so you can focus on what matters most — your child's well-being.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-500/10 border border-teal-100/80 dark:border-teal-500/20 flex items-center justify-center">
                  <TrendingUp size={20} className="text-[#056559] dark:text-teal-300" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">Track Progress</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Log milestones and physical growth with ease.</p>
                </div>
              </div>
            
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-500/10 border border-teal-100/80 dark:border-teal-500/20 flex items-center justify-center">
                  <Sparkles size={20} className="text-[#056559] dark:text-teal-300" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">AI-Assisted</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Bone age and biological growth prediction.</p>
                </div>
              </div>
            </div>
          </div>
            
        </div>
      </section>

      {/* ----------------- Promo Video Banner ----------------- */}
      <section className="w-full bg-white dark:bg-slate-800/30 py-16 my-12 border-y border-slate-100 dark:border-slate-800/80 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#056559] via-[#045248] to-[#023832] rounded-3xl h-64 md:h-80 flex flex-col items-center justify-center text-white relative shadow-xl shadow-teal-950/10 overflow-hidden border border-teal-800/40">
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />

            <button 
              aria-label="Play Promo Video"
              type="button"
              className="relative z-10 w-16 h-16 bg-white/90 hover:bg-white text-[#056559] rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105 group cursor-pointer"
            >
              <Play 
                size={26} 
                className="ml-1 text-[#056559] fill-[#056559] group-hover:scale-110 transition-transform duration-200" 
              />
            </button>

            <span className="relative z-10 text-xs sm:text-sm text-teal-100/80 mt-4 tracking-wide font-medium bg-teal-950/30 px-3 py-1 rounded-full border border-teal-700/30">
              Promo video — coming soon
            </span>
          </div>
        </div>
      </section>

      {/* ----------------- Nurturing Knowledge Section ----------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 text-left">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#004640] dark:text-teal-300 mb-1">
              Nurturing Knowledge
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Expert articles to guide you through every stage.
            </p>
          </div>
          <Link to="/knowledge" className="text-xs font-semibold text-[#00685f] dark:text-teal-300 hover:underline">
            View all
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px] items-stretch">
          {articles.map((a) => {
            const IconComponent = a.Icon;
            return (
              <div key={a.id} className="rounded-[14px] overflow-hidden bg-white dark:bg-slate-800/60 border border-transparent dark:border-slate-700 shadow-[0_4px_12px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between">
                <div className={`h-[150px] flex items-center justify-center ${a.bgColor}`}>
                  <IconComponent size={44} className="text-[#00685f] dark:text-teal-300" strokeWidth={1.75} />
                </div>
                <div className="p-[22px] flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[#00685f] dark:text-teal-300 text-[12px] font-bold uppercase tracking-[0.06em] block">
                      {a.label}
                    </span>
                    <h3 className="text-[16px] my-2 text-[#111827] dark:text-slate-100 font-semibold">
                      {a.title}
                    </h3>
                    <p className="text-[13px] leading-[1.5] text-[#6b7280] dark:text-slate-400">
                      {a.desc}
                    </p>
                  </div>
                  <div>
                    <p className="mt-4 text-[12px] text-[#9ca3af] dark:text-slate-500">
                      Source: reviewed medical references
                    </p>
                    <Link 
                      to={`/knowledge/${a.slug}`} 
                      state={{ from: "/" }}
                      className="text-xs font-semibold inline-block mt-3 text-[#00685f] dark:text-teal-300 hover:underline"
                    >
                      Read More
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}