import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useToast } from "../context/ToastContext"

const PROFILE_KEY = "userProfile"

const fields = {
  homeType: {
    label: "Home Type",
    icon: "🏠",
    options: ["Apartment", "House without yard", "House with yard", "Farm / Rural"],
  },
  ownership: {
    label: "Do you own or rent?",
    icon: "🔑",
    options: ["Own", "Rent", "Other"],
  },
  experience: {
    label: "Experience with dogs",
    icon: "🐕",
    options: ["First-time owner", "Some experience", "Experienced owner"],
  },
  household: {
    label: "Who's in your household?",
    icon: "👨‍👩‍👧",
    options: ["Living alone", "With a partner", "With family (no young kids)", "With young children"],
  },
  otherPets: {
    label: "Other pets at home",
    icon: "🐱",
    options: ["None", "Cats", "Other dogs", "Both cats and dogs", "Other pets"],
  },
  activityLevel: {
    label: "Your activity level",
    icon: "🏃",
    options: ["Low — mostly indoors", "Moderate — daily walks", "High — runs, hikes, very active"],
  },
  hoursHome: {
    label: "Hours at home per day (on average)",
    icon: "🕐",
    options: ["Less than 4 hours", "4–8 hours", "8–12 hours", "Mostly home all day"],
  },
  allergies: {
    label: "Pet allergies?",
    icon: "🤧",
    options: ["No allergies", "Mild — prefer low-shedding", "Yes — hypoallergenic only"],
  },
}

export default function Profile() {
  const { addToast } = useToast()
  const navigate = useNavigate()

  const displayName  = localStorage.getItem("userFullName") || localStorage.getItem("userFirstName") || "User"
  const displayEmail = localStorage.getItem("userEmail") || ""
  const initials     = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()

  const [bio, setBio]       = useState("")
  const [prefs, setPrefs]   = useState({})
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}")
    setBio(stored.bio || "")
    setPrefs(stored.prefs || {})
  }, [])

  const handleSelect = (fieldKey, value) => {
    setPrefs(prev => ({ ...prev, [fieldKey]: value }))
  }

  const handleSave = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ bio, prefs }))
    addToast("Profile saved!", "success")
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const completedFields = Object.keys(fields).filter(k => prefs[k]).length
  const totalFields     = Object.keys(fields).length
  const bioFilled       = bio.trim().length > 0
  const progress        = Math.round(((completedFields + (bioFilled ? 1 : 0)) / (totalFields + 1)) * 100)

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 0 60px 0" }}>

      {/* Header card */}
      <div style={{ background: "linear-gradient(135deg, #2f241d 0%, #4a3728 100%)", borderRadius: "24px", padding: "36px 40px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "28px", flexWrap: "wrap", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "32px", top: "-16px", fontSize: "120px", opacity: 0.06, userSelect: "none" }}>🐾</div>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "800", color: "white", flexShrink: 0, border: "4px solid rgba(255,255,255,0.15)" }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "800", color: "white" }}>{displayName}</h1>
          {displayEmail && <p style={{ margin: "0 0 12px 0", color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>{displayEmail}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.15)", borderRadius: "99px", overflow: "hidden", maxWidth: "200px" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "#d97706", borderRadius: "99px", transition: "width 0.4s ease" }} />
            </div>
            <span style={{ fontSize: "13px", color: "#d97706", fontWeight: "700" }}>{progress}% complete</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", padding: "28px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <span style={{ fontSize: "20px" }}>✍️</span>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#2f241d" }}>About Me</h2>
        </div>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Tell shelters a bit about yourself — why you want to adopt, your lifestyle, what kind of companion you're looking for..."
          style={{ width: "100%", minHeight: "120px", padding: "14px 16px", borderRadius: "12px", border: "1px solid #d6d3d1", fontSize: "15px", fontFamily: "'Inter', sans-serif", resize: "vertical", boxSizing: "border-box", outline: "none", color: "#2f241d", lineHeight: "1.6" }}
        />
      </div>

      {/* Preference fields */}
      {Object.entries(fields).map(([key, field]) => (
        <div key={key} style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", padding: "24px 28px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ fontSize: "20px" }}>{field.icon}</span>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#2f241d" }}>{field.label}</h2>
            {prefs[key] && <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", background: "#dcfce7", color: "#16a34a" }}>✓ Set</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {field.options.map(option => {
              const selected = prefs[key] === option
              return (
                <button
                  key={option}
                  onClick={() => handleSelect(key, option)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px", border: selected ? "2px solid #d97706" : "1px solid #d6d3d1",
                    background: selected ? "#fff7ed" : "white", color: selected ? "#d97706" : "#6f5848",
                    fontWeight: selected ? "700" : "500", fontSize: "14px", cursor: "pointer",
                    transition: "all 0.15s", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Save button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
        <button
          onClick={handleSave}
          style={{ padding: "14px 36px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 16px rgba(217,119,6,0.3)" }}
        >
          Save Profile
        </button>
      </div>
    </div>
  )
}
