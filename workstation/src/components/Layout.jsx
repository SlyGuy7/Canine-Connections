import React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"

const NO_BACK = ["/dashboard", "/browse-dogs", "/shelters", "/resources"]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const showBack = !NO_BACK.includes(pathname)

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Sidebar />
      <main
        key={pathname}
        style={{
          flex: 1,
          marginLeft: "260px",
          height: "100vh",
          overflowY: "auto",
          padding: "40px",
          animation: "page-enter 0.22s ease",
        }}
      >
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "20px",
              padding: "9px 18px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              color: "var(--text-muted)",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        )}
        {children}
      </main>
    </div>
  )
}
