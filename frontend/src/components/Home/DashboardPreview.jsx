export default function DashboardPreview() {
  return (
    <section className="bg-night-900/60 py-20 px-6">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <h2 className="text-3xl font-bold mb-3">Comprehensive Dashboard</h2>
        <p className="text-gray-400">
          Monitor growth metrics with professional precision on any device.
        </p>
      </div>

      <div className="max-w-3xl mx-auto bg-night-800 rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        {/* Window bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-night-900/50">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
            <span className="text-emerald-400 font-semibold">GrowTH</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-400" />
            <div className="h-3 w-32 bg-white/10 rounded" />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 border border-emerald-400/40 rounded-lg flex items-center px-3"
              >
                <div className="h-2 w-full bg-white/10 rounded" />
              </div>
            ))}
          </div>

          <div className="h-24 bg-night-900 rounded-lg flex items-end p-3">
            <svg viewBox="0 0 200 60" className="w-full h-full">
              <polyline
                points="0,50 40,45 80,35 120,25 160,15 200,10"
                fill="none"
                stroke="#34d399"
                strokeWidth="3"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}