import React, { useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { Menu, X } from "lucide-react"
import Logo from "./Logo"
import { hasUserSession } from "../services/auth"
import { useAuthModal } from "./authModal"

const NAV_LINKS = [
  { to: "/browse-dogs",     label: "Adopt" },
  { to: "/shelters",        label: "Shelters" },
  { to: "/how-it-works",    label: "How it works" },
  { to: "/resources",       label: "Resources" },
  { to: "/success-stories", label: "Stories" },
  { to: "/about",           label: "About" },
]

export default function SiteHeader() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { openAuth } = useAuthModal()
  const loggedIn = hasUserSession()
  const firstName = localStorage.getItem("userFirstName") || "Account"
  // The menu remembers the page it was opened on, so it closes itself on navigation.
  const [menuOpenOn, setMenuOpenOn] = useState(null)
  const menuOpen = menuOpenOn === pathname

  const actions = loggedIn ? (
    <>
      <span className="s-hide-mobile s-muted" style={{ fontSize: 14 }}>Hi, {firstName}</span>
      <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>My dashboard</button>
    </>
  ) : (
    <>
      <button className="btn btn-ghost s-hide-mobile" onClick={() => openAuth("login")}>Log in</button>
      <button className="btn btn-primary s-hide-mobile" onClick={() => openAuth("register")}>Create account</button>
    </>
  )

  return (
    <header className="s-header">
      <div className="s-container s-header__inner">
        <Logo />
        <nav className="s-nav" aria-label="Main">
          {NAV_LINKS.map(link => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "is-active" : undefined)}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="s-header__actions">{actions}</div>
        <button className="s-menu-btn" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}
          onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <nav className="s-mobile-nav" aria-label="Main">
          {NAV_LINKS.map(link => <Link key={link.to} to={link.to}>{link.label}</Link>)}
          {loggedIn ? (
            <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>My dashboard</button>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => openAuth("register")}>Create account</button>
              <button className="btn btn-secondary" onClick={() => openAuth("login")}>Log in</button>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
