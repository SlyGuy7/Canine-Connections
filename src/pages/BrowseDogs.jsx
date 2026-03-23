import React, { useEffect, useState } from "react";
import "../index.css";
import { sendMessage } from "../services/messaging";

export default function BrowseDogs() {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedDogIds, setSavedDogIds] = useState([]);

  useEffect(() => {
    loadDogs();

    const savedDogs = JSON.parse(localStorage.getItem("savedDogs")) || [];
    setSavedDogIds(savedDogs.map((dog) => dog.id));
  }, []);

  async function loadDogs() {
    const fallbackDogs = [
      {
        id: 1,
        name: "Buddy",
        breed: "Labrador Mix",
        age: "2 years",
      },
      {
        id: 2,
        name: "Luna",
        breed: "Husky Mix",
        age: "1 year",
      },
      {
        id: 3,
        name: "Max",
        breed: "Golden Retriever",
        age: "3 years",
      },
    ];

    try {
      const result = await sendMessage("request.dogs.get", {});

      console.log("DOG API RESULT:", result);

      if (result.success && result.dogs && result.dogs.length > 0) {
        setDogs(result.dogs);
      } else {
        setDogs(fallbackDogs);
      }
    } catch (err) {
      console.log("Failed to load dogs", err);
      setDogs(fallbackDogs);
    } finally {
      setLoading(false);
    }
  }

  function handleSaveDog(dog) {
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs")) || [];
    const alreadySaved = savedDogs.some((savedDog) => savedDog.id === dog.id);

    if (alreadySaved) return;

    const updatedSavedDogs = [...savedDogs, dog];
    localStorage.setItem("savedDogs", JSON.stringify(updatedSavedDogs));
    setSavedDogIds(updatedSavedDogs.map((savedDog) => savedDog.id));
  }

  return (
    <div className="page-container">
      <h1>Browse Dogs</h1>
      <p className="page-subtitle">
        Browse adoptable dogs from Canine Connections.
      </p>

      {loading ? (
        <p>Loading dogs...</p>
      ) : dogs.length === 0 ? (
        <p>No dogs found.</p>
      ) : (
        <div className="dog-grid">
          {dogs.map((dog) => (
            <div key={dog.id} className="dog-card">
              <div className="dog-image-placeholder">🐶</div>

              <h3>{dog.name || "Unknown Dog"}</h3>

              <p>
                {dog.breed || dog.breeds?.[0]?.name || "Unknown Breed"}
              </p>

              <p>
                {dog.age || dog.life_span || "Age not available"}
              </p>

              <div className="dog-card-actions">
                <button className="primary-btn">View</button>
                <button
                  className="secondary-btn"
                  onClick={() => handleSaveDog(dog)}
                  disabled={savedDogIds.includes(dog.id)}
                >
                  {savedDogIds.includes(dog.id) ? "Saved" : "Save"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}