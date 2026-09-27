import React from "react"
import { Link } from "react-router-dom"
import Logo from "./Logo"
import { useAuthModal } from "./authModal"
import { hasUserSession } from "../services/auth"

export default function SiteFooter() {
  const { openAuth } = useAuthModal()
  const loggedIn = hasUserSession()

  return (
    <footer className="s-footer">
      <div className="s-container">
        <div className="s-footer__grid">
          <div className="s-footer__brand">
            <Logo />
            <p className="s-footer__about">
              Canine Connections brings rescue dogs from partner shelters in New Jersey, New York and
              Pennsylvania into one place, so finding the right dog is simple — and free.
            </p>
          </div>
          <div>
            <h4>Adopt</h4>
            <ul>
              <li><Link to="/browse-dogs">Browse dogs</Link></li>
              <li><Link to="/browse-dogs?age=Puppy">Puppies</Link></li>
              <li><Link to="/browse-dogs?age=Senior">Senior dogs</Link></li>
              <li><Link to="/shelters">Partner shelters</Link></li>
              <li><Link to="/how-it-works">How it works</Link></li>
            </ul>
          </div>
          <div>
            <h4>Learn</h4>
            <ul>
              <li><Link to="/resources">Care guides</Link></li>
              <li><Link to="/success-stories">Success stories</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/admin">Shelter login</Link></li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              {loggedIn ? (
                <>
                  <li><Link to="/dashboard">Dashboard</Link></li>
                  <li><Link to="/applications">My applications</Link></li>
                  <li><Link to="/settings">Settings</Link></li>
                </>
              ) : (
                <>
                  <li><button className="s-footer__link" onClick={() => openAuth("login")}>Log in</button></li>
                  <li><button className="s-footer__link" onClick={() => openAuth("register")}>Create account</button></li>
                  <li><button className="s-footer__link" onClick={() => openAuth("forgot-password")}>Forgot password</button></li>
                </>
              )}
            </ul>
          </div>
        </div>
        <div className="s-footer__bottom">
          <span>© {new Date().getFullYear()} Canine Connections</span>
          <nav aria-label="Legal">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
