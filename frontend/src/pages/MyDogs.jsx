// "Your Vault" — displays the dogs the user has saved while browsing. Fetches the authoritative
// list from the backend (request.saved_dogs.list) on mount and syncs localStorage as a cache.
// Removing a dog does an optimistic local update first, then fires request.saved_dogs.remove
// to keep the database in sync. A shimmer skeleton is shown while the fetch is in flight.
import React, { useEffect, useRef, useState, useEffectEvent } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/toast";

const SIZE_LABELS = { small: "Small", medium: "Medium", large: "Large", extra_large: "XL" };
const SIZE_COLORS = {
  small:       { bg: "#eff6ff", color: "#1d4ed8" },
  medium:      { bg: "#f0fdf4", color: "#15803d" },
  large:       { bg: "#fefce8", color: "#a16207" },
  extra_large: { bg: "#fdf4ff", color: "#7e22ce" },
};

function getAgeLabel(ageYears) {
  const age = Number(ageYears) || 0;
  if (age <= 1) return "Puppy";
  if (age <= 3) return "Young";
  if (age <= 7) return "Adult";
  return "Senior";
}

export default function MyDogs() {
  const [savedDogs, setSavedDogs] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const hasFetched = useRef(false);

  async function loadSavedDogs() {
    const userId = localStorage.getItem("userId");
    if (!userId) { setLoading(false); return; }
    try {
      const result = await sendMessage("request.saved_dogs.list", { user_id: parseInt(userId) });
      if (result?.success && Array.isArray(result.dogs)) {
        // Build the photo fields the card UI expects (same shape as dogs from BrowseDogs).
        const dogs = result.dogs.map(dog => ({
          ...dog,
          photoList: dog.photos ? dog.photos.split(",").map(p => p.trim()).filter(Boolean) : [],
          image: dog.photos ? dog.photos.split(",")[0].trim() : null,
        }));
        setSavedDogs(dogs);
        localStorage.setItem("savedDogs", JSON.stringify(dogs));
      } else {
        addToast("Could not load saved dogs.", "error");
      }
    } catch {
      addToast("Could not connect to server.", "error");
    } finally {
      setLoading(false);
    }
  }

  // hasFetched prevents a double-fetch when React StrictMode mounts the component twice in dev.
  // Effect event: always calls the latest version without re-running the effect.
  const onMountLoad = useEffectEvent(() => loadSavedDogs());
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    onMountLoad();
  }, []);

  function handleRemoveDog(dog) {
    const userId = localStorage.getItem("userId");
    setRemovingId(dog.dog_id);
    // Optimistic update: fade out and remove locally after 250ms animation, then sync to backend.
    setTimeout(() => {
      const updated = savedDogs.filter(d => d.dog_id !== dog.dog_id);
      setSavedDogs(updated);
      localStorage.setItem("savedDogs", JSON.stringify(updated));
      setRemovingId(null);
      addToast(`${dog.name} removed from your Vault`, "success");
      if (userId) sendMessage("request.saved_dogs.remove", { user_id: parseInt(userId), dog_id: dog.dog_id })
        .then(r => { if (!r?.success) addToast("Could not sync removal.", "error"); })
        .catch(() => addToast("Could not connect to server.", "error"));
    }, 250);
  }

  if (loading) {
    return (
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 60px 0" }}>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Your Vault</h1>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1" }}>
              <div style={{ height: "220px", background: "linear-gradient(90deg,#f3e8de 25%,#faf0e8 50%,#f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ height: "18px", width: "50%", borderRadius: "8px", background: "linear-gradient(90deg,#f3e8de 25%,#faf0e8 50%,#f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                <div style={{ height: "14px", width: "70%", borderRadius: "8px", background: "linear-gradient(90deg,#f3e8de 25%,#faf0e8 50%,#f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 60px 0" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Your Vault</h1>
        <p style={{ margin: 0, color: "#78716c", fontSize: "15px" }}>
          {savedDogs.length === 0
            ? "Dogs you save while browsing will appear here."
            : `${savedDogs.length} dog${savedDogs.length !== 1 ? "s" : ""} saved for adoption`}
        </p>
      </div>

      {savedDogs.length === 0 ? (
        /* Empty state */
        <div style={{ textAlign: "center", padding: "100px 40px", background: "white", borderRadius: "24px", border: "1px solid #efdfd1" }}>
          <div style={{ fontSize: "72px", marginBottom: "20px" }}>🐾</div>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "800", color: "#2f241d" }}>Your pack is empty</h2>
          <p style={{ margin: "0 0 32px 0", color: "#78716c", fontSize: "16px", maxWidth: "360px", display: "inline-block" }}>
            Find your new best friend by browsing our available dogs and tap the heart to save them.
          </p>
          <br />
          <button
            onClick={() => navigate("/browse-dogs")}
            style={{ padding: "14px 36px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 16px rgba(217,119,6,0.3)" }}
          >
            Browse Dogs
          </button>
        </div>
      ) : (
        <>
          {/* Stats strip */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "28px", flexWrap: "wrap" }}>
            {["Puppy", "Young", "Adult", "Senior"].map(label => {
              const count = savedDogs.filter(d => getAgeLabel(d.age_years) === label).length;
              return count > 0 ? (
                <div key={label} style={{ padding: "10px 20px", borderRadius: "12px", background: "white", border: "1px solid #efdfd1", fontSize: "14px", color: "#78716c", fontWeight: "500" }}>
                  <span style={{ fontWeight: "700", color: "#2f241d" }}>{count}</span> {label}{count !== 1 ? (label === "Puppy" ? "ies" : "s") : ""}
                </div>
              ) : null;
            })}
          </div>

          {/* Dog grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
            {savedDogs.map(dog => {
              const sizeKey = (dog.size || "").toLowerCase().replace(" ", "_");
              const sizeStyle = SIZE_COLORS[sizeKey] || { bg: "#f3f4f6", color: "#374151" };
              const sizeLabel = SIZE_LABELS[sizeKey] || dog.size || "—";
              const ageLabel = getAgeLabel(dog.age_years);
              const isRemoving = removingId === dog.dog_id;

              return (
                <div
                  key={dog.dog_id}
                  style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1", display: "flex", flexDirection: "column", transition: "transform 0.2s ease, box-shadow 0.2s ease, opacity 0.25s ease", opacity: isRemoving ? 0 : 1, transform: isRemoving ? "scale(0.96)" : undefined }}
                  onMouseEnter={e => { if (!isRemoving) { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.10)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* Photo */}
                  <div style={{ height: "220px", background: "#fcedda", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                    {dog.image ? (
                      <img
                        src={dog.image}
                        alt={dog.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.innerHTML = '<span style="font-size:64px">🐕</span>'; }}
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
                      onClick={() => handleRemoveDog(dog)}
                      title="Remove from Vault"
                      style={{ position: "absolute", top: "10px", right: "10px", width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.9)", color: "#ef4444", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", transition: "all 0.2s ease" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.9)"; e.currentTarget.style.color = "#ef4444"; }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Info */}
                  <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "700", color: "#2f241d" }}>{dog.name || "Unknown"}</h3>
                    <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#78716c" }}>{dog.breed || "Mixed breed"}</p>
                    <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#a8a29e" }}>
                      {Number(dog.age_years) || 0} {Number(dog.age_years) === 1 ? "yr" : "yrs"} old
                      {dog.shelter_name ? ` · ${dog.shelter_name}` : ""}
                    </p>

                    <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                      <button
                        onClick={() => navigate(`/dogs/${dog.dog_id}`)}
                        style={{ flex: 2, padding: "11px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", transition: "background 0.15s ease" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#b45309"}
                        onMouseLeave={e => e.currentTarget.style.background = "#d97706"}
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => navigate("/apply", { state: { dogId: dog.dog_id, dogName: dog.name } })}
                        style={{ flex: 2, padding: "11px", borderRadius: "10px", border: "1px solid #e2d9d0", background: "white", color: "#2f241d", fontWeight: "600", fontSize: "14px", cursor: "pointer", transition: "background 0.15s ease" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fdf6ef"}
                        onMouseLeave={e => e.currentTarget.style.background = "white"}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Browse more CTA */}
          <div style={{ marginTop: "40px", textAlign: "center" }}>
            <button
              onClick={() => navigate("/browse-dogs")}
              style={{ padding: "12px 28px", borderRadius: "12px", border: "1px solid #e2d9d0", background: "white", color: "#2f241d", fontWeight: "600", fontSize: "15px", cursor: "pointer" }}
            >
              Browse More Dogs
            </button>
          </div>
        </>
      )}
    </div>
  );
}
