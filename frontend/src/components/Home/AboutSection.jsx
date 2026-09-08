export default function AboutSection() {
  return (
    <section id="about" className="py-20 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div className="flex justify-center">
        <div className="w-56 bg-night-800 rounded-3xl border border-white/10 p-5 shadow-xl">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-3">
            <span className="text-emerald-400 font-semibold">GrowTH</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-emerald-400" />
            <div className="h-2 w-16 bg-white/10 rounded" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 border border-emerald-400/40 rounded" />
            ))}
          </div>
          <div className="h-14 bg-night-900 rounded-lg flex items-end p-2">
            <svg viewBox="0 0 100 30" className="w-full h-full">
              <polyline
                points="0,25 20,22 40,18 60,12 80,8 100,5"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      </div>

      <div>
        <p className="text-emerald-400 text-xs font-semibold tracking-widest mb-2">
          ABOUT GROWTH
        </p>
        <h2 className="text-3xl font-bold mb-4">For Parents Who Care</h2>
        <p className="text-gray-400 mb-8">
          Designed specifically for proactive parents, GrowTH translates
          complex developmental data into simple, actionable insights. We
          believe in providing clarity over clutter, so you can focus on what
          matters most — your child's well-being.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-night-800 border border-white/5 rounded-xl p-4">
            <p className="text-emerald-400 mb-2">📈</p>
            <h4 className="font-semibold mb-1">Track Progress</h4>
            <p className="text-xs text-gray-400">
              Log milestones and physical growth with ease.
            </p>
          </div>
          <div className="bg-night-800 border border-white/5 rounded-xl p-4">
            <p className="text-emerald-400 mb-2">💡</p>
            <h4 className="font-semibold mb-1">AI-Assisted</h4>
            <p className="text-xs text-gray-400">
              Bone age screening support, in one place.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}