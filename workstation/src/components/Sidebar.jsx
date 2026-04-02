import React from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "🏠" },
    { name: "Browse Dogs", path: "/browse-dogs", icon: "🔍" },
    { name: "Shelters", path: "/shelters", icon: "🏘️" },
    { name: "My Dogs", path: "/my-dogs", icon: "❤️" },
    { name: "Applications", path: "/applications", icon: "📋" },
    { name: "Messages", path: "/messages", icon: "💬" },
    { name: "Settings", path: "/settings", icon: "⚙️" }
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="paw-icon">🐾</span>
        <h2>Canine Connections</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => 
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <button className="logout-btn" onClick={handleLogout} style={{ marginTop: 'auto' }}>
        <span>🚪</span>
        <span style={{ marginLeft: '12px' }}>Log Out</span>
      </button>
    </aside>
  );
}