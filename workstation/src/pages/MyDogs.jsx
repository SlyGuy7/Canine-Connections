import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";

export default function MyDogs() {
  const [savedDogs, setSavedDogs] = useState([]);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    const dogs = JSON.parse(localStorage.getItem("savedDogs")) || [];
    setSavedDogs(dogs);
  }, []);

  function handleRemoveDog(dogId) {
    const updated = savedDogs.filter((dog) => dog.dog_id !== dogId);
    localStorage.setItem("savedDogs", JSON.stringify(updated));
    setSavedDogs(updated);
    addToast("Removed from Vault", "success");
  }

  return (
    <div className="page-container">
      <header className="content-header">
        <div>
          <h1>Your Vault</h1>
          <p className="page-subtitle">Review the companions you have saved for adoption.</p>
        </div>
      </header>

      {savedDogs.length === 0 ? (
        <div className="empty-state-container">
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🐾</span>
          <h2 className="form-label" style={{ fontSize: '24px' }}>Your pack is empty.</h2>
          <p className="page-subtitle" style={{ marginBottom: '24px' }}>
            Find your new best friend by browsing our available dogs.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/browse-dogs")}>
            Browse Dogs
          </button>
        </div>
      ) : (
        <div className="dog-grid">
          {savedDogs.map((dog) => (
            <article key={dog.dog_id} className="dog-card">
              <div className="dog-card-image">
                {dog.image ? (
                  <img src={dog.image} alt={dog.name} />
                ) : (
                  <span style={{ fontSize: '48px' }}>🐕</span>
                )}
              </div>

              <div className="dog-card-body">
                <h3 className="dog-card-name">{dog.name || "Unknown"}</h3>
                
                <div className="dog-card-stats">
                  <div className="dog-card-stat"><strong>Breed:</strong> {dog.breed || "Mixed"}</div>
                  <div className="dog-card-stat"><strong>Age:</strong> {dog.age_years || "N/A"}</div>
                  <div className="dog-card-stat"><strong>Size:</strong> {dog.size || "Unknown"}</div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 2 }}
                    onClick={() => navigate(`/dogs/${dog.dog_id}`)}
                  >
                    Profile
                  </button>
                  <button
                    className="btn"
                    style={{ flex: 1, background: '#fff1f2', color: '#e11d48' }}
                    onClick={() => handleRemoveDog(dog.dog_id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}