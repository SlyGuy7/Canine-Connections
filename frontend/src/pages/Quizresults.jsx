// Quiz results page — reads the matched dog IDs saved by Quiz.jsx in localStorage, fetches each
// dog individually via request.dogs.get in parallel, and renders the results as a card grid.
// If no IDs were matched, it shows the user's selected preferences and offers suggestions for
// broadening their criteria. Dogs can be saved/unsaved directly from this page.
import React, { useState, useEffect, useRef, useEffectEvent } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import { useToast } from "../context/toast"

// Maps quiz answer option IDs to human-readable labels and icons for the "no matches" preferences display.
const TRAIT_LABELS = {
  "1":  { label: "Very active lifestyle",          icon: "🏃" },
  "2":  { label: "Moderately active lifestyle",    icon: "🚶" },
  "3":  { label: "Low key lifestyle",              icon: "🛋️" },
  "4":  { label: "Small dog (under 25 lbs)",       icon: "🐩" },
  "5":  { label: "Medium dog (25–60 lbs)",         icon: "🐕" },
  "6":  { label: "Large dog (60–90 lbs)",          icon: "🦮" },
  "7":  { label: "Extra large dog (90+ lbs)",      icon: "🐘" },
  "8":  { label: "Good with children",             icon: "👶" },
  "9":  { label: "No children at home",            icon: "🏠" },
  "10": { label: "Apartment/condo friendly",       icon: "🏢" },
  "11": { label: "House with space",               icon: "🏡" },
  "12": { label: "Good with other dogs",           icon: "🐶" },
  "13": { label: "Only dog in home",               icon: "🐾" },
  "14": { label: "Good with cats",                 icon: "🐱" },
  "15": { label: "No cats in home",                icon: "🚫" },
  "16": { label: "Has a yard",                     icon: "🌿" },
  "17": { label: "No yard available",              icon: "🏙️" },
  "18": { label: "Advanced training dedication",   icon: "🎓" },
  "19": { label: "Basic training dedication",      icon: "📚" },
  "20": { label: "Prefers already trained dog",    icon: "✅" },
  "21": { label: "Vaccinated & spayed/neutered",   icon: "💉" },
  "22": { label: "No vaccination preference",      icon: "🤷" },
  "23": { label: "Prefers male dog",               icon: "♂️" },
  "24": { label: "Prefers female dog",             icon: "♀️" },
  "25": { label: "No gender preference",           icon: "⚖️" },
}

export default function QuizResults() {
  const [dogs, setDogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savedIds, setSavedIds] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("savedDogs") || "[]")
    return new Set(stored.map(d => d.dog_id))
  })
  const hasFetched = useRef(false)
  const navigate = useNavigate()
  const { addToast } = useToast()

  const matchedIds = JSON.parse(localStorage.getItem("quizMatchedDogIds") || "[]")
  const savedAnswers = JSON.parse(localStorage.getItem("quizAnswers") || "{}")
  const answerValues = Object.values(savedAnswers).map(String)

  async function loadMatches() {
    setLoading(true)
    setError("")

    if (matchedIds.length === 0) {
      setLoading(false)
      return
    }

    try {
      const dogResults = await Promise.all(
        matchedIds.map((dogId) =>
          sendMessage("request.dogs.get", { dog_id: dogId })
        )
      )
      const loaded = dogResults.filter((r) => r?.success && r.dog).map((r) => r.dog)
      setDogs(loaded)
    } catch (err) {
      setError("Network error. Could not load your matches.")
    } finally {
      setLoading(false)
    }
  }

  // Effect event: always calls the latest version without re-running the effect.
  const onMountLoad = useEffectEvent(() => loadMatches());
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    onMountLoad();
  }, [])

  // Optimistic save/unsave: updates localStorage and the heart icon immediately, then fires
  // the backend call in the background so the change persists across devices.
  const handleToggleSave = (dog) => {
    const userId = parseInt(localStorage.getItem("userId") || "0")
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]")
    const isSaved = savedIds.has(dog.dog_id)
    let updated
    if (isSaved) {
      updated = savedDogs.filter(d => d.dog_id !== dog.dog_id)
      addToast(`${dog.name} removed from saved dogs.`, "success")
      if (userId) sendMessage("request.saved_dogs.remove", { user_id: userId, dog_id: dog.dog_id }).catch(() => {})
    } else {
      updated = [...savedDogs, dog]
      addToast(`${dog.name} saved!`, "success")
      if (userId) sendMessage("request.saved_dogs.add", { user_id: userId, dog_id: dog.dog_id }).catch(() => {})
    }
    localStorage.setItem("savedDogs", JSON.stringify(updated))
    setSavedIds(new Set(updated.map(d => d.dog_id)))
  }

  const WRAPPER = { maxWidth: "900px", margin: "0 auto", padding: "0 0 60px 0" }

  if (loading) {
    return (
      <div style={WRAPPER}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>Your Matches</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px", marginTop: "28px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: "var(--card-bg)", borderRadius: "20px", overflow: "hidden", border: "1px solid var(--border)" }}>
              <div style={{ height: "220px", background: "linear-gradient(90deg,#f3e8de 25%,#faf0e8 50%,#f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ height: "18px", width: "55%", borderRadius: "8px", background: "linear-gradient(90deg,#f3e8de 25%,#faf0e8 50%,#f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                <div style={{ height: "14px", width: "75%", borderRadius: "8px", background: "linear-gradient(90deg,#f3e8de 25%,#faf0e8 50%,#f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...WRAPPER, textAlign: "center", paddingTop: "80px" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🐾</div>
        <h2 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>{error}</h2>
        <button onClick={() => navigate("/quiz")} style={{ marginTop: "20px", padding: "12px 28px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer" }}>
          Take the Quiz
        </button>
      </div>
    )
  }

  return (
    <div style={WRAPPER}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>Your Matches</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "15px" }}>
          Based on your quiz answers, here are the dogs that best fit your lifestyle.
        </p>
      </div>

        {matchedIds.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ background: "var(--card-bg)", borderRadius: "20px", padding: "40px", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>🐾</div>
              <h2 style={{ color: "var(--text-primary)", marginBottom: "12px" }}>No Exact Matches Found</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "16px", maxWidth: "500px", margin: "0 auto 8px" }}>
                We could not find a dog that matches all of your preferences at once. This is usually because some criteria are hard to combine — for example, apartment-friendly dogs rarely require a yard.
              </p>
            </div>

            {answerValues.length > 0 && (
              <div style={{ background: "var(--card-bg)", borderRadius: "20px", padding: "32px", border: "1px solid var(--border)" }}>
                <h3 style={{ color: "var(--text-primary)", marginBottom: "20px" }}>Your Selected Preferences</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                  {answerValues.map((val) => {
                    const trait = TRAIT_LABELS[val]
                    if (!trait) return null
                    return (
                      <div key={val} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                        <span style={{ fontSize: "22px" }}>{trait.icon}</span>
                        <span style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: "500" }}>{trait.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ background: "var(--brand-soft)", borderRadius: "20px", padding: "28px", border: "1px solid #fed7aa" }}>
              <h3 style={{ color: "#92400e", marginBottom: "12px" }}>What you can do</h3>
              <ul style={{ color: "#78350f", fontSize: "15px", lineHeight: "2", paddingLeft: "20px", margin: 0 }}>
                <li>Retake the quiz with more flexible preferences</li>
                <li>Browse all available dogs and filter manually</li>
                <li>Try removing conflicting criteria (e.g. apartment-friendly + requires yard)</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: "16px" }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: "16px" }} onClick={() => navigate("/quiz")}>
                Retake Quiz
              </button>
              <button className="btn" style={{ flex: 1, padding: "16px", background: "var(--card-bg)", border: "1px solid #d8c1af", color: "var(--text-primary)" }} onClick={() => navigate("/browse-dogs")}>
                Browse All Dogs
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
              {dogs.map((dog) => {
                const photos = Array.isArray(dog.photos)
                  ? dog.photos.map((p) => p.photo_url).filter(Boolean)
                  : dog.photos ? dog.photos.split(",").map((p) => p.trim()) : []
                const primaryPhoto = photos[0] || null
                return (
                  <div key={dog.dog_id} style={{ background: "var(--card-bg)", borderRadius: "20px", overflow: "hidden", border: "1px solid var(--border)", display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.10)" }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}>
                    <div style={{ height: "220px", background: "var(--brand-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {primaryPhoto
                        ? <img src={primaryPhoto} alt={dog.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none" }} />
                        : <span style={{ fontSize: "64px" }}>🐕</span>}
                    </div>
                    <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>{dog.name}</h3>
                      <p style={{ margin: "0 0 2px 0", fontSize: "14px", color: "var(--text-muted)" }}>{dog.breed}</p>
                      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--text-subtle)" }}>{dog.age_years} yr · {dog.size} · {dog.energy_level}</p>
                      <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                        <button onClick={() => navigate(`/dogs/${dog.dog_id}`)} style={{ flex: 2, padding: "11px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
                          View Profile
                        </button>
                        <button
                          onClick={() => handleToggleSave(dog)}
                          title={savedIds.has(dog.dog_id) ? "Remove from saved" : "Save dog"}
                          style={{ flex: 1, padding: "11px", borderRadius: "10px", border: savedIds.has(dog.dog_id) ? "1px solid #fca5a5" : "1px solid #e2d9d0", background: savedIds.has(dog.dog_id) ? "var(--danger-soft)" : "white", color: savedIds.has(dog.dog_id) ? "#e11d48" : "#a8a29e", fontSize: "18px", cursor: "pointer", transition: "all 0.15s ease" }}
                        >
                          {savedIds.has(dog.dog_id) ? "♥" : "♡"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: "32px", textAlign: "center" }}>
              <button onClick={() => navigate("/quiz")} style={{ padding: "12px 28px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>
                Retake Quiz
              </button>
            </div>
          </>
        )}
    </div>
  )
}