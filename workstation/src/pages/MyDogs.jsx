import React, { useEffect, useState } from "react";
import "../index.css";

export default function MyDogs() {
  const [savedDogs, setSavedDogs] = useState([]);

  useEffect(() => {
    loadSavedDogs();
  }, []);

  function loadSavedDogs() {
    const dogs = JSON.parse(localStorage.getItem("savedDogs")) || [];
    setSavedDogs(dogs);
  }

  function handleRemoveDog(id) {
    const updated = savedDogs.filter((dog) => dog.id !== id);
    localStorage.setItem("savedDogs", JSON.stringify(updated));
    setSavedDogs(updated);
  }

  return (
    <div className="page-container">
      <h1>My Saved Dogs</h1>
      <p className="page-subtitle">
        Dogs you have saved for adoption.
      </p>

      {savedDogs.length === 0 ? (
        <p>No saved dogs yet.</p>
      ) : (
        <div className="dog-grid">
          {savedDogs.map((dog) => (
            <div key={dog.id} className="dog-card">
              <div className="dog-image-placeholder">🐶</div>

              <h3>{dog.name || "Unknown Dog"}</h3>

              <p>
                {dog.breed ||
                  dog.breeds?.[0]?.name ||
                  "Unknown Breed"}
              </p>

              <p>
                {dog.age ||
                  dog.life_span ||
                  "Age not available"}
              </p>

              <div className="dog-card-actions">
                <button className="primary-btn">View</button>
                <button
                  className="secondary-btn"
                  onClick={() => handleRemoveDog(dog.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}