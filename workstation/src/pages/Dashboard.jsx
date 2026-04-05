import React, { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import Sidebar from "../components/Sidebar"

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
  const [stats, setStats] = useState({ saved: 0, applications: 0 })

  useEffect(() => {
    loadAll()
  }, [location])

  async function loadAll() {
    loadUser()
    loadStats()
    await Promise.all([loadFeaturedDog(), loadAdoptions()])
  }

  function loadUser() {
    const firstName = localStorage.getItem("userFirstName")
    const fullName = localStorage.getItem("userFullName")
    const email = localStorage.getItem("userEmail")
    if (firstName) { setUser(firstName); return }
    if (fullName) { setUser(fullName); return }
    if (email) { setUser(email.split("@")[0]); return }
    setUser("Friend")
  }

  function loadStats() {
    const saved = JSON.parse(localStorage.getItem("savedDogs") || "[]")
    const applications = JSON.parse(localStorage.getItem("myApplications") || "[]")
    setStats({ saved: saved.length, applications: applications.length })
  }

  async function loadFeaturedDog() {
    setLoadingDog(true)
    try {
      const result = await sendMessage("request.dogs.list", {})
      if (result?.success && result.dogs?.length > 0) {
        setFeaturedDog(result.dogs[Math.floor(Math.random() * result.dogs.length)])
      }
    } catch (err) {
      setFeaturedDog(null)
    } finally {
      setLoadingDog(false)
    }
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
    } catch (err) {
      setAdoptedDogs([])
    }
  }

  async function loadLogs(dogId) {
    const userId = localStorage.getItem("userId")
    if (!userId || !dogId) return
    setLoadingLogs(true)
    try {
      const result = await sendMessage("request.adoption.log.list", { user_id: parseInt(userId), dog_id: dogId })
      setLogs(result?.success && result.logs ? result.logs : [])
    } catch (err) {
      setLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleDogSelect = (dogId) => {
    setSelectedDogId(dogId)
    loadLogs(dogId)
  }

  const handleLogChange = (e) => {
    setLogForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAddLog = async (e) => {
    e.preventDefault()
    if (!logForm.title.trim()) return
    setSavingLog(true)
    const userId = localStorage.getItem("userId")
    try {
      const result = await sendMessage("request.adoption.log.create", {
        user_id:  parseInt(userId),
        dog_id:   selectedDogId,
        log_type: logForm.log_type,
        title:    logForm.title,
        notes:    logForm.notes,
        log_date: logForm.log_date,
      })
      if (result?.success) {
        setLogForm({ log_type: "general", title: "", notes: "", log_date: new Date().toISOString().split("T")[0] })
        setShowLogForm(false)
        loadLogs(selectedDogId)
      }
    } catch (err) {
    } finally {
      setSavingLog(false)
    }
  }

  const nextSteps = useMemo(() => [
    { label: "Complete your profile",        done: !!localStorage.getItem("userEmail"),          path: "/settings" },
    { label: "Save a dog you like",          done: stats.saved > 0,                              path: "/browse-dogs" },
    { label: "Submit your first application",done: stats.applications > 0,                       path: "/browse-dogs" },
    { label: "Take the compatibility quiz",  done: !!localStorage.getItem("quizMatchedDogIds"),  path: "/quiz" },
  ], [stats])

  const logTypeBadge = (type) => {
    switch (type) {
      case "vet":       return "review"
      case "feeding":   return "approved"
      case "training":  return "pending"
      case "milestone": return "approved"
      default:          return "pending"
    }
  }

  const logTypeLabel = (type) => {
    switch (type) {
      case "vet":       return "Vet"
      case "feeding":   return "Feeding"
      case "training":  return "Training"
      case "milestone": return "Milestone"
      default:          return "Note"
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

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">

        <div className="dashboard-search-card">
          <div className="content-header">
            <div>
              <h1>Welcome back, {user}</h1>
              <p className="dashboard-subtitle">Your adoption journey is looking bright today.</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate("/browse-dogs")}>
              Find a Dog
            </button>
          </div>
        </div>

        <section className="stats-grid">
          <StatCard value={stats.saved}        label="Saved Dogs"      onClick={() => navigate("/my-dogs")} />
          <StatCard value={stats.applications} label="Applications"    onClick={() => navigate("/applications")} />
          <StatCard value={adoptedDogs.length} label="Adopted Dogs"    onClick={() => {}} />
          <StatCard value={logs.length}        label="Journal Entries" onClick={() => {}} />
        </section>

        <section className="dashboard-main-grid">

          <div className="dashboard-panel highlight-panel">
            <div className="panel-header">
              <h2>{loadingDog ? "Featured Companion" : featuredDog ? `Meet ${featuredDog.name}` : "Featured Companion"}</h2>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                {loadingDog ? (
                  <>
                    <div style={{ height: "16px", width: "80%", background: "#e0e0e0", borderRadius: "6px", marginBottom: "10px" }} />
                    <div style={{ height: "16px", width: "60%", background: "#e0e0e0", borderRadius: "6px", marginBottom: "20px" }} />
                  </>
                ) : featuredDog ? (
                  <>
                    <p className="activity-subtext" style={{ marginBottom: "8px" }}>
                      <strong>{featuredDog.breed}</strong> &bull; {featuredDog.age_years} {featuredDog.age_years == 1 ? "yr" : "yrs"} &bull; {featuredDog.size}
                    </p>
                    <p className="activity-subtext" style={{ marginBottom: "18px" }}>
                      {featuredDog.description || `${featuredDog.name} is looking for a loving home.`}
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate(`/dogs/${featuredDog.dog_id}`)}>
                      View Profile
                    </button>
                  </>
                ) : (
                  <p className="activity-subtext">Browse our available dogs to find your perfect companion.</p>
                )}
              </div>
              <div style={{ width: "160px", height: "160px", borderRadius: "50%", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {featuredPhoto ? (
                  <img src={featuredPhoto} alt={featuredDog?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "14px", color: "#6f5848", textAlign: "center", padding: "0 12px" }}>No photo</span>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-header">
              <h2>Your Progress</h2>
            </div>
            <div className="activity-list">
              {nextSteps.map((step) => (
                <div key={step.label} className="activity-item" style={{ cursor: "pointer" }} onClick={() => !step.done && navigate(step.path)}>
                  <div>
                    <p className="activity-title">{step.label}</p>
                    <p className="activity-subtext">{step.done ? "Completed" : "Tap to get started"}</p>
                  </div>
                  <span className={`status-badge ${step.done ? "approved" : "pending"}`}>
                    {step.done ? "Done" : "To Do"}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </section>

        {adoptedDogs.length > 0 && (
          <section style={{ marginTop: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0", color: "var(--text-main)" }}>Post-Adoption Journal</h2>
                <p className="page-subtitle" style={{ margin: 0 }}>Track vet visits, feeding, training milestones, and more.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowLogForm((v) => !v)}>
                {showLogForm ? "Cancel" : "Add Entry"}
              </button>
            </div>

            {adoptedDogs.length > 1 && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                {adoptedDogs.map((dog) => (
                  <button
                    key={dog.dog_id}
                    className="btn"
                    style={{ fontSize: "14px", background: selectedDogId === dog.dog_id ? "var(--brand)" : "white", color: selectedDogId === dog.dog_id ? "white" : "var(--text-main)", border: "1px solid #d8c1af" }}
                    onClick={() => handleDogSelect(dog.dog_id)}
                  >
                    {dog.dog_name || `Dog #${dog.dog_id}`}
                  </button>
                ))}
              </div>
            )}

            {showLogForm && (
              <div className="settings-card" style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 20px 0", color: "var(--text-main)" }}>
                  New Journal Entry {selectedDog ? `for ${selectedDog.dog_name}` : ""}
                </h3>
                <form onSubmit={handleAddLog} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="form-row">
                    <div className="flex-1">
                      <label className="form-label">Entry Type</label>
                      <select name="log_type" value={logForm.log_type} onChange={handleLogChange} className="form-input">
                        <option value="general">General Note</option>
                        <option value="vet">Vet Appointment</option>
                        <option value="feeding">Feeding Log</option>
                        <option value="training">Training Session</option>
                        <option value="milestone">Milestone</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="form-label">Date</label>
                      <input type="date" name="log_date" value={logForm.log_date} onChange={handleLogChange} className="form-input" />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Title</label>
                    <input required name="title" value={logForm.title} onChange={handleLogChange} className="form-input" placeholder="e.g. First vet checkup, Learned sit command" />
                  </div>
                  <div>
                    <label className="form-label">Notes <span style={{ color: "var(--text-muted)", fontWeight: "400" }}>(optional)</span></label>
                    <textarea name="notes" value={logForm.notes} onChange={handleLogChange} className="form-input" rows="3" placeholder="Add any details, observations, or reminders." style={{ resize: "vertical", minHeight: "80px" }} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={savingLog} style={{ alignSelf: "flex-start", minWidth: "140px" }}>
                    {savingLog ? "Saving..." : "Save Entry"}
                  </button>
                </form>
              </div>
            )}

            {loadingLogs ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="settings-card" style={{ padding: "16px" }}>
                    <div style={{ height: "16px", width: "40%", background: "#e0e0e0", borderRadius: "6px", marginBottom: "8px" }} />
                    <div style={{ height: "14px", width: "70%", background: "#e0e0e0", borderRadius: "6px" }} />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="settings-card" style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ color: "var(--text-muted)", margin: "0 0 16px 0" }}>No journal entries yet. Add your first entry to start tracking your dog's journey.</p>
                <button className="btn btn-primary" onClick={() => setShowLogForm(true)}>Add First Entry</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {logs.map((log, index) => (
                  <div key={log.log_id || index} className="settings-card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                          <span className={`status-badge ${logTypeBadge(log.log_type)}`} style={{ fontSize: "11px" }}>{logTypeLabel(log.log_type)}</span>
                          <h4 style={{ margin: 0, color: "var(--text-main)", fontWeight: "600" }}>{log.title}</h4>
                        </div>
                        {log.notes && (
                          <p style={{ margin: "0 0 6px 0", color: "var(--text-light)", fontSize: "14px", lineHeight: "1.5" }}>{log.notes}</p>
                        )}
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>{formatDate(log.log_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {adoptedDogs.length === 0 && (
          <section style={{ marginTop: "32px" }}>
            <div className="settings-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <h3 style={{ margin: "0 0 12px 0", color: "var(--text-main)" }}>Post-Adoption Journal</h3>
              <p style={{ color: "var(--text-muted)", margin: "0 0 24px 0", maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>
                Once an adoption is finalized, your journal will appear here. Track vet appointments, feeding logs, training milestones, and celebrate every moment with your new companion.
              </p>
              <button className="btn btn-primary" onClick={() => navigate("/browse-dogs")}>
                Start Your Adoption Journey
              </button>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

function StatCard({ value, label, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} role="button" tabIndex="0" style={{ cursor: "pointer" }}>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}