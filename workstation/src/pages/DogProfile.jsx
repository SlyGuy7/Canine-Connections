import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";


export default function DogProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const hasFetched = useRef(false);

  useEffect(() => {
    hasFetched.current = false;
  }, [id]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadDogDetails();
  }, [id]);

  async function loadDogDetails() {
    setLoading(true);
    try {
      const numericId = parseInt(id, 10);
      const result = await sendMessage("request.dogs.get", { dog_id: numericId });
      
      console.log("Backend Response:", result); 
      
      if (result?.success && result.dog) {
        setDog(result.dog);
        checkIfSaved(result.dog.dog_id);
      } else {
        addToast("Could not load dog details.", "error");
      }
    } catch (err) {
      addToast("Failed to connect to the database.", "error");
    } finally {
      setLoading(false);
    }
  }

  function checkIfSaved(dogId) {
    const saved = JSON.parse(localStorage.getItem("savedDogs") || "[]");
    setIsSaved(saved.some((d) => d.dog_id === dogId));
  }

  const handleSave = () => {
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]");
    if (isSaved) {
      const updated = savedDogs.filter((d) => d.dog_id !== dog.dog_id);
      localStorage.setItem("savedDogs", JSON.stringify(updated));
      setIsSaved(false);
      addToast(`${dog.name} removed from saved dogs.`, "info");
    } else {
      savedDogs.push(dog);
      localStorage.setItem("savedDogs", JSON.stringify(savedDogs));
      setIsSaved(true);
      addToast(`${dog.name} saved!`, "success");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <p>Loading dog profile...</p>
        </div>
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: "20px" }}>
            ← Back to Browse
          </button>
          <p>Dog not found.</p>
        </div>
      </div>
    );
  }

  const photos = Array.isArray(dog.photos)
    ? dog.photos.map((p) => p.photo_url).filter(Boolean)
    : dog.photos
    ? dog.photos.split(",").map((p) => p.trim()).filter(Boolean)
    : [];
  const currentPhoto = photos[activePhoto] || null;

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: "20px" }}>
          ← Back to Browse
        </button>

        <div className="panel" style={{ display: "flex", gap: "40px", padding: "40px", borderRadius: "30px" }}>
          <div style={{ flex: "1" }}>
            <div style={{ width: "100%", height: "400px", background: "#fcedda", borderRadius: "20px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "120px" }}>
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt={dog.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    const next = photos[activePhoto + 1];
                    if (next) {
                      setActivePhoto(activePhoto + 1);
                    } else {
                      e.currentTarget.style.display = "none";
                    }
                  }}
                />
              ) : "🐕"}
            </div>

            {photos.length > 1 && (
              <div style={{ display: "flex", gap: "10px", marginTop: "15px", overflowX: "auto" }}>
                {photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt={`${dog.name} ${i + 1}`}
                    onClick={() => setActivePhoto(i)}
                    style={{
                      width: "80px", height: "80px", objectFit: "cover", borderRadius: "10px",
                      cursor: "pointer", flexShrink: 0,
                      border: i === activePhoto ? "3px solid #d97706" : "3px solid transparent",
                      opacity: i === activePhoto ? 1 : 0.7,
                    }}
                  />
                ))}
              </div>
            )}

            {dog.energy_level && (
              <div className="trait-card" style={{ marginTop: "20px" }}>
                <span className="trait-label">Energy</span>
                <span className="trait-value">{dog.energy_level}</span>
              </div>
            )}
          </div>

          <div style={{ flex: "1.5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={{ fontSize: "48px", margin: "0 0 10px 0" }}>{dog.name}</h1>
                <p style={{ fontSize: "20px", color: "#d97706", fontWeight: "bold" }}>{dog.breed}</p>
              </div>
              <button
                onClick={handleSave}
                style={{ background: "none", border: "1px solid #efdfd1", padding: "10px 20px", borderRadius: "12px", cursor: "pointer", fontSize: "18px" }}
              >
                {isSaved ? "❤️ Saved" : "🤍 Save"}
              </button>
            </div>

            <hr style={{ margin: "30px 0", border: "none", borderTop: "1px solid #efdfd1" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
              <div>
                <p style={{ color: "#6f5848", marginBottom: "5px" }}>Age</p>
                <p style={{ fontWeight: "bold", fontSize: "18px" }}>{dog.age_years} {dog.age_years == 1 ? "year" : "years"}</p>
              </div>
              <div>
                <p style={{ color: "#6f5848", marginBottom: "5px" }}>Size</p>
                <p style={{ fontWeight: "bold", fontSize: "18px" }}>{dog.size}</p>
              </div>
              <div>
                <p style={{ color: "#6f5848", marginBottom: "5px" }}>Gender</p>
                <p style={{ fontWeight: "bold", fontSize: "18px" }}>{dog.gender}</p>
              </div>
              <div>
                <p style={{ color: "#6f5848", marginBottom: "5px" }}>Status</p>
                <p style={{ fontWeight: "bold", fontSize: "18px", color: "#16a34a" }}>{dog.status}</p>
              </div>
              {dog.good_with_kids !== null && (
                <div>
                  <p style={{ color: "#6f5848", marginBottom: "5px" }}>Good with Kids</p>
                  <p style={{ fontWeight: "bold", fontSize: "18px" }}>{dog.good_with_kids == "1" ? "Yes" : "No"}</p>
                </div>
              )}
              {dog.good_with_dogs !== null && (
                <div>
                  <p style={{ color: "#6f5848", marginBottom: "5px" }}>Good with Dogs</p>
                  <p style={{ fontWeight: "bold", fontSize: "18px" }}>{dog.good_with_dogs == "1" ? "Yes" : "No"}</p>
                </div>
              )}
              {dog.good_with_cats !== null && (
                <div>
                  <p style={{ color: "#6f5848", marginBottom: "5px" }}>Good with Cats</p>
                  <p style={{ fontWeight: "bold", fontSize: "18px" }}>{dog.good_with_cats == "1" ? "Yes" : "No"}</p>
                </div>
              )}
              {dog.apartment_friendly !== null && (
                <div>
                  <p style={{ color: "#6f5848", marginBottom: "5px" }}>Apartment Friendly</p>
                  <p style={{ fontWeight: "bold", fontSize: "18px" }}>{dog.apartment_friendly == "1" ? "Yes" : "No"}</p>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "40px" }}>
              <h3 style={{ marginBottom: "15px" }}>About {dog.name}</h3>
              <p style={{ lineHeight: "1.6", color: "#2f241d", fontSize: "17px" }}>
                {dog.description || "No description provided. Contact the shelter for more details."}
              </p>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", padding: "20px", fontSize: "18px" }}
              onClick={() => navigate("/apply", { state: { dogId: dog.dog_id, dogName: dog.name } })}
            >
              Start Adoption Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}