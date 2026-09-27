import React from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ClipboardList, Home, MessageCircle, Puzzle, Search } from "lucide-react"
import PublicLayout from "../../site/PublicLayout"
import PageHero from "../../site/PageHero"
import { useAuthModal } from "../../site/authModal"
import { hasUserSession } from "../../services/auth"

const DETAIL = [
  { icon: Search, title: "1. Find a dog", points: [
    "See every adoptable dog from our partner shelters in one search.",
    "Filter by size, age, breed, and whether a dog is good with children, dogs, cats or apartment living.",
    "Save dogs you like to compare them later.",
  ] },
  { icon: Puzzle, title: "2. Take the match quiz (optional)", points: [
    "Five questions about your home, activity level and household.",
    "We score every available dog against your answers and show the closest matches.",
    "Your answers are saved, so you can retake it any time.",
  ] },
  { icon: ClipboardList, title: "3. Apply online", points: [
    "Create a free account and verify your email and ID once.",
    "Send an application straight to the dog's shelter — no paperwork to print.",
    "Follow its progress from Submitted to In review to Decision in your dashboard.",
  ] },
  { icon: MessageCircle, title: "4. Talk to the shelter", points: [
    "Message the shelter from their page with any questions.",
    "Arrange a meet-and-greet, in person or by video.",
    "You'll get an email whenever your application's status changes.",
  ] },
  { icon: Home, title: "5. Bring your dog home", points: [
    "The shelter finalises the adoption and any adoption fee with you.",
    "Keep a journal of vet visits, training and milestones.",
    "Use our care guides to settle in — and share your story when you're ready.",
  ] },
]

function Content() {
  const { openAuth } = useAuthModal()
  return (
    <>
      <PageHero eyebrow="How it works" title="Adopting through Canine Connections"
        lead="One search across partner shelters, one application, and support from first look to forever home." />
      <section className="s-section">
        <div className="s-container s-container--narrow" style={{ display: "grid", gap: 48 }}>
          {DETAIL.map(step => (
            <div className="s-feature" key={step.title}>
              <span className="s-feature__icon"><step.icon size={22} /></span>
              <div>
                <h2 className="s-h3" style={{ fontSize: 22 }}>{step.title}</h2>
                <ul className="s-prose" style={{ paddingLeft: 18, margin: 0 }}>
                  {step.points.map(p => <li key={p} className="s-muted">{p}</li>)}
                </ul>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/browse-dogs" className="btn btn-primary btn-lg">Browse dogs <ArrowRight size={18} /></Link>
            {!hasUserSession() && <button className="btn btn-secondary btn-lg" onClick={() => openAuth("register")}>Create free account</button>}
          </div>
        </div>
      </section>
    </>
  )
}

export default function HowItWorks() {
  return <PublicLayout><Content /></PublicLayout>
}
