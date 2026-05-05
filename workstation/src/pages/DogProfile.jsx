import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";
import { Share2, ChevronLeft, ChevronRight } from "lucide-react";

function trackRecentlyViewed(dog) {
  try {
    const key = "canine_recently_viewed";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const filtered = existing.filter(d => d.dog_id !== dog.dog_id);
    const updated = [{ dog_id: dog.dog_id, name: dog.name, breed: dog.breed, photo: dog.photos ? (typeof dog.photos === "string" ? dog.photos.split(",")[0].trim() : "") : "" }, ...filtered].slice(0, 10);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

export default function DogProfile() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { addToast } = useToast();

  const [dog, setDog]             = useState(null);
  const [shelter, setShelter]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isSaved, setIsSaved]     = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const hasFetched = useRef(false);

  useEffect(() => { hasFetched.current = false; }, [id]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [dogResult, appResult] = await Promise.all([
        sendMessage("request.dogs.get", { dog_id: parseInt(id, 10) }),
        sendMessage("request.application.list", { user_id: parseInt(localStorage.getItem("userId") || "0") }),
      ]);
      if (dogResult?.success && dogResult.dog) {
        setDog(dogResult.dog);
        trackRecentlyViewed(dogResult.dog);
        const saved = JSON.parse(localStorage.getItem("savedDogs") || "[]");
        setIsSaved(saved.some(d => d.dog_id === dogResult.dog.dog_id));
        const apps = appResult?.applications || [];
        setHasApplied(apps.some(a => String(a.dog_id) === String(id)));
        if (dogResult.dog.shelter_id) {
          sendMessage("request.shelters.get", { shelter_id: dogResult.dog.shelter_id })
            .then(r => { if (r?.success && r.shelter) setShelter(r.shelter); })
            .catch(() => {});
        }
      } else {
        addToast("Could not load dog details.", "error");
      }
    } catch {
      addToast("Failed to connect to the server.", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = () => {
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]");
    if (isSaved) {
      const updated = savedDogs.filter(d => d.dog_id !== dog.dog_id);
      localStorage.setItem("savedDogs", JSON.stringify(updated));
      setIsSaved(false);
      addToast(`${dog.name} removed from saved dogs.`, "success");
    } else {
      localStorage.setItem("savedDogs", JSON.stringify([...savedDogs, dog]));
      setIsSaved(true);
      addToast(`${dog.name} saved!`, "success");
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 0 60px 0" }}>
        <div style={{ display: "flex", gap: "40px" }}>
          <div style={{ flex: 1, height: "420px", borderRadius: "20px", background: "linear-gradient(90deg,#f3e8de 25%,#faf0e8 50%,#f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
          <div style={{ flex: 1.5, display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}>
            {[60, 40, 80, 50, 70].map((w, i) => (
              <div key={i} style={{ height: i === 0 ? "40px" : "18px", width: `${w}%`, borderRadius: "8px", background: "linear-gradient(90deg,#f3e8de 25%,#faf0e8 50%,#f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dog) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center", paddingTop: "80px" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🐾</div>
        <h2 style={{ color: "#2f241d", marginBottom: "12px" }}>Dog not found</h2>
        <button onClick={() => navigate(-1)} style={{ padding: "12px 28px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer" }}>
          ← Go Back
        </button>
      </div>
    );
  }

  const photos = Array.isArray(dog.photos)
    ? dog.photos.map(p => p.photo_url).filter(Boolean)
    : dog.photos ? dog.photos.split(",").map(p => p.trim()).filter(Boolean) : [];
  const currentPhoto = photos[activePhoto] || null;

  const traits = [
    dog.good_with_kids     !== null && { label: "Good with kids",     ok: dog.good_with_kids == "1" },
    dog.good_with_dogs     !== null && { label: "Good with dogs",     ok: dog.good_with_dogs == "1" },
    dog.good_with_cats     !== null && { label: "Good with cats",     ok: dog.good_with_cats == "1" },
    dog.apartment_friendly !== null && { label: "Apartment friendly", ok: dog.apartment_friendly == "1" },
  ].filter(Boolean);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 0 60px 0", fontFamily: "'Inter', sans-serif" }}>


      <div style={{ display: "flex", gap: "36px", alignItems: "flex-start" }}>

        {/* ── Left: photos ── */}
        <div style={{ width: "400px", flexShrink: 0 }}>
          <div style={{ width: "100%", height: "400px", borderRadius: "20px", overflow: "hidden", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px", border: "1px solid #efdfd1", position: "relative" }}>
            {currentPhoto
              ? <img src={currentPhoto} alt={dog.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
              : "🐕"}
            {photos.length > 1 && (
              <>
                <button onClick={() => setActivePhoto(i => (i - 1 + photos.length) % photos.length)}
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                  <ChevronLeft size={18} color="#2f241d" />
                </button>
                <button onClick={() => setActivePhoto(i => (i + 1) % photos.length)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                  <ChevronRight size={18} color="#2f241d" />
                </button>
                <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
                  {photos.map((_, i) => (
                    <button key={i} onClick={() => setActivePhoto(i)} style={{ width: i === activePhoto ? "20px" : "8px", height: "8px", borderRadius: "4px", border: "none", background: i === activePhoto ? "#d97706" : "rgba(255,255,255,0.7)", transition: "all 0.2s", cursor: "pointer", padding: 0 }} />
                  ))}
                </div>
              </>
            )}
          </div>

          {photos.length > 1 && (
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", overflowX: "auto", paddingBottom: "4px" }}>
              {photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`${dog.name} ${i + 1}`}
                  onClick={() => setActivePhoto(i)}
                  style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "10px", cursor: "pointer", flexShrink: 0, border: i === activePhoto ? "3px solid #d97706" : "3px solid transparent", opacity: i === activePhoto ? 1 : 0.65, transition: "all 0.15s" }}
                />
              ))}
            </div>
          )}

          {/* Energy level badge */}
          {dog.energy_level && (
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "10px", background: "white", border: "1px solid #efdfd1", borderRadius: "14px", padding: "14px 18px" }}>
              <span style={{ fontSize: "20px" }}>⚡</span>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Energy level</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#2f241d", textTransform: "capitalize" }}>{dog.energy_level}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: details ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Name + save + share */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "6px" }}>
            <h1 style={{ margin: 0, fontSize: "36px", fontWeight: "800", color: "#2f241d", lineHeight: 1.1 }}>{dog.name}</h1>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: `Meet ${dog.name}`, text: `${dog.name} is a ${dog.breed} looking for a forever home!`, url: window.location.href })
                  } else {
                    navigator.clipboard.writeText(window.location.href)
                    addToast("Link copied to clipboard!", "success")
                  }
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderRadius: "12px", border: "1px solid #efdfd1", background: "white", color: "#6f5848", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
                title="Share this dog"
              >
                <Share2 size={15} />
                Share
              </button>
              <button
                onClick={handleSave}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "12px", border: isSaved ? "1px solid #fca5a5" : "1px solid #efdfd1", background: isSaved ? "#fff1f2" : "white", color: isSaved ? "#e11d48" : "#6f5848", fontWeight: "700", fontSize: "15px", cursor: "pointer", transition: "all 0.15s" }}
              >
                <span style={{ fontSize: "18px" }}>{isSaved ? "♥" : "♡"}</span>
                {isSaved ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          <p style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#d97706", fontWeight: "700" }}>{dog.breed}</p>

          {/* Status pill */}
          <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: dog.status === "available" ? "#dcfce7" : "#f3f4f6", color: dog.status === "available" ? "#16a34a" : "#6b7280", fontSize: "13px", fontWeight: "700", marginBottom: "24px", textTransform: "capitalize" }}>
            {dog.status || "Available"}
          </span>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
            <StatBox label="Age" value={`${dog.age_years} ${dog.age_years == 1 ? "yr" : "yrs"}`} />
            <StatBox label="Size" value={dog.size} />
            <StatBox label="Gender" value={dog.gender} />
          </div>

          {/* Compatibility tags */}
          {traits.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Compatibility</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {traits.map(t => (
                  <span key={t.label} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", background: t.ok ? "#f0fdf4" : "#fef2f2", color: t.ok ? "#16a34a" : "#dc2626", border: `1px solid ${t.ok ? "#bbf7d0" : "#fecaca"}` }}>
                    {t.ok ? "✓" : "✗"} {t.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "16px", padding: "20px 24px", marginBottom: "24px" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>About {dog.name}</p>
            <p style={{ margin: 0, lineHeight: "1.7", color: "#2f241d", fontSize: "15px" }}>
              {dog.description || "No description provided. Contact the shelter for more details."}
            </p>
          </div>

          {/* Shelter */}
          {shelter && (
            <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "16px", padding: "20px 24px", marginBottom: "24px" }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Available from</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "17px", fontWeight: "700", color: "#2f241d", marginBottom: "4px" }}>{shelter.name}</div>
                  {(shelter.city || shelter.state) && (
                    <div style={{ fontSize: "14px", color: "#6f5848" }}>📍 {[shelter.city, shelter.state].filter(Boolean).join(", ")}</div>
                  )}
                  {shelter.phone && <div style={{ fontSize: "14px", color: "#6f5848", marginTop: "2px" }}>📞 {shelter.phone}</div>}
                  {shelter.email && <div style={{ fontSize: "14px", color: "#6f5848", marginTop: "2px" }}>✉️ {shelter.email}</div>}
                </div>
                <button
                  onClick={() => navigate(`/shelters/${shelter.shelter_id}`)}
                  style={{ flexShrink: 0, padding: "9px 18px", borderRadius: "10px", border: "1px solid #efdfd1", background: "#fdf7f2", color: "#d97706", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}
                >
                  View Shelter →
                </button>
              </div>
            </div>
          )}

          {/* CTA */}
          {hasApplied ? (
            <div style={{ width: "100%", padding: "16px", borderRadius: "14px", background: "#f0fdf4", border: "1.5px solid #86efac", textAlign: "center" }}>
              <span style={{ fontSize: "17px", fontWeight: "700", color: "#16a34a" }}>✓ You've already applied for {dog.name}</span>
              <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#4ade80" }}>
                <span style={{ color: "#166534", cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/applications")}>View your application →</span>
              </p>
            </div>
          ) : (
            <button
              onClick={() => navigate("/apply", { state: { dogId: dog.dog_id, dogName: dog.name } })}
              style={{ width: "100%", padding: "16px", borderRadius: "14px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "17px", cursor: "pointer", boxShadow: "0 4px 16px rgba(217,119,6,0.3)", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.target.style.opacity = "0.88")}
              onMouseLeave={e => (e.target.style.opacity = "1")}
            >
              Start Adoption Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "14px", padding: "14px 16px" }}>
      <div style={{ fontSize: "11px", fontWeight: "700", color: "#9c7e6a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "16px", fontWeight: "700", color: "#2f241d", textTransform: "capitalize" }}>{value}</div>
    </div>
  );
}
