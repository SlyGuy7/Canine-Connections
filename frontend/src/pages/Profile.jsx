// User lifestyle profile — a multi-section preference form (home type, household, activity level,
// allergies, bio) that is saved to localStorage under "userProfile". The Dashboard and BrowseDogs
// pages read these prefs to compute dog match scores. A React Router blocker and beforeunload
// handler both warn the user if they try to leave with unsaved changes.
import React, { useState, useEffect, useRef } from "react"
import { useBlocker } from "react-router-dom"
import { useToast } from "../context/toast"

// localStorage key for persisting the user's bio and preference selections.
const PROFILE_KEY = "userProfile"

// The bio and adoption preferences saved in localStorage.
function readStoredProfile() {
  const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}")
  return { bio: stored.bio || "", prefs: stored.prefs || {} }
}

const sections = [
  {
    title: "Your Home",
    icon: "🏠",
    fields: {
      homeType: {
        label: "Home type",
        options: ["Apartment", "House without yard", "House with yard", "Farm / Rural"],
      },
      ownership: {
        label: "Own or rent?",
        options: ["Own", "Rent", "Other"],
      },
    },
  },
  {
    title: "Your Household",
    icon: "👨‍👩‍👧",
    fields: {
      household: {
        label: "Who lives with you?",
        options: ["Living alone", "With a partner", "With family (no young kids)", "With young children"],
      },
      otherPets: {
        label: "Other pets",
        options: ["None", "Cats", "Other dogs", "Both cats and dogs", "Other pets"],
      },
    },
  },
  {
    title: "Lifestyle",
    icon: "🏃",
    fields: {
      activityLevel: {
        label: "Activity level",
        options: ["Low — mostly indoors", "Moderate — daily walks", "High — runs, hikes, very active"],
      },
      hoursHome: {
        label: "Hours home per day",
        options: ["Less than 4 hours", "4–8 hours", "8–12 hours", "Mostly home all day"],
      },
      experience: {
        label: "Dog experience",
        options: ["First-time owner", "Some experience", "Experienced owner"],
      },
    },
  },
  {
    title: "Health",
    icon: "🤧",
    fields: {
      allergies: {
        label: "Pet allergies",
        options: ["No allergies", "Mild — prefer low-shedding", "Yes — hypoallergenic only"],
      },
    },
  },
]

const allFieldKeys = sections.flatMap(s => Object.keys(s.fields))

export default function Profile() {
  const { addToast } = useToast()

  const displayEmail = localStorage.getItem("userEmail") || ""
  function deriveFromEmail(email) {
    const parts = (email || '').split('@')[0].split('.')
    return {
      first: parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '',
      last:  parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
    }
  }
  const derived      = deriveFromEmail(displayEmail)
  const firstName    = localStorage.getItem("userFirstName") || derived.first
  const lastName     = localStorage.getItem("userLastName")  || derived.last
  const displayName  = `${firstName} ${lastName}`.trim() || displayEmail || "User"
  const initials     = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()

  const phone   = localStorage.getItem("userPhone")   || ""
  const address = localStorage.getItem("userAddress") || ""

  const [initial] = useState(readStoredProfile)
  const [bio, setBio]     = useState(initial.bio)
  const [prefs, setPrefs] = useState(initial.prefs)
  const [focusedField, setFocusedField] = useState(null)
  // Mirror of the last-saved state used to detect unsaved changes without an extra fetch.
  const savedState = useRef(initial)
  const isDirty = () =>
    bio !== savedState.current.bio ||
    JSON.stringify(prefs) !== JSON.stringify(savedState.current.prefs)

  // Intercepts React Router navigations when there are unsaved changes; shows a confirm modal.
  const blocker = useBlocker(isDirty)


  useEffect(() => {
    const handler = e => {
      if (isDirty()) { e.preventDefault(); e.returnValue = "" }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  })

  const handleSelect = (fieldKey, value) => {
    setPrefs(prev => ({ ...prev, [fieldKey]: value }))
  }

  const handleSave = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ bio, prefs }))
    savedState.current = { bio, prefs }
    addToast("Profile saved!", "success")
  }

  // Completion percentage: each preference field counts as 1 slot, the bio counts as 1 extra.
  const completedFields = allFieldKeys.filter(k => prefs[k]).length
  const bioFilled       = bio.trim().length > 0
  const progress        = Math.round(((completedFields + (bioFilled ? 1 : 0)) / (allFieldKeys.length + 1)) * 100)
  const isReady         = progress === 100

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 60px 0", fontFamily: "'Inter', sans-serif" }}>

      {/* Page title */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>My Profile</h1>
        <p style={{ margin: 0, color: "#9c7e6a", fontSize: "15px" }}>Help shelters get to know you before you apply</p>
      </div>

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>

        {/* ── Left panel ── */}
        <div style={{ width: "300px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Identity card */}
          <div style={{ background: "linear-gradient(160deg, #2f241d 0%, #4a3728 100%)", borderRadius: "24px", padding: "32px 28px", position: "relative", overflow: "hidden", textAlign: "center" }}>
            <div style={{ position: "absolute", right: "-10px", bottom: "-20px", fontSize: "110px", opacity: 0.06, userSelect: "none", lineHeight: 1 }}>🐾</div>

            {/* Avatar */}
            <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: "800", color: "white", margin: "0 auto 16px auto", border: "4px solid rgba(255,255,255,0.12)", position: "relative", zIndex: 1 }}>
              {initials}
            </div>

            <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "800", color: "white", position: "relative", zIndex: 1 }}>{displayName}</h2>
            {displayEmail && (
              <p style={{ margin: "0 0 20px 0", color: "rgba(255,255,255,0.45)", fontSize: "13px", position: "relative", zIndex: 1 }}>{displayEmail}</p>
            )}

            {/* Progress bar */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>Profile completion</span>
                <span style={{ fontSize: "13px", color: "#d97706", fontWeight: "700" }}>{progress}%</span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.12)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#d97706", borderRadius: "99px", transition: "width 0.5s ease" }} />
              </div>
            </div>

            {/* Readiness badge / encouragement */}
            {isReady ? (
              <div style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "20px", padding: "6px 14px", position: "relative", zIndex: 1 }}>
                <span style={{ fontSize: "13px" }}>✅</span>
                <span style={{ fontSize: "12px", color: "#4ade80", fontWeight: "700" }}>Ready to apply</span>
              </div>
            ) : (
              <p style={{ marginTop: "14px", fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: "1.5", position: "relative", zIndex: 1 }}>
                Complete your profile to get matched with dogs faster and strengthen your adoption application.
              </p>
            )}
          </div>

          {/* Stats card */}
          <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", padding: "20px 24px" }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.06em" }}>At a glance</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Stat icon="🏠" label="Home" value={prefs.homeType || "—"} />
              <Stat icon="🐕" label="Experience" value={prefs.experience || "—"} />
              <Stat icon="🏃" label="Activity" value={prefs.activityLevel ? prefs.activityLevel.split("—")[0].trim() : "—"} />
              <Stat icon="🐱" label="Other pets" value={prefs.otherPets || "—"} />
            </div>
          </div>

          {/* Contact info */}
          <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", padding: "20px 24px" }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contact info</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Phone</label>
                <div style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5ddd6", fontSize: "14px", fontFamily: "'Inter', sans-serif", color: phone ? "#2f241d" : "#b8a89a", background: "#fdfaf7", boxSizing: "border-box" }}>
                  {phone || "Not provided"}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Home address</label>
                <div style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5ddd6", fontSize: "14px", fontFamily: "'Inter', sans-serif", color: address ? "#2f241d" : "#b8a89a", background: "#fdfaf7", boxSizing: "border-box" }}>
                  {address || "Not provided"}
                </div>
              </div>
            </div>
          </div>

          {/* About me */}
          <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", padding: "20px 24px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.06em" }}>About me</h3>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              onFocus={() => setFocusedField("bio")}
              onBlur={() => setFocusedField(null)}
              placeholder="Tell shelters about yourself — your lifestyle, why you want to adopt, what kind of companion you're looking for..."
              style={{
                width: "100%", minHeight: "130px", padding: "12px 14px", borderRadius: "12px",
                border: focusedField === "bio" ? "1.5px solid #d97706" : "1px solid #e5ddd6",
                fontSize: "14px", fontFamily: "'Inter', sans-serif", resize: "vertical",
                boxSizing: "border-box", outline: "none", color: "#2f241d", lineHeight: "1.65",
                transition: "border-color 0.15s",
              }}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            style={{
              width: "100%", padding: "14px", borderRadius: "14px", border: "none",
              background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px",
              cursor: "pointer", boxShadow: "0 4px 16px rgba(217,119,6,0.28)",
              fontFamily: "'Inter', sans-serif", transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.target.style.opacity = "0.88")}
            onMouseLeave={e => (e.target.style.opacity = "1")}
          >
            Save Profile
          </button>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
          {sections.map(section => (
            <SectionCard
              key={section.title}
              section={section}
              prefs={prefs}
              onSelect={handleSelect}
            />
          ))}
        </div>

      </div>

      {blocker.state === "blocked" && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(47,36,29,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
        <div style={{ background: "white", borderRadius: "20px", padding: "32px", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", fontWeight: "800", color: "#2f241d" }}>Unsaved changes</h3>
          <p style={{ margin: "0 0 24px 0", color: "#78716c", fontSize: "15px" }}>You have unsaved changes on your profile. Leave without saving?</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => blocker.reset()}
              style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #e2d9d0", background: "white", color: "#2f241d", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
            >
              Stay
            </button>
            <button
              onClick={() => blocker.proceed()}
              style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "#ef4444", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}
            >
              Leave without saving
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}

function SectionCard({ section, prefs, onSelect }) {
  const fieldEntries = Object.entries(section.fields)
  const filledCount  = fieldEntries.filter(([k]) => prefs[k]).length

  return (
    <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", overflow: "hidden" }}>
      {/* Section header */}
      <div style={{ padding: "18px 24px 14px 24px", borderBottom: "1px solid #f5ede4", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "20px" }}>{section.icon}</span>
        <span style={{ fontSize: "16px", fontWeight: "700", color: "#2f241d" }}>{section.title}</span>
        <span style={{ marginLeft: "auto", fontSize: "12px", color: filledCount === fieldEntries.length ? "#16a34a" : "#9c7e6a", fontWeight: "600" }}>
          {filledCount}/{fieldEntries.length} set
        </span>
      </div>

      {/* Fields */}
      <div style={{ padding: "16px 24px 20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {fieldEntries.map(([key, field]) => (
          <div key={key}>
            <p style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "600", color: "#6f5848", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {field.label}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {field.options.map(option => {
                const selected = prefs[key] === option
                return (
                  <button
                    key={option}
                    onClick={() => onSelect(key, option)}
                    style={{
                      padding: "8px 16px", borderRadius: "10px",
                      border: selected ? "2px solid #d97706" : "1.5px solid #e5ddd6",
                      background: selected ? "#fff7ed" : "#fdfaf7",
                      color: selected ? "#b45309" : "#6f5848",
                      fontWeight: selected ? "700" : "500",
                      fontSize: "13.5px", cursor: "pointer",
                      transition: "all 0.15s", fontFamily: "'Inter', sans-serif",
                      boxShadow: selected ? "0 2px 8px rgba(217,119,6,0.15)" : "none",
                    }}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "16px", width: "22px", textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "11px", color: "#9c7e6a", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1px" }}>{label}</div>
        <div style={{ fontSize: "13px", color: "#2f241d", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      </div>
    </div>
  )
}
