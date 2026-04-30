import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Sidebar() {
const location = useLocation();
const navigate = useNavigate();
const [hoveredPath, setHoveredPath] = useState(null);
const [isLogoutHovered, setIsLogoutHovered] = useState(false);

const handleLogout = () => {
localStorage.clear();
sessionStorage.clear();
navigate("/landing");
};

const navLinks = [
{ path: "/profile",    label: "My Profile",  icon: "👤" },
{ path: "/dashboard",  label: "Dashboard",   icon: "🏠" },
{ path: "/browse-dogs",label: "Browse Dogs", icon: "🔍" },
{ path: "/shelters",   label: "Shelters",    icon: "🏢" },
{ path: "/my-dogs",    label: "My Dogs",     icon: "🐾" },
{ path: "/applications",label: "Applications",icon: "📄" },
{ path: "/messages",   label: "Messages",    icon: "💬" },
{ path: "/quiz",       label: "Quiz",        icon: "🧩" },
{ path: "/journal",    label: "Journal",     icon: "📖" },
{ path: "/settings",   label: "Settings",    icon: "⚙️" },
];

return (
<aside className="sidebar" style={{ fontFamily: "'Inter', sans-serif", width: '260px', height: '100vh', position: 'fixed', left: 0, top: 0, backgroundColor: 'white', borderRight: '1px solid #efdfd1', display: 'flex', flexDirection: 'column', padding: '32px 20px' }}>

  <div
    className="sidebar-title"
    onClick={() => navigate('/')}
    style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: '800', color: '#2f241d', marginBottom: '40px', paddingLeft: '8px', cursor: 'pointer' }}
  >
    <span style={{ fontSize: '24px' }}>🐕</span>
    Canine Connections
  </div>
  
  <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
    {navLinks.map((link) => {
      const isActive = location.pathname === link.path;
      const isHovered = hoveredPath === link.path;
      return (
        <Link 
          key={link.path}
          to={link.path} 
          onMouseEnter={() => setHoveredPath(link.path)}
          onMouseLeave={() => setHoveredPath(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 16px',
            textDecoration: 'none',
            borderRadius: '12px',
            color: isActive || isHovered ? '#d97706' : '#6f5848',
            backgroundColor: isActive ? '#fcedda' : (isHovered ? '#fffaf5' : 'transparent'),
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{link.icon}</span>
          <span style={{ fontWeight: isActive ? '700' : '500' }}>{link.label}</span>
        </Link>
      );
    })}
  </nav>
  
  <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid #efdfd1' }}>
    <button 
      className="logout-btn" 
      onClick={handleLogout}
      onMouseEnter={() => setIsLogoutHovered(true)}
      onMouseLeave={() => setIsLogoutHovered(false)}
      style={{ 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '14px', 
        padding: '12px 16px',
        borderRadius: '12px',
        border: 'none', 
        background: isLogoutHovered ? '#fff1f2' : 'transparent', 
        color: '#e11d48',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'left'
      }}
    >
      <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>🚪</span>
      <span style={{ fontWeight: '600' }}>Log Out</span>
    </button>
  </div>
</aside>
);
}