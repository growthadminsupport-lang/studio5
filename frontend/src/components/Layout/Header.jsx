import { Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext.jsx";

export default function Header() {
  const { dispatch } = useAppContext();

  return (
    <header className="sticky top-0 z-50 bg-night-950/90 backdrop-blur border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          <span className="text-xl font-bold">
            Grow<span className="text-emerald-400">TH</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <Link to="/" className="text-emerald-400 border-b-2 border-emerald-400 pb-1">
            HOME
          </Link>
          <a href="#about" className="hover:text-emerald-400 transition">ABOUT</a>
          <a href="#contact" className="hover:text-emerald-400 transition">CONTACT</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="border border-emerald-400 text-emerald-400 rounded-full px-5 py-2 text-sm font-semibold hover:bg-emerald-400 hover:text-night-950 transition"
          >
            Login / Sign Up
          </Link>
          <button
            onClick={() => dispatch({ type: "TOGGLE_THEME" })}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5"
            aria-label="Toggle theme"
          >
            ☀️
          </button>
        </div>
      </div>
    </header>
  );
}