import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import { useDataCache } from "../context/DataCacheContext"
import { MapPin, List } from "lucide-react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix default marker icon broken by webpack
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

const ORANGE_ICON = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const geocodeCache = {}

async function geocode(city, state) {
  const key = `${city},${state}`
  if (geocodeCache[key]) return geocodeCache[key]
  try {
    const q = encodeURIComponent(`${city}, ${state}, Canada`)
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { "Accept-Language": "en" }
    })
    const data = await r.json()
    if (data[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geocodeCache[key] = coords
      return coords
    }
  } catch {}
  return null
}

function ShelterSkeleton() {
  const S = { background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }
  return (
    <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1" }}>
      <div style={{ height: "160px", ...S }} />
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {[["65%", "18px"], ["45%", "14px"], ["55%", "14px"], ["100%", "40px"]].map(([w, h], i) => (
          <div key={i} style={{ height: h, width: w, borderRadius: "8px", ...S }} />
        ))}
      </div>
    </div>
  )
}

function ShelterCard({ shelter, navigate }) {
  const initials = (shelter.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div
      style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1", display: "flex", flexDirection: "column", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.09)" }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}
    >
      <div style={{ height: "160px", background: "linear-gradient(135deg, #fdf6ef 0%, #f0ebe5 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {shelter.logo_url
          ? <img src={shelter.logo_url} alt={shelter.name} style={{ maxHeight: "110px", maxWidth: "80%", objectFit: "contain" }} />
          : <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "800", color: "white" }}>{initials}</div>
        }
        {shelter.is_active === 0 && (
          <span style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#dc2626", fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px" }}>Inactive</span>
        )}
      </div>
      <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#2f241d", fontSize: "17px", fontWeight: "700", lineHeight: "1.3" }}>{shelter.name}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
          {(shelter.city || shelter.state) && <span style={{ fontSize: "13px", color: "#78716c" }}>📍 {[shelter.city, shelter.state].filter(Boolean).join(", ")}</span>}
          {shelter.phone && <span style={{ fontSize: "13px", color: "#78716c" }}>📞 {shelter.phone}</span>}
          {shelter.email && <span style={{ fontSize: "13px", color: "#78716c", wordBreak: "break-all" }}>✉️ {shelter.email}</span>}
          {shelter.website && (
            <a href={shelter.website.startsWith("http") ? shelter.website : `https://${shelter.website}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: "13px", color: "#d97706", fontWeight: "600", textDecoration: "none" }}>
              🌐 Visit Website
            </a>
          )}
        </div>
        <div style={{ marginTop: "auto", display: "flex", gap: "10px" }}>
          <button onClick={() => navigate(`/shelters/${shelter.shelter_id}`)} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "#b45309"} onMouseLeave={e => e.currentTarget.style.background = "#d97706"}>
            View Details
          </button>
          <button onClick={() => navigate(`/browse-dogs?shelter_id=${shelter.shelter_id}`)} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #e2d9d0", background: "white", color: "#2f241d", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "#fdf6ef"} onMouseLeave={e => e.currentTarget.style.background = "white"}>
            View Dogs
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Shelters() {
  const navigate = useNavigate()
  const [shelters, setShelters] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [geoShelters, setGeoShelters] = useState([])
  const [geocoding, setGeocoding] = useState(false)
  const { getShelters } = useDataCache()

  useEffect(() => { loadShelters() }, [])

  async function loadShelters() {
    setLoading(true); setError("")
    try {
      const data = await getShelters()
      setShelters(data)
    } catch {
      setError("Could not connect to server.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (viewMode !== "map" || shelters.length === 0) return
    setGeocoding(true)
    Promise.all(
      shelters.map(async s => {
        const coords = s.city ? await geocode(s.city, s.state || "") : null
        return { ...s, coords }
      })
    ).then(results => {
      setGeoShelters(results.filter(s => s.coords))
      setGeocoding(false)
    })
  }, [viewMode, shelters])

  const filtered = shelters.filter(s => {
    const term = searchTerm.toLowerCase()
    return s.name?.toLowerCase().includes(term) || s.city?.toLowerCase().includes(term) || s.state?.toLowerCase().includes(term)
  })

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 60px 0" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Partner Shelters</h1>
          <p style={{ margin: 0, color: "#78716c", fontSize: "15px" }}>
            {loading ? "Loading shelters…" : `${filtered.length} shelter${filtered.length !== 1 ? "s" : ""} in our network`}
          </p>
        </div>
        {/* View toggle */}
        <div style={{ display: "flex", background: "white", border: "1px solid #efdfd1", borderRadius: "12px", overflow: "hidden" }}>
          {[{ mode: "grid", Icon: List, label: "Grid" }, { mode: "map", Icon: MapPin, label: "Map" }].map(({ mode, Icon, label }) => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", border: "none", background: viewMode === mode ? "#d97706" : "white", color: viewMode === mode ? "white" : "#6f5848", fontWeight: "600", fontSize: "14px", cursor: "pointer", transition: "all 0.15s" }}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", padding: "20px 24px", marginBottom: "28px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", pointerEvents: "none" }}>🔍</span>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by shelter name, city, or state…"
            style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: "10px", border: "1px solid #e2d9d0", fontSize: "14px", fontFamily: "'Inter', sans-serif", outline: "none", boxSizing: "border-box", color: "#2f241d" }} />
        </div>
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #fca5a5", background: "#fff1f2", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}>Clear</button>
        )}
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "14px 18px", color: "#dc2626", marginBottom: "24px", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "10px" }}>
          <span>⚠️</span><span>{error}</span>
          <button onClick={loadShelters} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: "8px", border: "1px solid #fca5a5", background: "white", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {/* Map view */}
      {viewMode === "map" && !loading && (
        <div style={{ borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1", marginBottom: "28px", height: "480px", position: "relative" }}>
          {geocoding && (
            <div style={{ position: "absolute", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "white", padding: "8px 20px", borderRadius: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontSize: "13px", fontWeight: "600", color: "#6f5848" }}>
              Locating shelters…
            </div>
          )}
          <MapContainer center={[56, -96]} zoom={4} style={{ width: "100%", height: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors' />
            {geoShelters.map(s => (
              <Marker key={s.shelter_id} position={[s.coords.lat, s.coords.lng]} icon={ORANGE_ICON}>
                <Popup>
                  <div style={{ minWidth: "160px" }}>
                    <strong style={{ fontSize: "14px", color: "#2f241d" }}>{s.name}</strong>
                    {(s.city || s.state) && <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#78716c" }}>📍 {[s.city, s.state].filter(Boolean).join(", ")}</p>}
                    <button onClick={() => navigate(`/shelters/${s.shelter_id}`)} style={{ marginTop: "8px", padding: "6px 14px", borderRadius: "8px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "12px", cursor: "pointer", width: "100%" }}>View Details</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Grid view */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {Array.from({ length: 6 }).map((_, i) => <ShelterSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 40px", background: "white", borderRadius: "20px", border: "1px solid #efdfd1" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🏡</div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: "700", color: "#2f241d" }}>{searchTerm ? "No shelters match your search" : "No shelters found"}</h2>
          <p style={{ margin: "0 0 24px 0", color: "#78716c" }}>{searchTerm ? "Try a different name, city, or state." : "Check back later as our network grows."}</p>
          {searchTerm && <button onClick={() => setSearchTerm("")} style={{ padding: "12px 28px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer" }}>Clear search</button>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {filtered.map(shelter => <ShelterCard key={shelter.shelter_id} shelter={shelter} navigate={navigate} />)}
        </div>
      )}
    </div>
  )
}
