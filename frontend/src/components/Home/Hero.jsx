export default function Hero() {
  return (
    <section className="text-center px-6 pt-16 pb-24 max-w-4xl mx-auto">
      <div className="flex justify-center mb-6">
        {/* Replace with your mascot illustration */}
        <img
          src="/mascot.png"
          alt="GrowTH mascot"
          className="w-40 h-40 object-contain"
        />
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
        <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
          Nurture
        </span>{" "}
        Every{" "}
        <span className="bg-gradient-to-r from-teal-300 to-blue-400 bg-clip-text text-transparent">
          Milestone
        </span>
      </h1>

      <p className="text-gray-400 max-w-2xl mx-auto mb-8">
        GrowTH is the intelligent companion for parents, providing actionable
        insights and calm tracking for your child's developmental journey.
      </p>

      <div className="flex justify-center gap-4">
        <button className="bg-emerald-400 text-night-950 font-semibold px-6 py-3 rounded-full hover:bg-emerald-300 transition">
          Start Tracking
        </button>
        <button className="border border-emerald-400 text-emerald-400 font-semibold px-6 py-3 rounded-full hover:bg-emerald-400/10 transition">
          Learn More
        </button>
      </div>
    </section>
  );
}