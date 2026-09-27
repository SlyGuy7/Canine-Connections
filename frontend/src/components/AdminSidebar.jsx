// Fixed left-hand navigation sidebar rendered on every admin page.
// Reads admin identity from localStorage and provides nav links + sign-out.
import React, { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { clearAdminSession } from "../services/auth"

// All five admin sections — rendered as nav buttons in order.
const links = [
  { label: "Overview",        path: "/admin/dashboard",     icon: "▦" },
  { label: "Dogs",            path: "/admin/dogs",          icon: "🐾" },
  { label: "Applications",   path: "/admin/applications",  icon: "📋" },
  { label: "Success Stories", path: "/admin/stories",       icon: "⭐" },
  { label: "Users",           path: "/admin/users",         icon: "👤" },
]

export default function AdminSidebar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  // Tracks which nav button is hovered so we can apply a hover background without CSS.
  const [hovered, setHovered] = useState(null)

  // Clears the admin session and redirects to the admin login page.
  const handleLogout = () => {
    clearAdminSession()
    navigate("/admin")
  }

  // Pull identity info stored by AdminLogin.jsx; used in the bottom user card.
  const adminName  = localStorage.getItem("adminFirstName") || ""
  const adminEmail = localStorage.getItem("adminEmail")     || "Admin"
  // Build a single-character initial for the avatar chip.
  const initials   = adminName ? adminName[0].toUpperCase() : adminEmail[0].toUpperCase()

  return (
    <aside style={{
      width: '240px', minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderRight: '1px solid #1a1a1a',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>
            <span style={{ color: 'white', fontWeight: '800', fontSize: '12px' }}>CC</span>
          </div>
          <div>
            <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '13px', lineHeight: 1.2 }}>Admin Portal</p>
            <p style={{ margin: 0, color: '#444', fontSize: '11px', marginTop: '2px' }}>Canine Connections</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {links.map((link) => {
          const active = location.pathname === link.path
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              onMouseEnter={() => setHovered(link.path)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: active ? 'rgba(220,38,38,0.15)' : hovered === link.path ? '#141414' : 'transparent',
                border: active ? '1px solid rgba(220,38,38,0.3)' : '1px solid transparent',
                borderRadius: '8px', padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                color: active ? '#f87171' : hovered === link.path ? '#e0e0e0' : '#666',
                fontWeight: active ? '600' : '400', fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s',
                width: '100%',
              }}
            >
              <span style={{ fontSize: '14px', width: '18px', textAlign: 'center' }}>{link.icon}</span>
              {link.label}
              {active && <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: '#dc2626' }} />}
            </button>
          )
        })}
      </nav>

      {/* User + logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', marginBottom: '6px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#1f1f1f', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#888', fontSize: '12px', fontWeight: '700' }}>{initials}</span>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, color: '#ccc', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adminName || adminEmail}</p>
            {adminName && <p style={{ margin: 0, color: '#444', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adminEmail}</p>}
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '9px 12px', color: '#555', cursor: 'pointer', fontSize: '12px', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#7f1d1d'; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f1f1f'; e.currentTarget.style.color = '#555' }}
        >
          <span>↩</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
