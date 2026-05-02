import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import AuthModal from "../components/AuthModal"

function CategoryPreviewModal({ category, close, navigate }) {
  if (!category) return null

  const [previewDogs, setPreviewDogs] = React.useState([])
  const [catLoading, setCatLoading] = React.useState(true)

  let title = ""
  let subtitle = ""
  let queryParams = {}

  if (category === "Small Dogs") {
    title = "Little Pups, Big Hearts"
    subtitle = "These bite-sized companions are perfectly sized for any home."
    queryParams = { size: "small", status: "available", limit: 4 }
  } else if (category === "Large Dogs") {
    title = "Gentle Giants"
    subtitle = "Looking for a bigger companion? Meet our large breed dogs."
    queryParams = { size: "large", status: "available", limit: 4 }
  } else if (category === "Puppies") {
    title = "Playful Puppies"
    subtitle = "Young, energetic, and ready to join your family."
    queryParams = { max_age: 1, status: "available", limit: 4 }
  }

  React.useEffect(() => {
    setCatLoading(true)
    sendMessage("request.dogs.list", { ...queryParams, offset: 0 })
      .then(result => {
        if (result?.success && Array.isArray(result.dogs)) {
          setPreviewDogs(result.dogs.map(dog => ({
            ...dog,
            id: dog.dog_id,
            image: dog.photos ? dog.photos.split(",")[0].trim() : "",
          })))
        }
      })
      .catch(() => {})
      .finally(() => setCatLoading(false))
  }, [category])

  return (
    <div
      onClick={close}
      style={{ position: "fixed", inset: 0, background: "rgba(47,36,29,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "860px", background: "#fffaf5", borderRadius: "24px", padding: "40px", position: "relative", boxShadow: "0 24px 70px rgba(0,0,0,0.28)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <button
          onClick={close}
          style={{ position: "absolute", top: "16px", right: "20px", background: "none", border: "none", fontSize: "26px", cursor: "pointer", color: "#6f5848", lineHeight: 1, padding: "4px 8px", borderRadius: "8px" }}
        >
          ×
        </button>
        <h2 style={{ marginTop: 0, color: "#2f241d", fontSize: "28px", fontWeight: "800" }}>{title}</h2>
        <p style={{ color: "#6f5848", marginBottom: "28px", fontSize: "15px" }}>{subtitle}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {previewDogs.length > 0 ? previewDogs.map((dog) => (
            <div key={dog.id} style={{ border: "1px solid #efdfd1", borderRadius: "16px", overflow: "hidden", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              {dog.image ? (
                <img src={dog.image} alt={dog.name} style={{ width: "100%", height: "140px", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "140px", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "44px" }}>🐕</div>
              )}
              <div style={{ padding: "14px" }}>
                <h4 style={{ margin: "0 0 4px 0", color: "#2f241d", fontSize: "16px", fontWeight: "700" }}>{dog.name}</h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#d97706", fontWeight: "600" }}>{dog.breed}</p>
              </div>
            </div>
          )) : (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: "#6f5848" }}>
              catLoading ? "Loading..." : "No dogs found in this category."
            </div>
          )}
        </div>
        <button
          style={{ width: "100%", fontSize: "17px", padding: "16px", background: "#d97706", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer" }}
          onClick={() => { close(); navigate("/browse-dogs") }}
        >
          See All {category}
        </button>
      </div>
    </div>
  )
}

function DogModal({ dog, close, requireAuth }) {
  if (!dog) return null
  return (
    <div
      onClick={close}
      style={{ position: "fixed", inset: 0, background: "rgba(47,36,29,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "520px", background: "white", borderRadius: "24px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", position: "relative" }}
      >
        <button
          onClick={close}
          style={{ position: "absolute", top: "12px", right: "16px", background: "rgba(0,0,0,0.35)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "18px", color: "white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, lineHeight: 1 }}
        >
          ×
        </button>
        {dog.image ? (
          <img src={dog.image} alt={dog.name} style={{ width: "100%", height: "300px", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "300px", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px" }}>🐕</div>
        )}
        <div style={{ padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "28px", color: "#2f241d", margin: "0 0 4px 0", fontWeight: "800" }}>{dog.name}</h2>
              <p style={{ color: "#d97706", fontWeight: "700", margin: 0, fontSize: "16px" }}>{dog.breed}</p>
            </div>
            {(dog.age_years || dog.size) && (
              <div style={{ textAlign: "right" }}>
                {dog.age_years && <p style={{ margin: "0 0 2px 0", fontSize: "13px", color: "#6f5848" }}>{dog.age_years} yr</p>}
                {dog.size && <p style={{ margin: 0, fontSize: "13px", color: "#6f5848" }}>{dog.size}</p>}
              </div>
            )}
          </div>
          <p style={{ margin: "0 0 24px 0", lineHeight: "1.6", color: "#5f4a3c", fontSize: "15px" }}>
            {dog.description || `${dog.name} is a wonderful ${dog.breed} looking for a forever home. They are fully vetted, microchipped, and ready to meet their new family.`}
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={requireAuth}
              style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid #efdfd1", background: "white", cursor: "pointer", fontWeight: "700", fontSize: "15px", color: "#2f241d" }}
            >
              🤍 Save
            </button>
            <button
              onClick={requireAuth}
              style={{ flex: 2, padding: "14px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", cursor: "pointer", fontWeight: "700", fontSize: "15px" }}
            >
              Apply to Adopt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const IconSmallDog = () => (
  <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="26" cy="38" rx="16" ry="13" fill="#fde6cf" stroke="#d97706" strokeWidth="2.5"/>
    <circle cx="26" cy="20" r="10" fill="#fde6cf" stroke="#d97706" strokeWidth="2.5"/>
    <ellipse cx="16" cy="14" rx="5" ry="7" fill="#fde6cf" stroke="#d97706" strokeWidth="2" />
    <ellipse cx="36" cy="14" rx="4" ry="6" fill="#fde6cf" stroke="#d97706" strokeWidth="2" transform="rotate(20 36 14)"/>
    <circle cx="23" cy="20" r="1.5" fill="#d97706"/>
    <circle cx="29" cy="20" r="1.5" fill="#d97706"/>
    <path d="M24 24 Q26 26 28 24" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <line x1="42" y1="36" x2="54" y2="32" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
)

const IconLargeDog = () => (
  <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="28" cy="40" rx="18" ry="14" fill="#fde6cf" stroke="#d97706" strokeWidth="2.5"/>
    <circle cx="28" cy="20" r="12" fill="#fde6cf" stroke="#d97706" strokeWidth="2.5"/>
    <ellipse cx="16" cy="12" rx="4" ry="7" fill="#fde6cf" stroke="#d97706" strokeWidth="2" transform="rotate(-15 16 12)"/>
    <ellipse cx="40" cy="12" rx="4" ry="7" fill="#fde6cf" stroke="#d97706" strokeWidth="2" transform="rotate(15 40 12)"/>
    <circle cx="24" cy="20" r="2" fill="#d97706"/>
    <circle cx="32" cy="20" r="2" fill="#d97706"/>
    <path d="M25 25 Q28 28 31 25" stroke="#d97706" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <line x1="46" y1="38" x2="58" y2="33" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
)

const IconPaw = () => (
  <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="32" cy="42" rx="14" ry="11" fill="#fde6cf" stroke="#d97706" strokeWidth="2.5"/>
    <ellipse cx="32" cy="42" rx="8" ry="6" fill="#d97706" opacity="0.3"/>
    <ellipse cx="14" cy="32" rx="7" ry="9" fill="#fde6cf" stroke="#d97706" strokeWidth="2.5" transform="rotate(-20 14 32)"/>
    <ellipse cx="50" cy="32" rx="7" ry="9" fill="#fde6cf" stroke="#d97706" strokeWidth="2.5" transform="rotate(20 50 32)"/>
    <ellipse cx="22" cy="22" rx="6" ry="8" fill="#fde6cf" stroke="#d97706" strokeWidth="2.5" transform="rotate(-10 22 22)"/>
    <ellipse cx="42" cy="22" rx="6" ry="8" fill="#fde6cf" stroke="#d97706" strokeWidth="2.5" transform="rotate(10 42 22)"/>
  </svg>
)

const IconShelter = () => (
  <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 30 L32 8 L56 30" stroke="#d97706" strokeWidth="2.5" strokeLinejoin="round" fill="#fde6cf"/>
    <rect x="12" y="30" width="40" height="26" rx="2" fill="#fde6cf" stroke="#d97706" strokeWidth="2.5"/>
    <rect x="26" y="40" width="12" height="16" rx="2" fill="#d97706" opacity="0.4" stroke="#d97706" strokeWidth="2"/>
    <rect x="16" y="34" width="8" height="8" rx="1" fill="#d97706" opacity="0.4" stroke="#d97706" strokeWidth="1.5"/>
    <rect x="40" y="34" width="8" height="8" rx="1" fill="#d97706" opacity="0.4" stroke="#d97706" strokeWidth="1.5"/>
  </svg>
)

const SHIMMER = {
  background: "linear-gradient(90deg,#f3e8de 25%,#faf0e8 50%,#f3e8de 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
}

export default function Landing() {
  const navigate = useNavigate()
  const [modalMode, setModalMode] = useState(null)
  const [selectedDog, setSelectedDog] = useState(null)
  const [previewCategory, setPreviewCategory] = useState(null)
  const [dogs, setDogs] = useState([])
  const [dogsLoading, setDogsLoading] = useState(true)

  const isLoggedIn = !!localStorage.getItem("userId")
  const displayName = localStorage.getItem("userFullName") || localStorage.getItem("userFirstName") || "User"
  const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()

  function handleCTA() {
    if (isLoggedIn) navigate("/browse-dogs")
    else setModalMode("register")
  }

  useEffect(() => {
    sendMessage("request.dogs.list", { limit: 200 })
      .then((result) => {
        if (result?.success && Array.isArray(result.dogs) && result.dogs.length > 0) {
          setDogs(result.dogs.map((dog) => ({
            ...dog,
            id: dog.dog_id,
            image: dog.photos ? dog.photos.split(",")[0].trim() : "",
            size: dog.size === "small" ? "Small" : dog.size === "medium" ? "Medium" : (dog.size === "large" || dog.size === "extra_large") ? "Large" : "Medium",
            ageGroup: Number(dog.age_years) <= 1 ? "Puppy" : "Adult",
          })))
        }
      })
      .catch(() => {})
      .finally(() => setDogsLoading(false))
  }, [])

  const featuredDogs = useMemo(() => dogs.slice(0, 6), [dogs])

  function requireAuth() {
    setSelectedDog(null)
    setModalMode("register")
  }

  const categories = [
    { label: "Small Dogs", icon: <IconSmallDog />, key: "Small Dogs" },
    { label: "Large Dogs", icon: <IconLargeDog />, key: "Large Dogs" },
    { label: "Puppies",    icon: <IconPaw />,      key: "Puppies"    },
    { label: "Shelters",   icon: <IconShelter />,  key: "shelters"   },
  ]

  const steps = [
    { number: "01", title: "Browse Dogs", desc: "Search our network of partner shelters to find dogs that match your lifestyle and home." },
    { number: "02", title: "Apply Online", desc: "Submit your adoption application directly through our platform — fast, simple, and free." },
    { number: "03", title: "Meet & Adopt", desc: "Schedule a meet & greet, make a connection, and bring your new best friend home." },
  ]

  return (
    <div className="landing-page" id="home">

      {/* ── Navbar ── */}
      <nav style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 48px", zIndex: 100 }}>
        <div style={{ color: "white", fontSize: "20px", fontWeight: "800", letterSpacing: "-0.3px", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
          🐾 Canine Connections
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {isLoggedIn ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: "40px", padding: "6px 16px 6px 8px", border: "1px solid rgba(255,255,255,0.2)" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "800", color: "white", flexShrink: 0 }}>
                  {initials}
                </div>
                <span style={{ color: "white", fontWeight: "600", fontSize: "14px", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </span>
              </div>
              <button
                onClick={() => navigate("/dashboard")}
                style={{ padding: "9px 20px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Go to Dashboard
              </button>
            </>
          ) : (
            <>
              <button className="login-btn-top" onClick={() => setModalMode("login")}>Login</button>
              <button className="register-btn-top" onClick={() => setModalMode("register")}>Register</button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="hero-banner" style={{ height: "100vh", justifyContent: "center" }}>
        <h1 style={{ fontSize: "62px", margin: "0 0 16px 0", fontWeight: "800", lineHeight: 1.1 }}>Find your New Best Friend</h1>
        <p style={{ fontSize: "20px", margin: "0 0 36px 0", opacity: 0.9, maxWidth: "520px" }}>
          Connect with local shelters and give a rescue dog the forever home they deserve.
        </p>
        <button
          onClick={handleCTA}
          style={{ padding: "16px 40px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "800", fontSize: "17px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", transition: "transform 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          {isLoggedIn ? "Browse Dogs" : "Get Started — It's Free"}
        </button>
      </header>

      {/* ── Stats Strip ── */}
      <div style={{ background: "#2f241d", padding: "28px 20px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "64px", flexWrap: "wrap", maxWidth: "900px", margin: "0 auto" }}>
          {[
            { value: "200+", label: "Dogs Adopted" },
            { value: "15+",  label: "Partner Shelters" },
            { value: "100%", label: "Free to Apply" },
            { value: "5★",   label: "Adoption Support" },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "30px", fontWeight: "800", color: "#d97706", lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "4px", fontWeight: "500" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category Cards ── */}
      <div style={{ background: "#f7efe7", paddingTop: "64px", paddingBottom: "20px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "34px", fontWeight: "800", color: "#2f241d", margin: "0 0 10px 0" }}>Browse by Category</h2>
          <p style={{ color: "#6f5848", fontSize: "16px", margin: 0 }}>Find the perfect match for your home and lifestyle.</p>
        </div>
        <nav className="category-container" style={{ marginTop: 0 }}>
          {categories.map(cat => (
            <div
              key={cat.key}
              className="category-card"
              onClick={() => cat.key === "shelters" ? navigate("/shelters") : setPreviewCategory(cat.key)}
              style={{ minWidth: "160px", padding: "28px 32px" }}
            >
              <div className="category-icon" style={{ fontSize: "unset", marginBottom: "14px" }}>{cat.icon}</div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>{cat.label}</h3>
            </div>
          ))}
        </nav>
      </div>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{ background: "#fff", padding: "80px 20px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2 style={{ fontSize: "34px", fontWeight: "800", color: "#2f241d", margin: "0 0 10px 0" }}>How It Works</h2>
            <p style={{ color: "#6f5848", fontSize: "16px", margin: 0 }}>Three simple steps to finding your forever companion.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "32px" }}>
            {steps.map((step, i) => (
              <div key={i} style={{ background: "#fffaf5", border: "1px solid #efdfd1", borderRadius: "20px", padding: "36px 32px", position: "relative", overflow: "hidden" }}>
                <div style={{ fontSize: "64px", fontWeight: "900", color: "#fde6cf", position: "absolute", top: "12px", right: "20px", lineHeight: 1, userSelect: "none" }}>{step.number}</div>
                <div style={{ width: "48px", height: "48px", background: "#d97706", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
                  <span style={{ color: "white", fontWeight: "800", fontSize: "18px" }}>{parseInt(step.number)}</span>
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#2f241d", margin: "0 0 12px 0" }}>{step.title}</h3>
                <p style={{ color: "#6f5848", fontSize: "15px", lineHeight: "1.6", margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Adopt? ── */}
      <section style={{ background: "#f7efe7", padding: "80px 20px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2 style={{ fontSize: "34px", fontWeight: "800", color: "#2f241d", margin: "0 0 10px 0" }}>Why Adopt?</h2>
            <p style={{ color: "#6f5848", fontSize: "16px", margin: 0 }}>Adopting a rescue dog changes both of your lives.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
            {[
              { icon: "❤️", title: "Save a Life", desc: "Rescue dogs are waiting for a second chance. Your adoption directly saves a life and frees shelter space for another dog in need." },
              { icon: "💰", title: "Free to Apply", desc: "Our platform charges nothing. Submit your application, connect with shelters, and find your match at zero cost." },
              { icon: "✅", title: "Vet Checked", desc: "Every dog in our network is health-checked, vaccinated, and microchipped before adoption, giving you peace of mind." },
              { icon: "🤝", title: "Ongoing Support", desc: "Our adoption support team is here before, during, and after your adoption to help you and your new dog settle in." },
            ].map(item => (
              <div key={item.title} style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", padding: "32px 28px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>{item.icon}</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#2f241d", margin: "0 0 10px 0" }}>{item.title}</h3>
                <p style={{ color: "#6f5848", fontSize: "14px", lineHeight: "1.7", margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ background: "#fff", padding: "80px 20px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2 style={{ fontSize: "34px", fontWeight: "800", color: "#2f241d", margin: "0 0 10px 0" }}>Happy Families</h2>
            <p style={{ color: "#6f5848", fontSize: "16px", margin: 0 }}>Real stories from families who found their perfect match.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            {[
              { name: "Sarah M.", dog: "Adopted Biscuit", quote: "We found Biscuit on Canine Connections and the process was so smooth. He's now the heart of our home — we can't imagine life without him.", avatar: "S" },
              { name: "James & Priya T.", dog: "Adopted Luna", quote: "Luna was shy at first but she's blossomed into the most loving dog. The meet & greet feature made us feel confident before committing.", avatar: "J" },
              { name: "Chris D.", dog: "Adopted Rufus", quote: "I was nervous about adopting for the first time. The team walked me through everything. Rufus and I have been inseparable for 8 months now.", avatar: "C" },
            ].map(t => (
              <div key={t.name} style={{ background: "#fffaf5", border: "1px solid #efdfd1", borderRadius: "20px", padding: "32px 28px" }}>
                <div style={{ fontSize: "32px", color: "#d97706", marginBottom: "16px", lineHeight: 1 }}>"</div>
                <p style={{ color: "#5f4a3c", fontSize: "15px", lineHeight: "1.7", margin: "0 0 24px 0", fontStyle: "italic" }}>{t.quote}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "44px", height: "44px", background: "#d97706", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "700", fontSize: "18px", flexShrink: 0 }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: "700", color: "#2f241d", fontSize: "15px" }}>{t.name}</div>
                    <div style={{ color: "#d97706", fontSize: "13px", fontWeight: "600" }}>{t.dog}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ background: "#d97706", padding: "72px 20px", textAlign: "center" }}>
        <h2 style={{ fontSize: "38px", fontWeight: "800", color: "white", margin: "0 0 12px 0" }}>
          {isLoggedIn ? `Welcome back, ${displayName.split(" ")[0]}!` : "Ready to Meet Your Match?"}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "17px", margin: "0 0 36px 0" }}>
          {isLoggedIn ? "Pick up where you left off — your perfect match is waiting." : "Create a free account and start browsing hundreds of dogs looking for their forever home."}
        </p>
        <button
          onClick={handleCTA}
          style={{ padding: "18px 48px", borderRadius: "12px", border: "none", background: "white", color: "#d97706", fontWeight: "800", fontSize: "18px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", transition: "transform 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          {isLoggedIn ? "Browse Dogs" : "Get Started — It's Free"}
        </button>
      </section>

      {/* ── Featured Dogs ── */}
      <section style={{ background: "#f7efe7", padding: "80px 20px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "34px", fontWeight: "800", color: "#2f241d", margin: "0 0 10px 0" }}>Dogs Available for Adoption</h2>
            <p style={{ color: "#6f5848", fontSize: "16px", margin: 0 }}>Every dog deserves a loving home. Could yours be next?</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
            {dogsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: "white", borderRadius: "16px", overflow: "hidden", border: "1px solid #efdfd1" }}>
                  <div style={{ height: "200px", ...SHIMMER }} />
                  <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ height: "16px", borderRadius: "8px", width: "60%", ...SHIMMER }} />
                    <div style={{ height: "12px", borderRadius: "8px", width: "40%", ...SHIMMER }} />
                    <div style={{ height: "12px", borderRadius: "8px", width: "55%", ...SHIMMER }} />
                  </div>
                </div>
              ))
            ) : featuredDogs.length > 0 ? (
              featuredDogs.map(dog => (
                <div
                  key={dog.id}
                  onClick={() => setSelectedDog(dog)}
                  style={{ background: "white", borderRadius: "16px", overflow: "hidden", border: "1px solid #efdfd1", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.1)" }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  {dog.image ? (
                    <img src={dog.image} alt={dog.name} style={{ width: "100%", height: "200px", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none" }} />
                  ) : (
                    <div style={{ height: "200px", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "56px" }}>🐕</div>
                  )}
                  <div style={{ padding: "16px" }}>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: "700", color: "#2f241d" }}>{dog.name}</h3>
                    <p style={{ margin: "0 0 2px 0", fontSize: "13px", color: "#d97706", fontWeight: "600" }}>{dog.breed}</p>
                    {(dog.age_years || dog.size) && (
                      <p style={{ margin: 0, fontSize: "12px", color: "#a8a29e" }}>
                        {[dog.age_years && `${dog.age_years} yr`, dog.size, dog.gender].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : null}

            {/* See More Card */}
            <div
              onClick={handleCTA}
              style={{ background: "#2f241d", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", cursor: "pointer", textAlign: "center", minHeight: "280px", transition: "transform 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🐾</div>
              <h3 style={{ color: "white", fontWeight: "700", fontSize: "18px", margin: "0 0 8px 0" }}>See All Dogs</h3>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", margin: "0 0 20px 0" }}>Browse our full network of available dogs</p>
              <div style={{ background: "#d97706", color: "white", padding: "10px 24px", borderRadius: "10px", fontWeight: "700", fontSize: "14px" }}>
                {isLoggedIn ? "Browse Now →" : "Get Started →"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#1a120c", padding: "48px 20px 32px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "32px", marginBottom: "40px" }}>
            <div style={{ maxWidth: "280px" }}>
              <div style={{ color: "white", fontSize: "20px", fontWeight: "800", marginBottom: "12px" }}>🐾 Canine Connections</div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>
                Connecting rescue dogs with loving families across Canada. Every adoption changes two lives.
              </p>
            </div>
            <div style={{ display: "flex", gap: "60px", flexWrap: "wrap" }}>
              {[
                { heading: "Adopt", links: ["Browse Dogs", "Shelters", "How It Works"] },
                { heading: "Account", links: ["Login", "Register", "Forgot Password"] },
              ].map(col => (
                <div key={col.heading}>
                  <h4 style={{ color: "white", fontWeight: "700", fontSize: "14px", margin: "0 0 16px 0" }}>{col.heading}</h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                    {col.links.map(link => (
                      <li key={link}>
                        <span
                          style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", cursor: "pointer" }}
                          onClick={() => {
                            if (link === "Login") setModalMode("login")
                            else if (link === "Register") setModalMode("register")
                            else if (link === "Browse Dogs") handleCTA()
                            else if (link === "Shelters") navigate("/shelters")
                            else if (link === "How It Works") document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth" })
                            else if (link === "Forgot Password") setModalMode("forgot-password")
                          }}
                        >{link}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", margin: 0 }}>© 2026 Canine Connections. All rights reserved.</p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", margin: 0 }}>Made with ❤️ for rescue dogs everywhere.</p>
          </div>
        </div>
      </footer>

      {/* ── Modals ── */}
      {previewCategory && (
        <CategoryPreviewModal category={previewCategory} close={() => setPreviewCategory(null)} navigate={navigate} />
      )}
      {selectedDog && (
        <DogModal dog={selectedDog} close={() => setSelectedDog(null)} requireAuth={requireAuth} />
      )}
      {modalMode && (
        <AuthModal mode={modalMode} close={() => setModalMode(null)} switchMode={setModalMode} />
      )}
    </div>
  )
}
