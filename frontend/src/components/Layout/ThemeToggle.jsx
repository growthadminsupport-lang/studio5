import { useState } from "react";
import { Sun, Moon } from "lucide-react";

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  const toggleTheme = () => {
    setDark((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <button
      className="theme-button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
    >
      {dark ? (
        <Moon size={20} strokeWidth={1.8} />
      ) : (
        <Sun size={20} strokeWidth={1.8} />
      )}
    </button>
  );
}

export default ThemeToggle;

