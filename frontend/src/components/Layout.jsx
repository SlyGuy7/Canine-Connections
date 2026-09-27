// Shared page shell wrapping all authenticated user-facing pages.
// Handles the sidebar (desktop fixed / mobile drawer), Back button, and page-enter animation.
import React, { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import { useIsMobile } from "../hooks/useIsMobile"
import { PawPrint, Menu } from "lucide-react"
import PublicLayout from "../site/PublicLayout"
import { hasUserSession } from "../services/auth"

// These are "top-level" pages — navigating back from them would leave the app, so we hide the Back button.
const NO_BACK = ["/dashboard", "/browse-dogs", "/shelters", "/resources"]

// Logged-out visitors on public pages (browse, dog profiles, shelters, resources, stories) see the
// website header and footer; logged-in users get the app with its sidebar.
export default function Layout({ children }) {
  if (!hasUserSession()) return <PublicLayout contained>{children}</PublicLayout>
  return <AppLayout>{children}</AppLayout>
}

function AppLayout({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Only show the Back button on pages that are not top-level destinations.
  const showBack = !NO_BACK.includes(pathname)
  const isMobile = useIsMobile()
  // The mobile drawer remembers the page it was opened on, so it closes itself on navigation.
  const [drawerOpenOn, setDrawerOpenOn] = useState(null)
  const sidebarOpen = drawerOpenOn === pathname
  const setSidebarOpen = (open) => setDrawerOpenOn(open ? pathname : null)

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>

      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999 }}
        />
      )}

      <Sidebar isMobile={isMobile} open={!isMobile || sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        key={pathname}
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : "260px",
          height: "100vh",
          overflowY: "auto",
          padding: isMobile ? "16px" : "40px",
          animation: "page-enter 0.22s ease",
          boxSizing: "border-box",
        }}
      >
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ padding: "9px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <Menu size={20} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", background: "#d97706", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PawPrint size={14} color="white" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-primary)" }}>Canine Connections</span>
            </div>
          </div>
        )}

        {showBack && (
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: isMobile ? "16px" : "20px",
              padding: isMobile ? "7px 14px" : "9px 18px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              color: "var(--text-muted)",
              fontWeight: "600",
              fontSize: isMobile ? "13px" : "14px",
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
