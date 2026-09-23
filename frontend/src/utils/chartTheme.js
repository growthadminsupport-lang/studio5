import { useTheme } from "../context/ThemeContext";

// Recharts takes plain colour values (not Tailwind classes), so the
// chart colours switch here based on the active theme.
const LIGHT = {
  grid: "#eef2f1",
  axis: "#e2e8f0",
  tick: "#94a3b8",
  median: "#00685f",
  own: "#056559",
  tooltip: { background: "#ffffff", border: "#eef2f1", text: "#0f172a" },
  bandOpacityScale: 1,
  bands: {},
};

const DARK = {
  grid: "#1e293b",
  axis: "#334155",
  tick: "#94a3b8",
  median: "#5eead4",
  own: "#2dd4bf",
  tooltip: { background: "#0f172a", border: "#334155", text: "#e2e8f0" },
  // Pale pastel bands glare on a dark card, so each one becomes a
  // deeper tone of the same hue and is drawn more softly.
  bandOpacityScale: 0.4,
  bands: {
    "#e2e8f0": "#64748b",
    "#bfdbfe": "#3b82f6",
    "#fed7aa": "#f97316",
    "#dbe4f5": "#3b82f6",
    "#c8f0dc": "#10b981",
    "#fde2c8": "#f97316",
    "#fbeec2": "#eab308",
    "#f9d3d3": "#ef4444",
  },
};

export function useChartTheme() {
  const { theme } = useTheme() || {};
  const t = theme === "dark" ? DARK : LIGHT;

  return {
    ...t,
    band: (lightHex) => t.bands[lightHex] || lightHex,
    opacity: (value) => value * t.bandOpacityScale,
    tooltipStyle: {
      borderRadius: "12px",
      border: `1px solid ${t.tooltip.border}`,
      backgroundColor: t.tooltip.background,
      color: t.tooltip.text,
      fontSize: "12px",
    },
  };
}
