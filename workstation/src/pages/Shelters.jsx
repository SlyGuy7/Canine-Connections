import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import { useDataCache } from "../context/DataCacheContext"
import { MapPin, List, Navigation } from "lucide-react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

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

const BLUE_ICON = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const geocodeCache = (() => {
  try { return JSON.parse(localStorage.getItem("shelter_geocache") || "{}") } catch { return {} }
})()

function saveGeocacheToStorage() {
  try { localStorage.setItem("shelter_geocache", JSON.stringify(geocodeCache)) } catch {}
}

async function geocode(city, state) {
  const key = `${city},${state}`
  if (geocodeCache[key]) return geocodeCache[key]
  try {
    const q = encodeURIComponent(`${city}, ${state}, United States`)
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`, {
      headers: { "Accept-Language": "en" }
    })
    const data = await r.json()
    if (data[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geocodeCache[key] = coords
      saveGeocacheToStorage()
      return coords
    }
  } catch {}
  return null
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function kmToMiles(km) { return km * 0.621371 }

const RADIUS_OPTIONS = [5, 10, 15, 25, 50]

function RecenterMap({ lat, lng, zoom }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], zoom) }, [lat, lng, zoom])
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
      style={{ background: "var(--card-bg)", borderRadius: "20px", overflow: "hidden", border: "1px solid var(--border)", display: "flex", flexDirection: "column", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
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
        {shelter._distanceMiles != null && (
          <span style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(255,255,255,0.92)", color: "#d97706", fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px" }}>
            {shelter._distanceMiles.toFixed(1)} mi
          </span>
        )}
      </div>
      <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ margin: "0 0 10px 0", color: "var(--text-primary)", fontSize: "17px", fontWeight: "700", lineHeight: "1.3" }}>{shelter.name}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
          {(shelter.city || shelter.state) && <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>📍 {[shelter.city, shelter.state].filter(Boolean).join(", ")}</span>}
          {shelter.phone && <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>📞 {shelter.phone}</span>}
          {shelter.email && <span style={{ fontSize: "13px", color: "var(--text-muted)", wordBreak: "break-all" }}>✉️ {shelter.email}</span>}
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
          <button onClick={() => navigate(`/browse-dogs?shelter_id=${shelter.shelter_id}`)} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"} onMouseLeave={e => e.currentTarget.style.background = "var(--card-bg)"}>
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [geoShelters, setGeoShelters] = useState([])
  const [geocoding, setGeocoding] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [radius, setRadius] = useState(50)
  const [page, setPage] = useState(1)
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
    setGeoShelters([])
    let cancelled = false
    ;(async () => {
      const accumulated = []
      for (let i = 0; i < shelters.length; i++) {
        if (cancelled) break
        const s = shelters[i]
        // Skip geocoding if already cached — no delay needed for cache hits
        const cacheKey = `${s.city},${s.state || ""}`
        const isCached = !!geocodeCache[cacheKey]
        const coords = s.city ? await geocode(s.city, s.state || "") : null
        if (coords) {
          accumulated.push({ ...s, coords })
          if (!cancelled) setGeoShelters([...accumulated])
        }
        // Only wait between uncached requests to respect Nominatim's 1 req/s limit
        if (!isCached && i < shelters.length - 1 && !cancelled) {
          await new Promise(r => setTimeout(r, 1200))
        }
      }
      if (!cancelled) setGeocoding(false)
    })()
    return () => { cancelled = true }
  }, [viewMode, shelters])

  function useMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => setLocating(false)
    )
  }

  const radiusMiles = radius

  const visibleGeoShelters = userLocation
    ? geoShelters
        .map(s => {
          const distKm = haversineKm(userLocation.lat, userLocation.lng, s.coords.lat, s.coords.lng)
          return { ...s, _distanceMiles: kmToMiles(distKm) }
        })
        .filter(s => s._distanceMiles <= radiusMiles)
        .sort((a, b) => a._distanceMiles - b._distanceMiles)
    : geoShelters

  const filtered = shelters

  const mapLat  = userLocation ? userLocation.lat : 38
  const mapLng  = userLocation ? userLocation.lng : -97
  const mapZoom = userLocation ? 9 : 4

  const stateCount = new Set(shelters.map(s => s.state).filter(Boolean)).size

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 60px 0" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #2f241d 0%, #4a3728 100%)", borderRadius: "24px", padding: "32px 36px", marginBottom: "24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "32px", top: "-10px", fontSize: "120px", opacity: 0.06, userSelect: "none", lineHeight: 1, pointerEvents: "none" }}>🏡</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "white" }}>Partner Shelters</h1>
          </div>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", overflow: "hidden" }}>
            {[{ mode: "grid", Icon: List, label: "Grid" }, { mode: "map", Icon: MapPin, label: "Map" }].map(({ mode, Icon, label }) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", border: "none", background: viewMode === mode ? "#d97706" : "transparent", color: viewMode === mode ? "white" : "rgba(255,255,255,0.6)", fontWeight: "600", fontSize: "14px", cursor: "pointer", transition: "all 0.15s" }}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
        </div>
        {!loading && shelters.length > 0 && (
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {[
              { icon: "🏡", label: "Shelters", value: shelters.length },
              { icon: "🗺️", label: "States",   value: stateCount },
              { icon: "🐾", label: "Available Dogs", value: "Browse →" },
            ].map(stat => (
              <div key={stat.label} style={{ padding: "10px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", cursor: stat.label === "Available Dogs" ? "pointer" : "default" }}
                onClick={stat.label === "Available Dogs" ? () => navigate("/browse-dogs") : undefined}>
                <p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "rgba(255,255,255,0.45)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.icon} {stat.label}</p>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "white" }}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        {[
          { icon: "🗺️", title: "Explore the Map", desc: "Switch to Map view and use your location to see shelters within a chosen radius." },
          { icon: "🐾", title: "Meet the Dogs", desc: "Visit any shelter's page to browse their available dogs and send a message." },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "26px", lineHeight: 1 }}>{icon}</span>
            <h3 style={{ margin: "4px 0 0 0", fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.55" }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Map controls */}
      {viewMode === "map" && !loading && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px 20px", marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={useMyLocation}
            disabled={locating}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 16px", borderRadius: "10px", border: "none", background: userLocation ? "#dcfce7" : "#d97706", color: userLocation ? "#166534" : "white", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
          >
            <Navigation size={14} />
            {locating ? "Locating…" : userLocation ? "Location set" : "Use my location"}
          </button>

          {userLocation && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Radius:</label>
                <select
                  value={radius}
                  onChange={e => setRadius(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "13px", fontWeight: "600", background: "var(--bg-primary)", color: "var(--text-primary)", cursor: "pointer" }}
                >
                  {RADIUS_OPTIONS.map(r => (
                    <option key={r} value={r}>{r} miles</option>
                  ))}
                </select>
              </div>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {visibleGeoShelters.length} shelter{visibleGeoShelters.length !== 1 ? "s" : ""} within {radius} miles
              </span>
              <button onClick={() => setUserLocation(null)} style={{ marginLeft: "auto", padding: "7px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer" }}>
                Clear location
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "14px 18px", color: "#dc2626", marginBottom: "24px", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "10px" }}>
          <span>⚠️</span><span>{error}</span>
          <button onClick={loadShelters} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: "8px", border: "1px solid #fca5a5", background: "white", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {/* Map view */}
      {viewMode === "map" && !loading && (
        <div style={{ borderRadius: "20px", overflow: "hidden", border: "1px solid var(--border)", marginBottom: "28px", height: "480px", position: "relative" }}>
          {geocoding && (
            <div style={{ position: "absolute", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "white", padding: "8px 20px", borderRadius: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontSize: "13px", fontWeight: "600", color: "#6f5848", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "12px", height: "12px", border: "2px solid #f3e8de", borderTopColor: "#d97706", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              {geoShelters.length > 0 ? `Placed ${geoShelters.length} of ${shelters.length} shelters…` : "Locating shelters…"}
            </div>
          )}
          <MapContainer center={[mapLat, mapLng]} zoom={mapZoom} style={{ width: "100%", height: "100%" }}>
            <RecenterMap lat={mapLat} lng={mapLng} zoom={mapZoom} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors' />
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={BLUE_ICON}>
                <Popup><strong>Your location</strong></Popup>
              </Marker>
            )}
            {visibleGeoShelters.map(s => (
              <Marker key={s.shelter_id} position={[s.coords.lat, s.coords.lng]} icon={ORANGE_ICON}>
                <Popup>
                  <div style={{ minWidth: "160px" }}>
                    <strong style={{ fontSize: "14px", color: "#2f241d" }}>{s.name}</strong>
                    {(s.city || s.state) && <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#78716c" }}>📍 {[s.city, s.state].filter(Boolean).join(", ")}</p>}
                    {s._distanceMiles != null && <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#d97706", fontWeight: "700" }}>{s._distanceMiles.toFixed(1)} miles away</p>}
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
        <div style={{ textAlign: "center", padding: "80px 40px", background: "var(--card-bg)", borderRadius: "20px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🏡</div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }}>No shelters found</h2>
          <p style={{ margin: "0 0 24px 0", color: "var(--text-muted)" }}>Check back later as our network grows.</p>
        </div>
      ) : viewMode === "grid" ? (() => {
        const PAGE_SIZE  = 12
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
        const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        return (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", marginBottom: "28px" }}>
              {paginated.map(shelter => <ShelterCard key={shelter.shelter_id} shelter={shelter} navigate={navigate} />)}
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg)", color: page === 1 ? "var(--text-muted)" : "var(--text-primary)", fontWeight: "600", fontSize: "14px", cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ width: "36px", height: "36px", borderRadius: "10px", border: p === page ? "none" : "1px solid var(--border)", background: p === page ? "#d97706" : "var(--card-bg)", color: p === page ? "white" : "var(--text-primary)", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg)", color: page === totalPages ? "var(--text-muted)" : "var(--text-primary)", fontWeight: "600", fontSize: "14px", cursor: page === totalPages ? "default" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}>
                  →
                </button>
              </div>
            )}
          </>
        )
      })() : null}
    </div>
  )
}
