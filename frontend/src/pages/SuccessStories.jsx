// Static success stories page — all content is hard-coded in the STORIES array (no backend fetch).
// Shows adoption testimonials as photo cards, a stats bar, and a CTA to /browse-dogs.
import React from "react"
import { useNavigate } from "react-router-dom"
import { Heart, MapPin, PawPrint } from "lucide-react"

// Hard-coded adoption story data — photos are from Unsplash.
const STORIES = [
  {
    id: 1,
    dogName: "Biscuit",
    adopter: "The Martins",
    location: "Montclair, NJ",
    date: "March 2025",
    photo: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80",
    quote: "Biscuit changed our family forever. He was shy at first, but within a week he was running laps around the backyard with the kids.",
    breed: "Golden Retriever Mix",
  },
  {
    id: 2,
    dogName: "Pepper",
    adopter: "Sarah & Luke",
    location: "Brooklyn, NY",
    date: "January 2025",
    photo: "https://images.unsplash.com/photo-1544568100-847a948585b9?w=600&q=80",
    quote: "We found Pepper through Canine Connections and the whole process was so smooth. She's our adventure partner now.",
    breed: "Border Collie",
  },
  {
    id: 3,
    dogName: "Mango",
    adopter: "The Nguyens",
    location: "Philadelphia, PA",
    date: "December 2024",
    photo: "https://images.unsplash.com/photo-1602979677071-1781b7f40023?w=600&q=80",
    quote: "Mango had been in the shelter for 8 months. We couldn't imagine leaving without him. Best decision we ever made.",
    breed: "Labrador Mix",
  },
  {
    id: 4,
    dogName: "Luna",
    adopter: "James T.",
    location: "Hoboken, NJ",
    date: "February 2025",
    photo: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=600&q=80",
    quote: "I was nervous adopting my first dog as a single person. The shelter and platform made it so easy. Luna is my best friend.",
    breed: "Australian Shepherd Mix",
  },
  {
    id: 5,
    dogName: "Duke",
    adopter: "The Robinsons",
    location: "Princeton, NJ",
    date: "April 2025",
    photo: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600&q=80",
    quote: "Duke came from a tough background but you'd never know it. He's the gentlest giant with our two-year-old.",
    breed: "Great Dane Mix",
  },
  {
    id: 6,
    dogName: "Coco",
    adopter: "Emily & Priya",
    location: "Kingston, NY",
    date: "November 2024",
    photo: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&q=80",
    quote: "Coco was listed for 3 months before we found her. She deserved every bit of love we could give. She gives it back tenfold.",
    breed: "Cockapoo",
  },
]

const STATS = [
  { value: "200+", label: "Happy Adoptions" },
  { value: "15+",  label: "Partner Shelters" },
  { value: "100%", label: "Free to Apply" },
  { value: "4.9★", label: "Avg. Rating" },
]

export default function SuccessStories() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 80px 0", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "56px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--brand-soft)", borderRadius: "20px", padding: "6px 16px", marginBottom: "16px" }}>
          <Heart size={14} color="#d97706" fill="#d97706" />
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#8a541b" }}>Happy Tails</span>
        </div>
        <h1 style={{ margin: "0 0 14px 0", fontSize: "36px", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>
          Stories That Warm Your Heart
        </h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "16px", maxWidth: "520px", marginLeft: "auto", marginRight: "auto", lineHeight: "1.6" }}>
          Every adoption is a story worth telling. Here are a few families whose lives were changed by rescue.
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ background: "#2f241d", borderRadius: "20px", padding: "28px 40px", display: "flex", justifyContent: "center", gap: "64px", flexWrap: "wrap", marginBottom: "56px" }}>
        {STATS.map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#d97706", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginTop: "4px", fontWeight: "500" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Story cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px", marginBottom: "56px" }}>
        {STORIES.map(story => (
          <div
            key={story.id}
            style={{ background: "var(--card-bg)", borderRadius: "20px", overflow: "hidden", border: "1px solid var(--border)", display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.09)" }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}
          >
            <div style={{ height: "220px", overflow: "hidden", position: "relative" }}>
              <img src={story.photo} alt={story.dogName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)" }} />
              <div style={{ position: "absolute", bottom: "14px", left: "16px" }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "white", lineHeight: 1 }}>{story.dogName}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>{story.breed}</div>
              </div>
              <div style={{ position: "absolute", top: "12px", right: "12px", background: "#d97706", borderRadius: "20px", padding: "4px 10px", fontSize: "11px", fontWeight: "700", color: "white" }}>
                {story.date}
              </div>
            </div>

            <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ margin: "0 0 16px 0", fontSize: "14px", lineHeight: "1.7", color: "var(--text-muted)", fontStyle: "italic" }}>
                "{story.quote}"
              </p>
              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>{story.adopter}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}><MapPin size={15} className="inline-icon" /> {story.location}</div>
                </div>
                <div style={{ display: "flex", gap: "2px" }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Heart key={i} size={14} color="#d97706" fill="#d97706" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ background: "linear-gradient(135deg, #2f241d 0%, #4a3728 100%)", borderRadius: "24px", padding: "48px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "40px", top: "-30px", fontSize: "160px", opacity: 0.05, userSelect: "none", lineHeight: 1 }}><PawPrint size={58} strokeWidth={1.5} /></div>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "30px", fontWeight: "800", color: "white", position: "relative" }}>
          Write Your Own Story
        </h2>
        <p style={{ margin: "0 0 32px 0", color: "rgba(255,255,255,0.65)", fontSize: "16px", maxWidth: "440px", marginLeft: "auto", marginRight: "auto", position: "relative" }}>
          Hundreds of dogs are waiting for their forever home. Could yours be next?
        </p>
        <button
          onClick={() => navigate("/browse-dogs")}
          style={{ padding: "16px 40px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "800", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 20px rgba(217,119,6,0.4)", position: "relative", transition: "transform 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          Find Your Dog →
        </button>
      </div>
    </div>
  )
}
