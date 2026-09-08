import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import logo from "../../assets/logo.png";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-logo">
        <img src={logo} alt="" />
        <span>GrowTH</span>
      </Link>

      <div className="navbar-links">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/growth">Growth</NavLink>
        <NavLink to="/puberty">Puberty</NavLink>
        <NavLink to="/bone-age">AI Prediction</NavLink>
        <span className="navbar-divider" />
        <NavLink to="/knowledge">Resources</NavLink>
        <NavLink to="/contact">Contact</NavLink>
      </div>

      <div className="navbar-actions">
        <NotificationBell />
        <ProfileMenu />
      </div>
    </nav>
  );
}

export default Navbar;