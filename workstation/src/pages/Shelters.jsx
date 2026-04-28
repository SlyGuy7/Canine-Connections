import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import { sendMessage } from "../services/messaging"

export default function Shelters() {
  const navigate = useNavigate()
  const [shelters, setShelters] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => { loadShelters() }, [])

  async function loadShelters() {
    setLoading(true)
    setError("")
    try {
      const result = await sendMessage("request.shelters.list", {})
      if (result?.success) {
        setShelters(result.shelters || [])
      } else {
        setError("Failed to load shelters.")
      }
    } catch (err) {
      setError("Could not connect to server.")
    } finally {
      setLoading(false)
    }
  }

  const filtered = shelters.filter((s) => {
    const term = searchTerm.toLowerCase()
    return (
      s.name?.toLowerCase().includes(term) ||
      s.city?.toLowerCase().includes(term) ||
      s.state?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <header className="content-header" style={{ marginBottom: "30px" }}>
          <h1>Partner Shelters</h1>
          <p className="dashboard-subtitle">
            Connect with local rescues and shelters in our network.
            {!loading && ` ${shelters.length} shelters available.`}
          </p>
        </header>

        <section style={{ marginBottom: "30px" }}>
          <input
            className="form-input"
            style={{ maxWidth: "500px", width: "100%" }}
            placeholder="Search by shelter name, city, or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </section>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", color: "#dc2626", marginBottom: "20px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ background: "white", borderRadius: "20px", border: "1px solid #efdfd1", overflow: "hidden" }}>
                <div style={{ height: "140px", background: "#f5ede4" }} />
                <div style={{ padding: "20px" }}>
                  <div style={{ height: "16px", width: "60%", background: "#e0d5cc", borderRadius: "6px", marginBottom: "12px" }} />
                  <div style={{ height: "13px", width: "80%", background: "#e0d5cc", borderRadius: "6px", marginBottom: "8px" }} />
                  <div style={{ height: "13px", width: "50%", background: "#e0d5cc", borderRadius: "6px" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#6f5848" }}>
            {searchTerm ? "No shelters match your search." : "No shelters found."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {filtered.map((shelter) => (
              <div
                key={shelter.shelter_id}
                style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1", display: "flex", flexDirection: "column" }}
              >
                <div style={{ height: "140px", background: "linear-gradient(135deg, #e8f3f1 0%, #fdf6ef 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {shelter.logo_url ? (
                    <img src={shelter.logo_url} alt={shelter.name} style={{ maxHeight: "100px", maxWidth: "200px", objectFit: "contain" }} />
                  ) : (
                    <span style={{ fontSize: "56px" }}>🏡</span>
                  )}
                  {shelter.is_active === 0 && (
                    <span style={{ position: "absolute", top: "10px", right: "10px", background: "#fee2e2", color: "#dc2626", fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px" }}>
                      Inactive
                    </span>
                  )}
                </div>

                <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h3 style={{ margin: "0 0 12px 0", color: "#2f241d", fontSize: "16px", lineHeight: "1.3" }}>
                    {shelter.name}
                  </h3>

                  {(shelter.city || shelter.state) && (
                    <p style={{ margin: "0 0 6px 0", color: "#6f5848", fontSize: "14px" }}>
                      📍 {[shelter.city, shelter.state].filter(Boolean).join(", ")}
                    </p>
                  )}

                  {shelter.phone && (
                    <p style={{ margin: "0 0 6px 0", color: "#6f5848", fontSize: "14px" }}>
                      📞 {shelter.phone}
                    </p>
                  )}

                  {shelter.email && (
                    <p style={{ margin: "0 0 6px 0", color: "#6f5848", fontSize: "14px", wordBreak: "break-word" }}>
                      ✉️ {shelter.email}
                    </p>
                  )}

                  {shelter.website && (
                    <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
                      <a href={shelter.website.startsWith("http") ? shelter.website : `https://${shelter.website}`} target="_blank" rel="noreferrer" style={{ color: "#b45309", textDecoration: "none" }}>
                        🌐 Visit Website
                      </a>
                    </p>
                  )}

                  <div style={{ marginTop: "auto", paddingTop: "16px", display: "flex", gap: "10px" }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: "14px" }}
                      onClick={() => navigate(`/shelters/${shelter.shelter_id}`)}
                    >
                      View Details
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: "14px" }}
                      onClick={() => navigate(`/browse-dogs?shelter_id=${shelter.shelter_id}`)}
                    >
                      View Dogs
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}