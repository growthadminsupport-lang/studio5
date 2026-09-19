import React, { useEffect } from "react";
import { LineChart, Lightbulb, PlusSquare, Shield } from "lucide-react";

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/40 dark:bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 font-sans transition-colors">
      <div className="max-w-4xl mx-auto">
        
        {/* Subtitle & Title */}
        <span className="text-[#056559] dark:text-teal-300 text-sm font-semibold tracking-wide block mb-3">
          About
        </span>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-6">
          What GrowTH is, and who it's for
        </h1>
        
        <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-12 max-w-3xl">
          GrowTH is a web application built for parents and caregivers of children from infancy
          through adolescence — anyone who wants to track a child's physical growth, screen
          for early or delayed puberty, and keep that history in one place between clinic visits.
          It's a screening and record-keeping aid, not a diagnostic tool, and it's not a substitute
          for a pediatrician.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          {/* Growth Tracking */}
          <div className="bg-white dark:bg-[#111b30] p-6 rounded-2xl border border-slate-200/80 dark:border-teal-400/10 shadow-xs dark:shadow-none space-y-3">
            <LineChart className="w-6 h-6 text-[#056559] dark:text-teal-300" strokeWidth={2} />
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Growth Tracking</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Log height, weight, and BMI over time, plotted against standard pediatric growth references — not just raw numbers.
            </p>
          </div>

          {/* Puberty Screening */}
          <div className="bg-white dark:bg-[#111b30] p-6 rounded-2xl border border-slate-200/80 dark:border-teal-400/10 shadow-xs dark:shadow-none space-y-3">
            <Lightbulb className="w-6 h-6 text-[#056559] dark:text-teal-300" strokeWidth={2} />
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Puberty Screening</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              A guided, sex-specific questionnaire that flags signs that fall outside the typical age range, as a screening aid.
            </p>
          </div>

          {/* AI Bone Age */}
          <div className="bg-white dark:bg-[#111b30] p-6 rounded-2xl border border-slate-200/80 dark:border-teal-400/10 shadow-xs dark:shadow-none space-y-3">
            <PlusSquare className="w-6 h-6 text-[#056559] dark:text-teal-300" strokeWidth={2} />
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">AI Bone Age (in progress)</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload a hand X-ray for an AI-assisted bone age estimate to support — never replace — clinical assessment.
            </p>
          </div>

          {/* Privacy by design */}
          <div className="bg-white dark:bg-[#111b30] p-6 rounded-2xl border border-slate-200/80 dark:border-teal-400/10 shadow-xs dark:shadow-none space-y-3">
            <Shield className="w-6 h-6 text-[#056559] dark:text-teal-300" strokeWidth={2} />
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Privacy by design</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Data collection is limited to what each feature needs. A child's records stay visible only to their linked guardians.
            </p>
          </div>
          
        </div>

        {/* Bottom Project Banner */}
        <div className="bg-[#eaf8f5] dark:bg-[#0a1f16] p-6 md:p-8 rounded-2xl border border-teal-100/80 dark:border-teal-400/10 space-y-2">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">Where this comes from</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            GrowTH is developed as a project for the Digital Media Engineering program, Faculty of Engineering, Khon Kaen University. It's built as a class/capstone project, not a certified medical device — see the disclaimer in the footer of every page.
          </p>
        </div>

      </div>
    </div>
  );
}