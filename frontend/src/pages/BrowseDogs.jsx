// Main dog discovery and search page.
// Loads up to 500 dogs from the cache and lets users search, filter, and paginate through them.
import React, { useState, useEffect, useRef, useEffectEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useDataCache } from "../context/dataCache";
import { useToast } from "../context/toast";
import { Dog, Heart, History, MapPin, Search } from "lucide-react";
import { hasUserSession } from "../services/auth";
import { useAuthModal } from "../site/authModal";
import { DogCardSkeleton } from "../site/DogCard";

// Dogs shown per page in the paginated grid.
const PAGE_SIZE = 24;

// Display labels and badge colors for each dog size value stored in the database.
const SIZE_LABELS = { small: "Small", medium: "Medium", large: "Large", extra_large: "Extra large" };

// Converts a numeric age to a human-readable category used in filter chips and badges.
function getAgeCategory(ageYears) {
  const age = Number(ageYears) || 0;
  if (age <= 1) return "Puppy";
  if (age <= 3) return "Young";
  if (age <= 7) return "Adult";
  return "Senior";
}

// Animated shimmer placeholder card displayed while the dog list is loading from the cache.
// Calculates a rough compatibility score (60–99) between a dog and the user's quiz preferences.
// Returns null when no preferences have been saved so the badge is hidden for first-time visitors.
function calcMatchScore(dog, prefs) {
  if (!prefs || !Object.keys(prefs).length) return null;
  let score = 60;
  const size = (dog.size || "").toLowerCase();
  if (prefs.homeType === "Apartment" && (size === "small" || size === "medium")) score += 10;
  if (prefs.activityLevel === "High — runs, hikes, very active" && dog.energy_level === "high") score += 10;
  if (prefs.activityLevel === "Low — mostly indoors"            && dog.energy_level === "low")  score += 10;
  if (prefs.otherPets && prefs.otherPets !== "None" && dog.good_with_dogs == "1") score += 8;
  if (prefs.household?.includes("children") && dog.good_with_kids == "1") score += 8;
  const age = Number(dog.age_years) || 0;
  if (prefs.experience === "First-time owner" && age >= 2 && age <= 5) score += 4;
  return Math.min(score, 99);
}


// Same card design as the homepage, plus a save button and the quiz match score.
function DogCard({ dog, isSaved, onSave, onNavigate, matchScore }) {
  const [imgError, setImgError] = useState(false);
  const photo = !imgError ? (dog.photoList || [])[0] : null;

  return (
    <div className="s-card s-dog" role="link" tabIndex={0} style={{ cursor: "pointer" }}
      onClick={() => onNavigate(dog.dog_id)}
      onKeyDown={e => { if (e.key === "Enter") onNavigate(dog.dog_id); }}>
      <div className="s-dog__photo">
        {photo
          ? <img src={photo} alt={`${dog.name}, a ${dog.breed}`} loading="lazy" onError={() => setImgError(true)} />
          : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--text-subtle)" }}><Dog size={48} strokeWidth={1.5} /></div>}
        {matchScore !== null && matchScore !== undefined && (
          <span className="s-chip" style={{ position: "absolute", top: 12, left: 12, background: "var(--brand)", color: "#fff" }}>{matchScore}% match</span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onSave(dog); }}
          aria-label={isSaved ? `Remove ${dog.name} from saved dogs` : `Save ${dog.name}`}
          aria-pressed={isSaved}
          style={{ position: "absolute", top: 10, right: 10, width: 38, height: 38, borderRadius: "50%", border: "none", display: "grid", placeItems: "center", cursor: "pointer", background: "rgba(255,255,255,0.94)", color: isSaved ? "#dc2626" : "#5f4a3c", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        >
          <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="s-card__body">
        <span className="s-dog__name">{dog.name}</span>
        <span className="s-dog__breed">{dog.breed || "Mixed breed"}</span>
        <div className="s-dog__meta">
          <span className="s-chip">{getAgeCategory(dog.age_years)}</span>
          {dog.size && <span className="s-chip">{SIZE_LABELS[dog.size] || dog.size}</span>}
          {dog.gender && <span className="s-chip" style={{ textTransform: "capitalize" }}>{dog.gender}</span>}
        </div>
        {dog.shelter_name && <span className="s-dog__place"><MapPin size={14} /> {dog.shelter_name}</span>}
      </div>
    </div>
  );
}

export default function BrowseDogs() {
  const { openAuth } = useAuthModal();
  const [allDogs, setAllDogs] = useState([]);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
  // Initial filters can come from the URL, e.g. /browse-dogs?size=small&age=Puppy&compat=good_with_kids
  const [filters, setFilters] = useState(() => ({
    breed: "All",
    size: searchParams.get("size") || "All",
    age: searchParams.get("age") || "All",
    compat: (searchParams.get("compat") || "").split(",").filter(Boolean),
  }));
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [savedIds, setSavedIds] = useState(() => new Set(JSON.parse(localStorage.getItem("savedDogs") || "[]").map(d => d.dog_id)));
  const { getDogs } = useDataCache();
  const userPrefs = (() => { try { return JSON.parse(localStorage.getItem("userProfile") || "{}").prefs || {}; } catch { return {}; } })();
  const shelterIdParam = searchParams.get("shelter_id");

  const navigate = useNavigate();
  const { addToast } = useToast();
  const searchInputRef = useRef(null);
  const [recentlyViewed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("canine_recently_viewed") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function loadDogs() {
    try {
      if (!shelterIdParam) {
        const cached = await getDogs();
        setAllDogs(cached);
      } else {
        const result = await sendMessage("request.dogs.list", { limit: 500, offset: 0, shelter_id: parseInt(shelterIdParam) });
        if (result?.success && Array.isArray(result.dogs)) {
          setAllDogs(result.dogs.map(dog => ({
            ...dog,
            photoList: dog.photos ? dog.photos.split(",").map(p => p.trim()).filter(Boolean) : [],
            image: dog.photos ? dog.photos.split(",")[0].trim() : null,
          })));
        } else {
          setAllDogs([]);
        }
      }
    } catch {
      setAllDogs([]);
      addToast("Failed to connect to the database.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Effect event: always calls the latest version without re-running the effect.
  const onShelterFilterChange = useEffectEvent(() => loadDogs());
  useEffect(() => {
    onShelterFilterChange();
  }, [shelterIdParam]);

  useEffect(() => { setPage(1); }, [searchTerm, filters]);

    // Optimistic save/unsave: updates localStorage and the heart icon immediately, then fires
  // the backend call in the background so the change persists across devices.
  const handleSaveDog = (dog) => {
    if (!hasUserSession()) { openAuth("register"); return; }
    const userId = parseInt(localStorage.getItem("userId") || "0");
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]");
    const isSaved = savedIds.has(dog.dog_id);
    let updated;
    if (isSaved) {
      updated = savedDogs.filter(d => d.dog_id !== dog.dog_id);
      addToast(`${dog.name} removed from saved dogs.`, "success");
      if (userId) sendMessage("request.saved_dogs.remove", { user_id: userId, dog_id: dog.dog_id }).catch(() => {});
    } else {
      updated = [...savedDogs, dog];
      addToast(`${dog.name} saved!`, "success");
      if (userId) sendMessage("request.saved_dogs.add", { user_id: userId, dog_id: dog.dog_id }).catch(() => {});
    }
    localStorage.setItem("savedDogs", JSON.stringify(updated));
    setSavedIds(new Set(updated.map(d => d.dog_id)));
  };

  const filteredDogs = allDogs.filter(dog => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (dog.name || "").toLowerCase().includes(term) || (dog.breed || "").toLowerCase().includes(term);
    const matchesBreed = filters.breed === "All" || dog.breed === filters.breed;
    const matchesSize = filters.size === "All" || (dog.size || "").toLowerCase() === filters.size.toLowerCase();
    const matchesAge = filters.age === "All" || getAgeCategory(dog.age_years) === filters.age;
    const matchesCompat = filters.compat.every(c => {
      if (c === "kids")      return String(dog.good_with_kids)      === "1";
      if (c === "dogs")      return String(dog.good_with_dogs)      === "1";
      if (c === "cats")      return String(dog.good_with_cats)      === "1";
      if (c === "apartment") return String(dog.apartment_friendly)  === "1";
      return true;
    });
    return matchesSearch && matchesBreed && matchesSize && matchesAge && matchesCompat;
  });

  const totalPages = Math.ceil(filteredDogs.length / PAGE_SIZE);
  const paginatedDogs = filteredDogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const uniqueBreeds = ["All", ...new Set(allDogs.map(d => d.breed).filter(Boolean)).values()].sort();

  const selectStyle = {
    padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border)",
    background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "14px", fontWeight: "500",
    cursor: "pointer", outline: "none", fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 60px 0" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>Browse Dogs</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "15px" }}>
          {loading ? "Loading available dogs…" : `${filteredDogs.length} dog${filteredDogs.length !== 1 ? "s" : ""} available for adoption`}
        </p>
      </div>

      {/* Search + Filters */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "20px", padding: "20px 24px", marginBottom: "28px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", pointerEvents: "none" }}><Search size={13} strokeWidth={1.5} /></span>
          <input
            ref={searchInputRef}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name or breed"
            style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: "10px", border: "1px solid var(--border)", fontSize: "14px", fontFamily: "'Inter', sans-serif", outline: "none", boxSizing: "border-box", color: "var(--text-primary)" }}
          />
        </div>
        <select value={filters.breed} onChange={e => setFilters(f => ({ ...f, breed: e.target.value }))} style={selectStyle}>
          {uniqueBreeds.map(b => <option key={b} value={b}>{b === "All" ? "All Breeds" : b}</option>)}
        </select>
        <select value={filters.size} onChange={e => setFilters(f => ({ ...f, size: e.target.value }))} style={selectStyle}>
          <option value="All">All Sizes</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="extra_large">Extra Large</option>
        </select>
        <select value={filters.age} onChange={e => setFilters(f => ({ ...f, age: e.target.value }))} style={selectStyle}>
          <option value="All">All Ages</option>
          <option value="Puppy">Puppy (0–1 yr)</option>
          <option value="Young">Young (2–3 yrs)</option>
          <option value="Adult">Adult (4–7 yrs)</option>
          <option value="Senior">Senior (8+ yrs)</option>
        </select>
        {(searchTerm || filters.breed !== "All" || filters.size !== "All" || filters.age !== "All" || filters.compat.length > 0) && (
          <button
            onClick={() => { setSearchTerm(""); setFilters({ breed: "All", size: "All", age: "All", compat: [] }); }}
            style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #fca5a5", background: "var(--danger-soft)", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}
          >
            Clear filters
          </button>
        )}
        {/* Compatibility row */}
        <div style={{ width: "100%", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", paddingTop: "4px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Compatibility</span>
          {[
            { key: "kids",      label: "Good with kids" },
            { key: "dogs",      label: "Good with dogs" },
            { key: "cats",      label: "Good with cats" },
            { key: "apartment", label: "Apartment friendly" },
          ].map(({ key, label }) => {
            const active = filters.compat.includes(key);
            return (
              <button key={key} onClick={() => setFilters(f => ({ ...f, compat: active ? f.compat.filter(c => c !== key) : [...f.compat, key] }))}
                style={{ padding: "7px 14px", borderRadius: "20px", border: `1px solid ${active ? "var(--brand)" : "var(--border)"}`, background: active ? "var(--brand-soft)" : "var(--card-bg)", color: active ? "var(--brand-strong)" : "var(--text-muted)", fontWeight: active ? "700" : "500", fontSize: "13px", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "5px" }}>
                {active && <span style={{ fontSize: "11px" }}>×</span>}{label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && !searchTerm && filters.breed === "All" && filters.size === "All" && filters.age === "All" && filters.compat.length === 0 && (
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <History size={16} color="#9a8070" />
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recently Viewed</span>
          </div>
          <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px" }}>
            {recentlyViewed.slice(0, 6).map(d => (
              <div key={d.dog_id} onClick={() => navigate(`/dogs/${d.dog_id}`)}
                style={{ flexShrink: 0, width: "100px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden", background: "var(--brand-soft)", margin: "0 auto 8px auto", border: "2px solid #efdfd1" }}>
                  {d.photo
                    ? <img src={d.photo} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}><Dog size={22} strokeWidth={1.5} /></div>
                  }
                </div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.breed}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
          {Array.from({ length: 8 }).map((_, i) => <DogCardSkeleton key={i} />)}
        </div>
      ) : paginatedDogs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 40px", background: "var(--card-bg)", borderRadius: "20px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}><Search size={51} strokeWidth={1.5} /></div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }}>No dogs found</h2>
          <p style={{ margin: "0 0 24px 0", color: "var(--text-muted)" }}>Try adjusting your search or filters.</p>
          <button
            onClick={() => { setSearchTerm(""); setFilters({ breed: "All", size: "All", age: "All", compat: [] }); }}
            style={{ padding: "12px 28px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer" }}
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
          {paginatedDogs.map(dog => (
            <DogCard key={dog.dog_id} dog={dog} isSaved={savedIds.has(dog.dog_id)} onSave={handleSaveDog} onNavigate={id => navigate(`/dogs/${id}`)} matchScore={Object.keys(userPrefs).length ? calcMatchScore(dog, userPrefs) : null} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "40px" }}>
          <button
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
            disabled={page === 1}
            style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg)", color: page === 1 ? "#c4a98e" : "#2f241d", fontWeight: "600", fontSize: "14px", cursor: page === 1 ? "default" : "pointer" }}
          >
            ← Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
            return (
              <button
                key={p}
                onClick={() => { setPage(p); window.scrollTo(0, 0); }}
                style={{ width: "40px", height: "40px", borderRadius: "10px", border: p === page ? "none" : "1px solid #e2d9d0", background: p === page ? "#d97706" : "white", color: p === page ? "white" : "#2f241d", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0); }}
            disabled={page === totalPages}
            style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg)", color: page === totalPages ? "#c4a98e" : "#2f241d", fontWeight: "600", fontSize: "14px", cursor: page === totalPages ? "default" : "pointer" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
