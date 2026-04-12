import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import { useToast } from "../context/ToastContext"
import Sidebar from "../components/Sidebar"

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
  const hasFetched = useRef(false)
  const navigate = useNavigate()
  const { addToast } = useToast()

  const matchedIds = JSON.parse(localStorage.getItem("quizMatchedDogIds") || "[]")
  const savedAnswers = JSON.parse(localStorage.getItem("quizAnswers") || "{}")
  const answerValues = Object.values(savedAnswers).map(String)

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadMatches();
  }, [])

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

  const handleSaveDog = (dog) => {
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]")
    if (savedDogs.some((d) => d.dog_id === dog.dog_id)) {
      addToast(`${dog.name} is already saved.`, "error")
      return
    }
    savedDogs.push(dog)
    localStorage.setItem("savedDogs", JSON.stringify(savedDogs))
    addToast(`${dog.name} saved!`, "success")
  }

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <header className="content-header"><h1>Your Matches</h1></header>
          <div className="dog-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: "white", padding: "20px", borderRadius: "15px" }}>
                <div style={{ height: "200px", background: "#e0e0e0", borderRadius: "10px" }} />
                <div style={{ marginTop: "20px" }}>
                  <div style={{ height: "20px", width: "60%", background: "#e0e0e0", marginBottom: "10px" }} />
                  <div style={{ height: "16px", width: "40%", background: "#e0e0e0" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <div className="empty-state">
            <h2>{error}</h2>
            <button className="btn btn-primary" onClick={() => navigate("/quiz")}>Take the Quiz</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <header className="content-header" style={{ marginBottom: "30px" }}>
          <h1>Your Matches</h1>
          <p className="dashboard-subtitle">
            Based on your quiz answers, here are the dogs that best fit your lifestyle.
          </p>
        </header>

        {matchedIds.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ background: "white", borderRadius: "20px", padding: "40px", border: "1px solid #efdfd1", textAlign: "center" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>🐾</div>
              <h2 style={{ color: "#2f241d", marginBottom: "12px" }}>No Exact Matches Found</h2>
              <p style={{ color: "#6f5848", fontSize: "16px", maxWidth: "500px", margin: "0 auto 8px" }}>
                We could not find a dog that matches all of your preferences at once. This is usually because some criteria are hard to combine — for example, apartment-friendly dogs rarely require a yard.
              </p>
            </div>

            {answerValues.length > 0 && (
              <div style={{ background: "white", borderRadius: "20px", padding: "32px", border: "1px solid #efdfd1" }}>
                <h3 style={{ color: "#2f241d", marginBottom: "20px" }}>Your Selected Preferences</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                  {answerValues.map((val) => {
                    const trait = TRAIT_LABELS[val]
                    if (!trait) return null
                    return (
                      <div key={val} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: "#fffaf5", border: "1px solid #efdfd1" }}>
                        <span style={{ fontSize: "22px" }}>{trait.icon}</span>
                        <span style={{ color: "#2f241d", fontSize: "14px", fontWeight: "500" }}>{trait.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ background: "#fff7ed", borderRadius: "20px", padding: "28px", border: "1px solid #fed7aa" }}>
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
              <button className="btn" style={{ flex: 1, padding: "16px", background: "white", border: "1px solid #d8c1af", color: "#2f241d" }} onClick={() => navigate("/browse-dogs")}>
                Browse All Dogs
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="dog-grid">
              {dogs.map((dog) => {
                const photos = Array.isArray(dog.photos)
                  ? dog.photos.map((p) => p.photo_url).filter(Boolean)
                  : dog.photos ? dog.photos.split(",").map((p) => p.trim()) : []
                const primaryPhoto = photos[0] || null

                return (
                  <div key={dog.dog_id} className="dog-card" style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1" }}>
                    <div style={{ height: "200px", overflow: "hidden", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {primaryPhoto ? (
                        <img src={primaryPhoto} alt={dog.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => { e.currentTarget.style.display = "none" }} />
                      ) : (
                        <span style={{ fontSize: "64px" }}>🐕</span>
                      )}
                    </div>
                    <div className="dog-card-content" style={{ padding: "20px" }}>
                      <h3 style={{ margin: "0 0 10px 0", color: "#2f241d" }}>{dog.name}</h3>
                      <p style={{ margin: "5px 0", color: "#6f5848" }}><strong>Breed:</strong> {dog.breed}</p>
                      <p style={{ margin: "5px 0", color: "#6f5848" }}><strong>Size:</strong> {dog.size}</p>
                      <p style={{ margin: "5px 0", color: "#6f5848" }}><strong>Age:</strong> {dog.age_years} {dog.age_years == 1 ? "year" : "years"}</p>
                      <p style={{ margin: "5px 0", color: "#6f5848" }}><strong>Energy:</strong> {dog.energy_level}</p>
                      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/dogs/${dog.dog_id}`)}>
                          Details
                        </button>
                        <button className="btn" style={{ flex: 1, background: "white", border: "1px solid #d8c1af", color: "#2f241d" }} onClick={() => handleSaveDog(dog)}>
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: "40px", textAlign: "center" }}>
              <button className="btn" style={{ background: "transparent", border: "1px solid #d8c1af", color: "#6f5848" }} onClick={() => navigate("/quiz")}>
                Retake Quiz
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}