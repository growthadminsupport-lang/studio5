import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      className="theme-button"
      onClick={toggleTheme}
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