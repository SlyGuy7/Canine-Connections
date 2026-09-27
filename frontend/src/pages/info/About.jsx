import React from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import PublicLayout from "../../site/PublicLayout"
import PageHero from "../../site/PageHero"
import { PHOTOS, TEAM } from "../../site/content"

export default function About() {
  return (
    <PublicLayout>
      <PageHero eyebrow="About us" title="Every rescue dog deserves to be found"
        lead="Canine Connections puts adoptable dogs from independent rescues and shelters in one place, so more of them find homes — and faster." />

      <section className="s-section">
        <div className="s-container s-split">
          <div>
            <span className="s-eyebrow">Our mission</span>
            <h2 className="s-h2">Make adoption the easy choice</h2>
            <div className="s-prose">
              <p>
                Small rescues do extraordinary work, but their dogs are spread across dozens of websites,
                social feeds and spreadsheets. Families who want to adopt give up before they find the right
                dog, and great dogs wait months for someone to notice them.
              </p>
              <p>
                We bring those listings together, give adopters one simple application, and give shelters
                the tools to review applications, answer questions and share their success stories.
                Adopters never pay to use Canine Connections.
              </p>
            </div>
          </div>
          <div className="s-split__media"><img src={PHOTOS.about} alt="A French Bulldog in a yellow sweater" loading="lazy" /></div>
        </div>
      </section>

      <section className="s-section s-section--tint">
        <div className="s-container">
          <div className="s-grid s-grid--3" style={{ gap: 40 }}>
            <div><h3 className="s-h3">For adopters</h3><p className="s-muted" style={{ margin: 0, lineHeight: 1.7 }}>Search every partner shelter at once, get matched by lifestyle, apply once, and track every application from your dashboard.</p></div>
            <div><h3 className="s-h3">For shelters</h3><p className="s-muted" style={{ margin: 0, lineHeight: 1.7 }}>List dogs, review verified applications, finalise adoptions and publish success stories from a single portal.</p></div>
            <div><h3 className="s-h3">For the dogs</h3><p className="s-muted" style={{ margin: 0, lineHeight: 1.7 }}>More visibility and better matches mean shorter shelter stays and fewer returns.</p></div>
          </div>
        </div>
      </section>

      <section className="s-section">
        <div className="s-container">
          <div className="s-section-head">
            <div>
              <span className="s-eyebrow">The team</span>
              <h2 className="s-h2">Who builds Canine Connections</h2>
              <p className="s-lead">Canine Connections began as a capstone project at NJIT, built by a five-person team.</p>
            </div>
          </div>
          <div className="s-team">
            {TEAM.map(person => (
              <div className="s-team__card" key={person.name}>
                <span className="s-avatar">{person.name.charAt(0)}</span>
                <strong>{person.name}</strong>
                <span>{person.role}</span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 40 }}><Link to="/contact" className="s-link">Get in touch <ArrowRight size={16} /></Link></p>
        </div>
      </section>
    </PublicLayout>
  )
}
