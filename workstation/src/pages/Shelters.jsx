import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import { useDataCache } from "../context/DataCacheContext"

function ShelterSkeleton() {
  return (
    <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1" }}>
      <div style={{ height: "160px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ height: "18px", width: "65%", borderRadius: "8px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ height: "14px", width: "45%", borderRadius: "8px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ height: "14px", width: "55%", borderRadius: "8px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ height: "40px", borderRadius: "10px", marginTop: "6px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      </div>
    </div>
  )
}

export default function Shelters() {
  const navigate = useNavigate()
  const [shelters, setShelters] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const { getShelters } = useDataCache()
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
    } catch {
      setError("Could not connect to server.")
    } finally {
      setLoading(false)
    }
  }

  const filtered = shelters.filter(s => {
    const term = searchTerm.toLowerCase()
    return (
      s.name?.toLowerCase().includes(term) ||
      s.city?.toLowerCase().includes(term) ||
      s.state?.toLowerCase().includes(term)
    )
  })

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 60px 0" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Partner Shelters</h1>
        <p style={{ margin: 0, color: "#78716c", fontSize: "15px" }}>
          {loading ? "Loading shelters…" : `${filtered.length} shelter${filtered.length !== 1 ? "s" : ""} in our network`}
        </p>
      </div>

      {/* Search bar */}
      <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", padding: "20px 24px", marginBottom: "28px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", pointerEvents: "none" }}>🔍</span>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by shelter name, city, or state…"
            style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: "10px", border: "1px solid #e2d9d0", fontSize: "14px", fontFamily: "'Inter', sans-serif", outline: "none", boxSizing: "border-box", color: "#2f241d" }}
          />
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #fca5a5", background: "#fff1f2", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "14px 18px", color: "#dc2626", marginBottom: "24px", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "10px" }}>
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={loadShelters}
            style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: "8px", border: "1px solid #fca5a5", background: "white", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {Array.from({ length: 6 }).map((_, i) => <ShelterSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 40px", background: "white", borderRadius: "20px", border: "1px solid #efdfd1" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🏡</div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: "700", color: "#2f241d" }}>
            {searchTerm ? "No shelters match your search" : "No shelters found"}
          </h2>
          <p style={{ margin: "0 0 24px 0", color: "#78716c" }}>
            {searchTerm ? "Try a different name, city, or state." : "Check back later as our network grows."}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{ padding: "12px 28px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer" }}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {filtered.map(shelter => (
            <ShelterCard key={shelter.shelter_id} shelter={shelter} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}

function ShelterCard({ shelter, navigate }) {
  const initials = (shelter.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div
      style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1", display: "flex", flexDirection: "column", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Header image / logo area */}
      <div style={{ height: "160px", background: "linear-gradient(135deg, #fdf6ef 0%, #f0ebe5 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {shelter.logo_url ? (
          <img src={shelter.logo_url} alt={shelter.name} style={{ maxHeight: "110px", maxWidth: "80%", objectFit: "contain" }} />
        ) : (
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "800", color: "white" }}>
            {initials}
          </div>
        )}
        {shelter.is_active === 0 && (
          <span style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#dc2626", fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px" }}>
            Inactive
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#2f241d", fontSize: "17px", fontWeight: "700", lineHeight: "1.3" }}>
          {shelter.name}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
          {(shelter.city || shelter.state) && (
            <span style={{ fontSize: "13px", color: "#78716c", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📍</span>{[shelter.city, shelter.state].filter(Boolean).join(", ")}
            </span>
          )}
          {shelter.phone && (
            <span style={{ fontSize: "13px", color: "#78716c", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📞</span>{shelter.phone}
            </span>
          )}
          {shelter.email && (
            <span style={{ fontSize: "13px", color: "#78716c", display: "flex", alignItems: "center", gap: "6px", wordBreak: "break-all" }}>
              <span>✉️</span>{shelter.email}
            </span>
          )}
          {shelter.website && (
            <a
              href={shelter.website.startsWith("http") ? shelter.website : `https://${shelter.website}`}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: "13px", color: "#d97706", fontWeight: "600", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span>🌐</span>Visit Website
            </a>
          )}
        </div>

        <div style={{ marginTop: "auto", display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate(`/shelters/${shelter.shelter_id}`)}
            style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", transition: "background 0.15s ease" }}
            onMouseEnter={e => e.currentTarget.style.background = "#b45309"}
            onMouseLeave={e => e.currentTarget.style.background = "#d97706"}
          >
            View Details
          </button>
          <button
            onClick={() => navigate(`/browse-dogs?shelter_id=${shelter.shelter_id}`)}
            style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #e2d9d0", background: "white", color: "#2f241d", fontWeight: "600", fontSize: "14px", cursor: "pointer", transition: "background 0.15s ease" }}
            onMouseEnter={e => e.currentTarget.style.background = "#fdf6ef"}
            onMouseLeave={e => e.currentTarget.style.background = "white"}
          >
            View Dogs
          </button>
        </div>
      </div>
    </div>
  )
}
