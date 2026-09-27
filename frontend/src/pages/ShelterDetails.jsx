// Single shelter detail page — loads shelter info via request.shelters.get and falls back to the
// DataCacheContext shelter list if the direct fetch fails. Tracks viewed shelter IDs in localStorage.
// Loads up to 50 available dogs from this shelter in parallel and shows the first 12, with a
// "Message Shelter" button that navigates to /messages with router state so chat opens immediately.
import React, { useState, useEffect, useEffectEvent } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import { useDataCache } from "../context/dataCache"

export default function ShelterDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getShelters } = useDataCache()
  const [shelter, setShelter] = useState(null)
  const [dogs, setDogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadShelter() {
    try {
      const result = await sendMessage("request.shelters.get", { shelter_id: parseInt(id) })
      if (result?.success && result.shelter) {
        setShelter(result.shelter)
        const viewed = JSON.parse(localStorage.getItem("viewedShelters") || "[]")
        if (!viewed.includes(parseInt(id))) {
          localStorage.setItem("viewedShelters", JSON.stringify([...viewed, parseInt(id)]))
        }
      } else {
        // Fallback: look up shelter in the cached list
        const all = await getShelters()
        const found = all.find(s => s.shelter_id === parseInt(id))
        if (found) {
          setShelter(found)
        } else {
          setError("Shelter not found.")
        }
      }
    } catch {
      setError("Could not load shelter details.")
    }
  }

  // Effect event: always calls the latest version without re-running the effect.
  const onShelterChangeInfo = useEffectEvent(() => loadShelter());
  async function loadDogs() {
    try {
      const result = await sendMessage("request.dogs.list", {
        shelter_id: parseInt(id),
        status: "available",
        limit: 50,
      })
      setDogs(result?.dogs || [])
    } catch {
      setDogs([])
    } finally {
      setLoading(false)
    }
  }

  // Effect event: always calls the latest version without re-running the effect.
  const onShelterChangeDogs = useEffectEvent(() => loadDogs());
  useEffect(() => {
    onShelterChangeInfo()
    onShelterChangeDogs()
  }, [id])

  if (loading) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "60px 0", textAlign: "center", color: "#6f5848" }}>
        Loading shelter…
      </div>
    )
  }

  if (error || !shelter) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 0 60px 0" }}>
<div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "20px", color: "#dc2626" }}>
          {error || "Shelter not found."}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 0 60px 0" }}>

<div style={{ background: "var(--card-bg)", borderRadius: "20px", border: "1px solid var(--border)", padding: "32px", marginBottom: "32px" }}>
          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: "100px", height: "100px", background: "linear-gradient(135deg, #e8f3f1, #fdf6ef)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {shelter.logo_url ? (
                <img src={shelter.logo_url} alt={shelter.name} style={{ maxWidth: "90px", maxHeight: "90px", objectFit: "contain", borderRadius: "12px" }} />
              ) : (
                <span style={{ fontSize: "48px" }}>🏡</span>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "26px" }}>{shelter.name}</h1>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
                {(shelter.city || shelter.state) && (
                  <span style={{ color: "var(--text-muted)", fontSize: "15px" }}>
                    📍 {[shelter.city, shelter.state, shelter.zip].filter(Boolean).join(", ")}
                  </span>
                )}
                {shelter.phone && (
                  <span style={{ color: "var(--text-muted)", fontSize: "15px" }}>📞 {shelter.phone}</span>
                )}
                {shelter.email && (
                  <span style={{ color: "var(--text-muted)", fontSize: "15px" }}>✉️ {shelter.email}</span>
                )}
              </div>

              {shelter.website && (
                <a
                  href={shelter.website.startsWith("http") ? shelter.website : `https://${shelter.website}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#b45309", fontSize: "14px", textDecoration: "none", display: "inline-block", marginBottom: "12px" }}
                >
                  🌐 Visit Website
                </a>
              )}

              {shelter.description && (
                <p style={{ margin: "12px 0 0 0", color: "var(--text-muted)", fontSize: "15px", lineHeight: "1.6" }}>
                  {shelter.description}
                </p>
              )}

              <button
                onClick={() => navigate("/messages", { state: { shelterId: parseInt(id), shelter } })}
                style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}
              >
                💬 Message Shelter
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: "20px" }}>
            Available Dogs {dogs.length > 0 && `(${dogs.length})`}
          </h2>
          <button
            className="btn btn-secondary"
            style={{ fontSize: "14px" }}
            onClick={() => navigate(`/browse-dogs?shelter_id=${id}`)}
          >
            Browse All Dogs
          </button>
        </div>

        {dogs.length === 0 ? (
          <div style={{ background: "var(--card-bg)", borderRadius: "16px", border: "1px solid var(--border)", padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            No available dogs from this shelter at this time.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
            {dogs.slice(0, 12).map((dog) => {
              const photoUrl = dog.photos ? dog.photos.split(",")[0] : null
              return (
                <div
                  key={dog.dog_id}
                  style={{ background: "var(--card-bg)", borderRadius: "16px", border: "1px solid var(--border)", overflow: "hidden", cursor: "pointer", transition: "transform 0.15s" }}
                  onClick={() => navigate(`/dogs/${dog.dog_id}`)}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <div style={{ height: "160px", background: "#f5ede4", overflow: "hidden" }}>
                    {photoUrl ? (
                      <img src={photoUrl} alt={dog.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none" }} />
                    ) : (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>🐾</div>
                    )}
                  </div>
                  <div style={{ padding: "14px" }}>
                    <h4 style={{ margin: "0 0 4px 0", color: "var(--text-primary)", fontSize: "15px" }}>{dog.name}</h4>
                    <p style={{ margin: "0 0 4px 0", color: "var(--text-muted)", fontSize: "13px" }}>{dog.breed}</p>
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px" }}>
                      {dog.age_years} yr · {dog.size} · {dog.gender}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {dogs.length > 12 && (
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/browse-dogs?shelter_id=${id}`)}
            >
              View All {dogs.length} Dogs from This Shelter
            </button>
          </div>
        )}
    </div>
  )
}