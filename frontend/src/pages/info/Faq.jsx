import React from "react"
import { Link } from "react-router-dom"
import { Plus } from "lucide-react"
import PublicLayout from "../../site/PublicLayout"
import PageHero from "../../site/PageHero"
import { FAQS } from "../../site/content"

export default function Faq() {
  return (
    <PublicLayout>
      <PageHero eyebrow="Help" title="Frequently asked questions"
        lead="Everything you need to know about adopting through Canine Connections." />
      <section className="s-section">
        <div className="s-container s-container--narrow">
          <div className="s-faq">
            {FAQS.map(item => (
              <details key={item.q}>
                <summary>{item.q}<Plus size={20} /></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <p className="s-muted" style={{ marginTop: 40 }}>
            Still have a question? <Link to="/contact" className="s-link">Contact us</Link>
          </p>
        </div>
      </section>
    </PublicLayout>
  )
}
