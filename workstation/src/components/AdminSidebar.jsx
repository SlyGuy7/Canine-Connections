import React from "react"
import { useNavigate, useLocation } from "react-router-dom"

const links = [
  { label: "Overview",        path: "/admin/dashboard" },
  { label: "Dogs",            path: "/admin/dogs" },
  { label: "Applications",    path: "/admin/applications" },
  { label: "Success Stories", path: "/admin/stories" },
  { label: "Users",           path: "/admin/users" },
]

export default function AdminSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminRole")
    localStorage.removeItem("adminUserId")
    localStorage.removeItem("adminEmail")
    localStorage.removeItem("adminFirstName")
    navigate("/admin")
  }

  return (
    <aside style={{
      width: '240px',
      minHeight: '100vh',
      background: '#2f241d',
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 0',
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 24px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: '#b45309', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>CC</span>
          </div>
          <div>
            <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '14px' }}>Admin Portal</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Canine Connections</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {links.map((link) => {
          const active = location.pathname === link.path
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                background: active ? '#b45309' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                padding: '11px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                color: active ? 'white' : 'rgba(255,255,255,0.6)',
                fontWeight: active ? '600' : '400',
                fontSize: '14px',
                transition: 'all 0.15s ease',
              }}
            >
              {link.label}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ margin: '0 0 12px 14px', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
          {localStorage.getItem("adminEmail") || "Admin"}
        </p>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            padding: '10px 14px',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: '13px',
            width: '100%',
            textAlign: 'left',
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
