import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useDataCache } from "../context/DataCacheContext";
import { useToast } from "../context/ToastContext";

const PAGE_SIZE = 24;

const SIZE_LABELS = { small: "Small", medium: "Medium", large: "Large", extra_large: "XL" };
const SIZE_COLORS = { small: { bg: "#eff6ff", color: "#1d4ed8" }, medium: { bg: "#f0fdf4", color: "#15803d" }, large: { bg: "#fefce8", color: "#a16207" }, extra_large: { bg: "#fdf4ff", color: "#7e22ce" } };

function getAgeCategory(ageYears) {
  const age = Number(ageYears) || 0;
  if (age <= 1) return "Puppy";
  if (age <= 3) return "Young";
  if (age <= 7) return "Adult";
  return "Senior";
}

function DogCardSkeleton() {
  return (
    <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1" }}>
      <div style={{ height: "220px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ height: "20px", width: "55%", borderRadius: "8px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ height: "14px", width: "75%", borderRadius: "8px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ height: "14px", width: "45%", borderRadius: "8px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ height: "40px", borderRadius: "10px", marginTop: "6px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      </div>
    </div>
  );
}

function DogCard({ dog, isSaved, onSave, onNavigate }) {
  const [imgError, setImgError] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const ageLabel = getAgeCategory(dog.age_years);
  const sizeKey = (dog.size || "").toLowerCase().replace(" ", "_");
  const sizeStyle = SIZE_COLORS[sizeKey] || { bg: "#f3f4f6", color: "#374151" };
  const sizeLabel = SIZE_LABELS[sizeKey] || dog.size || "—";

  const handleSave = (e) => {
    e.stopPropagation();
    onSave(dog);
  };

  const photos = dog.photoList || [];
  const currentPhoto = !imgError && photos[imgIndex] ? photos[imgIndex] : null;

  return (
    <div
      onClick={() => onNavigate(dog.dog_id)}
      style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1", cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease", display: "flex", flexDirection: "column" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.10)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ height: "220px", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={dog.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => {
              if (imgIndex + 1 < photos.length) setImgIndex(i => i + 1);
              else setImgError(true);
            }}
          />
        ) : (
          <span style={{ fontSize: "64px" }}>🐕</span>
        )}
        <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px" }}>
          <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", background: "rgba(0,0,0,0.45)", color: "white", backdropFilter: "blur(4px)" }}>
            {ageLabel}
          </span>
          <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", background: sizeStyle.bg, color: sizeStyle.color }}>
            {sizeLabel}
          </span>
        </div>
        <button
          onClick={handleSave}
          title="Save dog"
          style={{ position: "absolute", top: "10px", right: "10px", width: "36px", height: "36px", borderRadius: "50%", border: "none", background: isSaved ? "#ef4444" : "rgba(255,255,255,0.9)", color: isSaved ? "white" : "#6f5848", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", transition: "all 0.2s ease" }}
        >
          {isSaved ? "♥" : "♡"}
        </button>
      </div>
      <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700", color: "#2f241d" }}>{dog.name}</h3>
        <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#78716c" }}>{dog.breed || "Unknown Breed"}</p>
        <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#a8a29e" }}>
          {Number(dog.age_years) || 0} {Number(dog.age_years) === 1 ? "yr" : "yrs"} old
          {dog.shelter_name ? ` · ${dog.shelter_name}` : ""}
        </p>
        <button
          onClick={e => { e.stopPropagation(); onNavigate(dog.dog_id); }}
          style={{ marginTop: "auto", width: "100%", padding: "11px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", transition: "background 0.15s ease" }}
          onMouseEnter={e => e.currentTarget.style.background = "#b45309"}
          onMouseLeave={e => e.currentTarget.style.background = "#d97706"}
        >
          View Profile
        </button>
      </div>
    </div>
  );
}

export default function BrowseDogs() {
  const [allDogs, setAllDogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ breed: "All", size: "All", age: "All" });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [savedIds, setSavedIds] = useState(() => new Set(JSON.parse(localStorage.getItem("savedDogs") || "[]").map(d => d.dog_id)));
  const hasFetched = useRef(false);
  const { getDogs, dogsLoading: cacheLoading } = useDataCache();
  const [searchParams] = useSearchParams();
  const shelterIdParam = searchParams.get("shelter_id");

  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    hasFetched.current = false;
    loadDogs();
  }, [shelterIdParam]);

  useEffect(() => { setPage(1); }, [searchTerm, filters]);

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
    const handleSaveDog = (dog) => {
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]");
    const isSaved = savedIds.has(dog.dog_id);
    let updated;
    if (isSaved) {
      updated = savedDogs.filter(d => d.dog_id !== dog.dog_id);
      addToast(`${dog.name} removed from saved dogs.`, "success");
    } else {
      updated = [...savedDogs, dog];
      addToast(`${dog.name} saved!`, "success");
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
    return matchesSearch && matchesBreed && matchesSize && matchesAge;
  });

  const totalPages = Math.ceil(filteredDogs.length / PAGE_SIZE);
  const paginatedDogs = filteredDogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const uniqueBreeds = ["All", ...new Set(allDogs.map(d => d.breed).filter(Boolean)).values()].sort();

  const selectStyle = {
    padding: "10px 16px", borderRadius: "10px", border: "1px solid #e2d9d0",
    background: "white", color: "#2f241d", fontSize: "14px", fontWeight: "500",
    cursor: "pointer", outline: "none", fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 60px 0" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Browse Dogs</h1>
        <p style={{ margin: 0, color: "#78716c", fontSize: "15px" }}>
          {loading ? "Loading available dogs…" : `${filteredDogs.length} dog${filteredDogs.length !== 1 ? "s" : ""} available for adoption`}
        </p>
      </div>

      {/* Search + Filters */}
      <div style={{ background: "white", border: "1px solid #efdfd1", borderRadius: "20px", padding: "20px 24px", marginBottom: "28px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", pointerEvents: "none" }}>🔍</span>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name or breed…"
            style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: "10px", border: "1px solid #e2d9d0", fontSize: "14px", fontFamily: "'Inter', sans-serif", outline: "none", boxSizing: "border-box", color: "#2f241d" }}
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
        {(searchTerm || filters.breed !== "All" || filters.size !== "All" || filters.age !== "All") && (
          <button
            onClick={() => { setSearchTerm(""); setFilters({ breed: "All", size: "All", age: "All" }); }}
            style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #fca5a5", background: "#fff1f2", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
          {Array.from({ length: 8 }).map((_, i) => <DogCardSkeleton key={i} />)}
        </div>
      ) : paginatedDogs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 40px", background: "white", borderRadius: "20px", border: "1px solid #efdfd1" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔍</div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: "700", color: "#2f241d" }}>No dogs found</h2>
          <p style={{ margin: "0 0 24px 0", color: "#78716c" }}>Try adjusting your search or filters.</p>
          <button
            onClick={() => { setSearchTerm(""); setFilters({ breed: "All", size: "All", age: "All" }); }}
            style={{ padding: "12px 28px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer" }}
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
          {paginatedDogs.map(dog => (
            <DogCard key={dog.dog_id} dog={dog} isSaved={savedIds.has(dog.dog_id)} onSave={handleSaveDog} onNavigate={id => navigate(`/dogs/${id}`)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "40px" }}>
          <button
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
            disabled={page === 1}
            style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2d9d0", background: "white", color: page === 1 ? "#c4a98e" : "#2f241d", fontWeight: "600", fontSize: "14px", cursor: page === 1 ? "default" : "pointer" }}
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
            style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2d9d0", background: "white", color: page === totalPages ? "#c4a98e" : "#2f241d", fontWeight: "600", fontSize: "14px", cursor: page === totalPages ? "default" : "pointer" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
