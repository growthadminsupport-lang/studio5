import { NavLink } from "react-router-dom";
import { LayoutGrid, LineChart, Flag, BookOpen } from "lucide-react";
import "./BottomNav.css";

export default function BottomNav() {
  return (
    <nav className="bottom-nav md:hidden">
      <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
        <LayoutGrid size={20} />
        <span>Dashboard</span>
      </NavLink>

      <NavLink to="/growth" className={({ isActive }) => (isActive ? "active" : "")}>
        <LineChart size={20} />
        <span>Growth</span>
      </NavLink>

      <NavLink to="/puberty" className={({ isActive }) => (isActive ? "active" : "")}>
        <Flag size={20} />
        <span>Puberty</span>
      </NavLink>

      <NavLink to="/knowledge" className={({ isActive }) => (isActive ? "active" : "")}>
        <BookOpen size={20} />
        <span>Resources</span>
      </NavLink>
    </nav>
  );
}