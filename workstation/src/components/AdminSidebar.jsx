import React from "react"
import { useNavigate, useLocation } from "react-router-dom"

const links = [
  { label: "Overview",        path: "/admin/dashboard", icon: "▦" },
  { label: "Dogs",            path: "/admin/dogs",       icon: "🐾" },
  { label: "Applications",    path: "/admin/applications",icon: "📋" },
  { label: "Success Stories", path: "/admin/stories",    icon: "⭐" },
  { label: "Users",           path: "/admin/users",      icon: "👤" },
]

export default function AdminSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    ["adminToken","adminRole","adminUserId","adminEmail","adminFirstName"].forEach(k => localStorage.removeItem(k))
    navigate("/admin")
  }

  return (
    <aside style={{ width: '240px', minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0, borderRight: '1px solid #1f1f1f' }}>
      <div style={{ padding: '28px 24px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', background: '#dc2626', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>CC</span>
          </div>
          <div>
            <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '14px' }}>Admin Portal</p>
            <p style={{ margin: 0, color: '#555', fontSize: '11px' }}>Canine Connections</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {links.map((link) => {
          const active = location.pathname === link.path
          return (
            <button key={link.path} onClick={() => navigate(link.path)} style={{
              background: active ? '#dc2626' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              color: active ? 'white' : '#888',
              fontWeight: active ? '600' : '400',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888' } }}
            >
              <span style={{ fontSize: '14px' }}>{link.icon}</span>
              {link.label}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '16px 12px', borderTop: '1px solid #1f1f1f' }}>
        <p style={{ margin: '0 0 10px 14px', color: '#444', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {localStorage.getItem("adminEmail") || "Admin"}
        </p>
        <button onClick={handleLogout} style={{
          background: 'transparent',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#666',
          cursor: 'pointer',
          fontSize: '13px',
          width: '100%',
          textAlign: 'left',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#666' }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}