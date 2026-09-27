import React, { useState } from "react"
import { Link } from "react-router-dom"
import { Building2, Mail, MessageCircle } from "lucide-react"
import PublicLayout from "../../site/PublicLayout"
import PageHero from "../../site/PageHero"

const CONTACT_EMAIL = "hello@canineconnections.org"

// The form opens the visitor's email app with the message filled in (there is no contact backend).
export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", topic: "Adopting a dog", message: "" })
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  function send(e) {
    e.preventDefault()
    const subject = `${form.topic} — ${form.name}`
    const body = `${form.message}\n\n${form.name}\n${form.email}`
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <PublicLayout>
      <PageHero eyebrow="Contact" title="Get in touch" lead="Questions about adopting, partnering as a shelter, or the site itself — we read every message." />
      <section className="s-section">
        <div className="s-container s-split" style={{ alignItems: "start" }}>
          <form onSubmit={send} className="s-search" style={{ marginTop: 0, display: "grid", gap: 16 }}>
            <div className="s-grid s-grid--2" style={{ gap: 16 }}>
              <div className="s-field"><label htmlFor="c-name">Your name</label><input id="c-name" className="s-input" required value={form.name} onChange={set("name")} /></div>
              <div className="s-field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" className="s-input" required value={form.email} onChange={set("email")} /></div>
            </div>
            <div className="s-field">
              <label htmlFor="c-topic">Topic</label>
              <select id="c-topic" className="s-select" value={form.topic} onChange={set("topic")}>
                <option>Adopting a dog</option>
                <option>An application I submitted</option>
                <option>Listing my shelter</option>
                <option>Reporting a problem</option>
                <option>Something else</option>
              </select>
            </div>
            <div className="s-field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" className="s-textarea" rows={6} required value={form.message} onChange={set("message")} /></div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ justifySelf: "start" }}>Send message</button>
            <p className="s-muted" style={{ margin: 0, fontSize: 13 }}>This opens your email app with the message ready to send to {CONTACT_EMAIL}.</p>
          </form>

          <div style={{ display: "grid", gap: 28 }}>
            <div className="s-feature"><span className="s-feature__icon"><Mail size={22} /></span><div><h3 className="s-h3">Email</h3><p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></div></div>
            <div className="s-feature"><span className="s-feature__icon"><MessageCircle size={22} /></span><div><h3 className="s-h3">Questions about a dog?</h3><p>The fastest answer comes from the dog's shelter. Open the dog's profile or <Link to="/shelters">find the shelter</Link> and send them a message.</p></div></div>
            <div className="s-feature"><span className="s-feature__icon"><Building2 size={22} /></span><div><h3 className="s-h3">Shelters and rescues</h3><p>Want to list your dogs? Tell us about your organisation and we'll set up a shelter portal account.</p></div></div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
