import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <button
      className="theme-button"
      onClick={() => setIsDark((prev) => !prev)}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun size={21} strokeWidth={1.8} />
      ) : (
        <Moon size={21} strokeWidth={1.8} />
      )}
    </button>
  );
}