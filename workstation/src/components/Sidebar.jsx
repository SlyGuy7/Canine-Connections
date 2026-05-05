import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  User, LayoutDashboard, Search, Building2, Heart,
  FileText, MessageCircle, Brain, BookOpen, Library,
  Settings, LogOut, PawPrint, Moon, Sun, Star,
} from "lucide-react";

function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.getAttribute("data-theme") === "dark");
  const toggle = () => {
    const next = !dark;
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("canine_theme", next ? "dark" : "light");
    setDark(next);
  };
  useEffect(() => {
    const saved = localStorage.getItem("canine_theme");
    if (saved === "dark") { document.documentElement.setAttribute("data-theme", "dark"); setDark(true); }
  }, []);
  return [dark, toggle];
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredPath, setHoveredPath] = useState(null);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [dark, toggleDark] = useDarkMode();

  useEffect(() => {
    const flag = localStorage.getItem("canine_unread_messages");
    setHasUnread(flag === "true");
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/landing");
  };

  const navLinks = [
    { path: "/profile",      label: "My Profile",   Icon: User },
    { path: "/dashboard",    label: "Dashboard",    Icon: LayoutDashboard },
    { path: "/browse-dogs",  label: "Browse Dogs",  Icon: Search },
    { path: "/shelters",     label: "Shelters",     Icon: Building2 },
    { path: "/my-dogs",      label: "My Dogs",      Icon: Heart },
    { path: "/applications", label: "Applications", Icon: FileText },
    { path: "/messages",     label: "Messages",     Icon: MessageCircle, badge: hasUnread },
    { path: "/quiz",         label: "Quiz",         Icon: Brain },
    { path: "/journal",      label: "Journal",      Icon: BookOpen },
    { path: "/resources",        label: "Resources",       Icon: Library },
    { path: "/success-stories", label: "Success Stories", Icon: Star },
    { path: "/settings",        label: "Settings",        Icon: Settings },
  ];

  return (
    <aside
      className="sidebar"
      style={{
        fontFamily: "'Inter', sans-serif",
        width: "260px",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "32px 20px",
      }}
    >
      {/* Logo */}
      <div
        onClick={() => navigate("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "18px",
          fontWeight: "800",
          color: "var(--text-primary)",
          marginBottom: "40px",
          paddingLeft: "8px",
          cursor: "pointer",
        }}
      >
        <div style={{ width: "34px", height: "34px", background: "#d97706", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <PawPrint size={18} color="white" strokeWidth={2.5} />
        </div>
        <span>Canine Connections</span>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flexGrow: 1, overflowY: "auto" }}>
        {navLinks.map(({ path, label, Icon, badge }) => {
          const isActive  = location.pathname === path;
          const isHovered = hoveredPath === path;
          return (
            <Link
              key={path}
              to={path}
              onMouseEnter={() => setHoveredPath(path)}
              onMouseLeave={() => setHoveredPath(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "11px 14px",
                textDecoration: "none",
                borderRadius: "12px",
                color: isActive || isHovered ? "#d97706" : "var(--text-muted)",
                backgroundColor: isActive ? "#fcedda" : isHovered ? "var(--bg-secondary)" : "transparent",
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{ fontWeight: isActive ? "700" : "500", fontSize: "14px" }}>{label}</span>
              {badge && (
                <span style={{
                  position: "absolute",
                  right: "14px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#ef4444",
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", borderRadius: "12px", border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", transition: "all 0.15s ease", textAlign: "left" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          {dark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
          <span style={{ fontWeight: "500", fontSize: "14px" }}>{dark ? "Light Mode" : "Dark Mode"}</span>
        </button>

        {/* Logout */}
        <button
          className="logout-btn"
          onClick={handleLogout}
          onMouseEnter={() => setIsLogoutHovered(true)}
          onMouseLeave={() => setIsLogoutHovered(false)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", borderRadius: "12px", border: "none", background: isLogoutHovered ? "#fff1f2" : "transparent", color: "#e11d48", cursor: "pointer", transition: "all 0.15s ease", textAlign: "left" }}
        >
          <LogOut size={18} strokeWidth={2} />
          <span style={{ fontWeight: "600", fontSize: "14px" }}>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
