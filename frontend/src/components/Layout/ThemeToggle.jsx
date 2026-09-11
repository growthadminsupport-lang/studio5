import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon size={21} strokeWidth={1.8} />
      ) : (
        <Sun size={21} strokeWidth={1.8} />
      )}
    </button>
  );
}

export default ThemeToggle;
