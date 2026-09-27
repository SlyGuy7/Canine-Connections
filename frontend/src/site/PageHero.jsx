import React from "react"
import { Link } from "react-router-dom"

// Title band at the top of an info page, with a breadcrumb back to the homepage.
export default function PageHero({ eyebrow, title, lead, children }) {
  return (
    <section className="s-page-hero">
      <div className="s-container">
        <nav className="s-breadcrumb" aria-label="Breadcrumb"><Link to="/landing">Home</Link><span>/</span><span>{title}</span></nav>
        {eyebrow && <span className="s-eyebrow">{eyebrow}</span>}
        <h1 className="s-h1" style={{ fontSize: "clamp(34px, 4.2vw, 52px)" }}>{title}</h1>
        {lead && <p className="s-lead">{lead}</p>}
        {children}
      </div>
    </section>
  )
}
