import React, { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"

import BadgeGallery from "../components/BadgeGallery"

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()

  const [user, setUser] = useState("Friend")
  const [featuredDog, setFeaturedDog] = useState(null)
  const [loadingDog, setLoadingDog] = useState(true)
  const [adoptedDogs, setAdoptedDogs] = useState([])
  const [selectedDogId, setSelectedDogId] = useState(null)
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logForm, setLogForm] = useState({ log_type: "general", title: "", notes: "", log_date: new Date().toISOString().split("T")[0] })
  const [savingLog, setSavingLog] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [stats, setStats] = useState({ saved: 0, applications: 0, journalCount: 0 })

  useEffect(() => { loadAll() }, [location])

  async function loadAll() {
    loadUser()
    loadStats()
    await Promise.all([loadFeaturedDog(), loadAdoptions()])
  }

  function loadUser() {
    const firstName = localStorage.getItem("userFirstName")
    const fullName  = localStorage.getItem("userFullName")
    const email     = localStorage.getItem("userEmail")
    if (firstName) { setUser(firstName.split(' ')[0]); return }
    if (fullName)  { setUser(fullName.split(' ')[0]); return }
    if (email)     { setUser(email.split("@")[0]); return }
    setUser("Friend")
  }

  function loadStats() {
    const saved        = JSON.parse(localStorage.getItem("savedDogs")       || "[]")
    const applications = JSON.parse(localStorage.getItem("myApplications")  || "[]")
    const journalEntries = JSON.parse(localStorage.getItem("journal_entries") || "[]")
    setStats({ saved: saved.length, applications: applications.length, journalCount: journalEntries.length })
  }

  async function loadFeaturedDog() {
    setLoadingDog(true)
    try {
      const result = await sendMessage("request.dogs.list", { limit: 1 })
      if (result?.success && result.dogs?.length > 0) setFeaturedDog(result.dogs[0])
    } catch { setFeaturedDog(null) }
    finally  { setLoadingDog(false) }
  }

  async function loadAdoptions() {
    const userId = localStorage.getItem("userId")
    if (!userId) return
    try {
      const result = await sendMessage("request.adoptions.list", { user_id: parseInt(userId) })
      if (result?.success && result.adoptions?.length > 0) {
        setAdoptedDogs(result.adoptions)
        setSelectedDogId(result.adoptions[0].dog_id)
        loadLogs(result.adoptions[0].dog_id)
      }
    } catch { setAdoptedDogs([]) }
  }

  async function loadLogs(dogId) {
    const userId = localStorage.getItem("userId")
    if (!userId || !dogId) return
    setLoadingLogs(true)
    try {
      const result = await sendMessage("request.adoption.log.list", { user_id: parseInt(userId), dog_id: dogId })
      setLogs(result?.success && result.logs ? result.logs : [])
    } catch { setLogs([]) }
    finally  { setLoadingLogs(false) }
  }

  const handleDogSelect = (dogId) => { setSelectedDogId(dogId); loadLogs(dogId) }

  const handleAddLog = async (e) => {
    e.preventDefault()
    if (!logForm.title.trim()) return
    setSavingLog(true)
    const userId = localStorage.getItem("userId")
    try {
      const result = await sendMessage("request.adoption.log.create", {
        user_id: parseInt(userId), dog_id: selectedDogId,
        log_type: logForm.log_type, title: logForm.title,
        notes: logForm.notes, log_date: logForm.log_date,
      })
      if (result?.success) {
        setLogForm({ log_type: "general", title: "", notes: "", log_date: new Date().toISOString().split("T")[0] })
        setShowLogForm(false)
        loadLogs(selectedDogId)
      }
    } catch {} finally { setSavingLog(false) }
  }

  const nextSteps = useMemo(() => [
    { label: "Complete your profile",         icon: "👤", done: !!localStorage.getItem("userProfile"),        path: "/profile"     },
    { label: "Save a dog you like",           icon: "❤️", done: stats.saved > 0,                              path: "/browse-dogs" },
    { label: "Submit your first application", icon: "📋", done: stats.applications > 0,                       path: "/browse-dogs" },
    { label: "Take the compatibility quiz",   icon: "🧩", done: !!localStorage.getItem("quizMatchedDogIds"), path: "/quiz"        },
  ], [stats])

  const logTypeLabel = (type) => {
    switch (type) {
      case "vet":       return { label: "Vet",       color: "#3b82f6", bg: "#eff6ff" }
      case "feeding":   return { label: "Feeding",   color: "#10b981", bg: "#f0fdf4" }
      case "training":  return { label: "Training",  color: "#8b5cf6", bg: "#f5f3ff" }
      case "milestone": return { label: "Milestone", color: "#d97706", bg: "#fffbeb" }
      default:          return { label: "Note",      color: "#6f5848", bg: "#fafaf9" }
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
    catch { return dateStr }
  }

  const featuredPhoto = featuredDog?.photos
    ? (Array.isArray(featuredDog.photos) ? featuredDog.photos[0] : featuredDog.photos.split(",")[0])
    : null

  const selectedDog = adoptedDogs.find((d) => d.dog_id === selectedDogId)

  const quickActions = [
    { label: "Browse Dogs",   icon: "🔍", desc: "Find your match",       path: "/browse-dogs"  },
    { label: "Take the Quiz", icon: "🧩", desc: "Find compatible breeds", path: "/quiz"         },
    { label: "Applications",  icon: "📋", desc: "Track your progress",   path: "/applications" },
    { label: "Shelters",      icon: "🏡", desc: "View partner shelters",  path: "/shelters"     },
  ]

  const doneCount = nextSteps.filter(s => s.done).length

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 60px 0" }}>

        {/* ── Welcome Banner ── */}
        <div style={{
          background: "linear-gradient(135deg, #2f241d 0%, #4a3728 100%)",
          borderRadius: "24px",
          padding: "36px 40px",
          marginBottom: "28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", right: "40px", top: "-20px", fontSize: "140px", opacity: 0.06, userSelect: "none", lineHeight: 1 }}>🐾</div>
          <div style={{ position: "relative" }}>
            <p style={{ margin: "0 0 6px 0", fontSize: "13px", fontWeight: "600", color: "#d97706", letterSpacing: "2px", textTransform: "uppercase" }}>
              Welcome back
            </p>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "38px", fontWeight: "800", color: "white", lineHeight: 1.1 }}>
              {user} 👋
            </h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "15px" }}>
              Your adoption journey is looking bright today.
            </p>
          </div>
          <button
            onClick={() => navigate("/browse-dogs")}
            style={{ padding: "14px 32px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer", flexShrink: 0, boxShadow: "0 4px 16px rgba(217,119,6,0.4)" }}
          >
            Find a Dog →
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
          <StatCard value={stats.saved}        label="Saved Dogs"      icon="❤️"  color="#ef4444" onClick={() => navigate("/my-dogs")}      />
          <StatCard value={stats.applications} label="Applications"    icon="📩"  color="#3b82f6" onClick={() => navigate("/applications")} />
          <StatCard value={adoptedDogs.length} label="Adopted Dogs"    icon="🏡"  color="#10b981" onClick={() => {}}                        />
          <StatCard value={stats.journalCount} label="Journal Entries" icon="📖"  color="#d97706" onClick={() => navigate("/journal")}      />
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
          {quickActions.map(a => (
            <div
              key={a.label}
              onClick={() => navigate(a.path)}
              style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "16px", padding: "20px", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s", display: "flex", alignItems: "center", gap: "14px" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";   e.currentTarget.style.boxShadow = "none" }}
            >
              <div style={{ width: "44px", height: "44px", background: "#fde6cf", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                {a.icon}
              </div>
              <div>
                <div style={{ fontWeight: "700", color: "#2f241d", fontSize: "14px" }}>{a.label}</div>
                <div style={{ fontSize: "12px", color: "#9a8070", marginTop: "2px" }}>{a.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Featured Dog + Progress ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>

          {/* Featured Companion */}
          <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "24px", overflow: "hidden" }}>
            {loadingDog ? (
              <div>
                <div style={{ height: "200px", background: "linear-gradient(90deg, #f5ece4 25%, #fde6cf 50%, #f5ece4 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                <div style={{ padding: "24px" }}>
                  <div style={{ height: "20px", background: "#f5ece4", borderRadius: "8px", width: "50%", marginBottom: "12px" }} />
                  <div style={{ height: "14px", background: "#f5ece4", borderRadius: "8px", width: "80%", marginBottom: "8px" }} />
                  <div style={{ height: "14px", background: "#f5ece4", borderRadius: "8px", width: "60%" }} />
                </div>
              </div>
            ) : featuredDog ? (
              <>
                <div style={{ position: "relative", height: "200px", background: "#fcedda" }}>
                  {featuredPhoto ? (
                    <img src={featuredPhoto} alt={featuredDog.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "72px" }}>🐕</div>
                  )}
                  <div style={{ position: "absolute", top: "12px", left: "12px", background: "#d97706", color: "white", fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Featured
                  </div>
                </div>
                <div style={{ padding: "24px" }}>
                  <h2 style={{ margin: "0 0 4px 0", fontSize: "22px", fontWeight: "800", color: "#2f241d" }}>Meet {featuredDog.name}</h2>
                  <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#d97706", fontWeight: "600" }}>
                    {featuredDog.breed} &bull; {featuredDog.age_years} {featuredDog.age_years == 1 ? "yr" : "yrs"} &bull; {featuredDog.size}
                  </p>
                  <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#6f5848", lineHeight: "1.6" }}>
                    {featuredDog.description || `${featuredDog.name} is looking for a loving forever home.`}
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/dogs/${featuredDog.dog_id}`)}
                    style={{ width: "100%" }}
                  >
                    View Profile
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: "56px", marginBottom: "16px" }}>🐕</div>
                <p style={{ color: "#6f5848", margin: "0 0 16px 0" }}>Browse our available dogs to find your perfect companion.</p>
                <button className="btn btn-primary" onClick={() => navigate("/browse-dogs")}>Browse Dogs</button>
              </div>
            )}
          </div>

          {/* Your Progress */}
          <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "24px", padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#2f241d" }}>Your Progress</h2>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#d97706" }}>{doneCount} / {nextSteps.length}</span>
            </div>
            {/* Progress bar */}
            <div style={{ height: "6px", background: "#fde6cf", borderRadius: "99px", marginBottom: "24px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(doneCount / nextSteps.length) * 100}%`, background: "#d97706", borderRadius: "99px", transition: "width 0.5s ease" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {nextSteps.map(step => (
                <div
                  key={step.label}
                  onClick={() => !step.done && navigate(step.path)}
                  style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", borderRadius: "12px", border: `1px solid ${step.done ? "#bbf7d0" : "#efdfd1"}`, background: step.done ? "#f0fdf4" : "#fffaf5", cursor: step.done ? "default" : "pointer", transition: "transform 0.15s" }}
                  onMouseEnter={e => { if (!step.done) e.currentTarget.style.transform = "translateX(4px)" }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)" }}
                >
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: step.done ? "#dcfce7" : "#fde6cf", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                    {step.done ? "✅" : step.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", color: "#2f241d", fontSize: "14px" }}>{step.label}</div>
                    <div style={{ fontSize: "12px", color: step.done ? "#16a34a" : "#9a8070", marginTop: "2px" }}>
                      {step.done ? "Completed" : "Tap to get started"}
                    </div>
                  </div>
                  {!step.done && <span style={{ color: "#d8c1af", fontSize: "18px" }}>›</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pack Milestones ── */}
        <BadgeGallery />

        {/* ── Post-Adoption Journal ── */}
        {adoptedDogs.length > 0 ? (
          <section style={{ marginTop: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0", color: "#2f241d", fontSize: "20px", fontWeight: "800" }}>Post-Adoption Journal</h2>
                <p style={{ margin: 0, color: "#6f5848", fontSize: "14px" }}>Track vet visits, feeding, training milestones, and more.</p>
              </div>
              <button className="btn btn-primary" onClick={() => navigate("/journal")}>Go to Journal</button>
            </div>

            {adoptedDogs.length > 1 && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                {adoptedDogs.map(dog => (
                  <button
                    key={dog.dog_id}
                    className="btn"
                    style={{ fontSize: "14px", background: selectedDogId === dog.dog_id ? "#d97706" : "white", color: selectedDogId === dog.dog_id ? "white" : "#2f241d", border: "1px solid #d8c1af", borderRadius: "8px" }}
                    onClick={() => handleDogSelect(dog.dog_id)}
                  >
                    {dog.dog_name || `Dog #${dog.dog_id}`}
                  </button>
                ))}
              </div>
            )}

            {loadingLogs ? (
              <div style={{ padding: "20px", color: "#6f5848" }}>Loading logs...</div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", borderRadius: "20px", border: "2px dashed #e5d5c5", background: "white" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📖</div>
                <p style={{ color: "#6f5848", margin: "0 0 16px 0" }}>No journal entries yet.</p>
                <button className="btn btn-primary" onClick={() => navigate("/journal")}>Add First Entry</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {logs.map((log, i) => {
                  const t = logTypeLabel(log.log_type)
                  return (
                    <div key={log.log_id || i} style={{ padding: "20px 24px", borderRadius: "16px", border: "1px solid #efdfd1", background: "white", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", background: t.bg, color: t.color }}>{t.label}</span>
                          <h4 style={{ margin: 0, color: "#2f241d", fontWeight: "600", fontSize: "15px" }}>{log.title}</h4>
                        </div>
                        {log.notes && <p style={{ margin: 0, color: "#6f5848", fontSize: "14px", lineHeight: "1.5" }}>{log.notes}</p>}
                      </div>
                      <span style={{ color: "#9a8070", fontSize: "13px", whiteSpace: "nowrap", flexShrink: 0 }}>{formatDate(log.log_date)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
          <section style={{ marginTop: "28px" }}>
            <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "24px", padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>📖</div>
              <h3 style={{ margin: "0 0 8px 0", color: "#2f241d", fontSize: "20px", fontWeight: "700" }}>Post-Adoption Journal</h3>
              <p style={{ color: "#6f5848", margin: "0 0 24px 0", maxWidth: "400px", marginLeft: "auto", marginRight: "auto", fontSize: "15px", lineHeight: "1.6" }}>
                Once an adoption is finalized, your journal will appear here. Track vet appointments, feeding logs, and training milestones.
              </p>
              <button className="btn btn-primary" onClick={() => navigate("/journal")}>Go to Journal</button>
            </div>
          </section>
        )}

    </div>
  )
}

function StatCard({ value, label, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex="0"
      style={{ cursor: "pointer", background: "white", padding: "20px 24px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "16px", border: "1px solid #efdfd1", boxShadow: "0 2px 8px rgba(47,36,29,0.04)", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)" }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";   e.currentTarget.style.boxShadow = "0 2px 8px rgba(47,36,29,0.04)" }}
    >
      <div style={{ fontSize: "24px", backgroundColor: `${color}18`, color, width: "52px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "14px", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "28px", fontWeight: "800", color: "#2f241d", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "13px", color: "#6f5848", fontWeight: "600", marginTop: "4px" }}>{label}</div>
      </div>
    </div>
  )
}
