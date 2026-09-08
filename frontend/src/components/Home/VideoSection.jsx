export default function VideoSection() {
  return (
    <section className="px-6 py-10 max-w-7xl mx-auto">
      <div className="relative bg-gradient-to-br from-emerald-400 to-teal-700 rounded-2xl h-[420px] flex items-center justify-center overflow-hidden">
        <button
          className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-105 transition"
          aria-label="Play promo video"
        >
          <span className="text-emerald-600 text-2xl">▶</span>
        </button>
        <p className="absolute bottom-4 text-xs text-white/80">
          Promo video — coming soon
        </p>
      </div>
    </section>
  );
}