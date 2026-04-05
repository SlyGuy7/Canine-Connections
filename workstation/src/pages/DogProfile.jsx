import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";
import Sidebar from "../components/Sidebar";

export default function DogProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
<<<<<<< HEAD
    loadDogProfile()
  }, [id])

  async function loadDogProfile() {
    setLoading(true)
    setError("")

    const fallbackDogs = [
      { dog_id: 1, name: "Buddy", breed: "Labrador Mix", size: "large", age_years: 2, gender: "male", photos: null, description: "Buddy is a friendly and playful dog who loves people, long walks, and tennis balls.", is_vaccinated: 1, is_spayed_neutered: 1, energy_level: "high", good_with_kids: 1, good_with_dogs: 1, good_with_cats: 0, apartment_friendly: 0 },
      { dog_id: 2, name: "Luna", breed: "Golden Retriever", size: "large", age_years: 1, gender: "female", photos: null, description: "Luna is a sweet and gentle pup. She loves belly rubs.", is_vaccinated: 1, is_spayed_neutered: 1, energy_level: "medium", good_with_kids: 1, good_with_dogs: 1, good_with_cats: 1, apartment_friendly: 0 },
      { dog_id: 3, name: "Max", breed: "Beagle", size: "medium", age_years: 4, gender: "male", photos: null, description: "Max is an energetic explorer who loves to follow his nose.", is_vaccinated: 1, is_spayed_neutered: 1, energy_level: "high", good_with_kids: 1, good_with_dogs: 0, good_with_cats: 0, apartment_friendly: 0 },
      { dog_id: 4, name: "Bella", breed: "Pug", size: "small", age_years: 3, gender: "female", photos: null, description: "Bella is a couch potato who enjoys cuddling and short walks.", is_vaccinated: 1, is_spayed_neutered: 1, energy_level: "low", good_with_kids: 1, good_with_dogs: 1, good_with_cats: 1, apartment_friendly: 1 },
      { dog_id: 5, name: "Charlie", breed: "Poodle", size: "medium", age_years: 5, gender: "male", photos: null, description: "Charlie is highly intelligent and knows several tricks.", is_vaccinated: 1, is_spayed_neutered: 1, energy_level: "medium", good_with_kids: 1, good_with_dogs: 1, good_with_cats: 1, apartment_friendly: 1 },
      { dog_id: 6, name: "Daisy", breed: "Chihuahua", size: "small", age_years: 1, gender: "female", photos: null, description: "Daisy is tiny but has a big personality.", is_vaccinated: 1, is_spayed_neutered: 1, energy_level: "medium", good_with_kids: 0, good_with_dogs: 0, good_with_cats: 0, apartment_friendly: 1 }
    ]
=======
    loadDogDetails();
  }, [id]);
>>>>>>> 037c91f (Frontend Additions)

  async function loadDogDetails() {
    setLoading(true);
    try {
<<<<<<< HEAD
      const result = await sendMessage("request.dogs.get", { dog_id: parseInt(id) })
      if (result.success && result.dog) {
        setDog(result.dog)
      } else {
        const found = fallbackDogs.find((d) => d.dog_id.toString() === id)
        if (found) {
          setDog(found)
        } else {
          setError("Dog profile not found.")
        }
      }
    } catch (err) {
      const found = fallbackDogs.find((d) => d.dog_id.toString() === id)
      if (found) {
        setDog(found)
      } else {
        setError("Network error. Profile unavailable.")
      }
=======
      // Attempt to get real dog data via RabbitMQ
      const result = await sendMessage("request.dogs.get", { dogId: id });
      
      if (result && Array.isArray(result.dogs)) {
        const foundDog = result.dogs.find((d) => d.id === parseInt(id));
        if (foundDog) {
          setDog(foundDog);
          checkIfSaved(foundDog.id);
        } else {
          handleFallback();
        }
      } else {
        handleFallback();
      }
    } catch (err) {
      console.error("Failed to fetch dog details, using fallback", err);
      handleFallback();
>>>>>>> 037c91f (Frontend Additions)
    } finally {
      setLoading(false);
    }
  }

<<<<<<< HEAD
  const handleSaveDog = () => {
    if (!dog) return
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]")
    if (savedDogs.some((d) => d.dog_id === dog.dog_id)) {
      addToast(`${dog.name} is already in your Vault!`, "error")
      return
    }
    savedDogs.push(dog)
    localStorage.setItem("savedDogs", JSON.stringify(savedDogs))
    addToast(`${dog.name} saved to your Vault!`, "success")
  }

  const handleApply = () => {
    localStorage.setItem("pendingApplicationDogId", dog.dog_id)
    localStorage.setItem("pendingApplicationDogName", dog.name)
    navigate("/apply")
  }

  const getPrimaryPhoto = () => {
    if (!dog.photos) return null
    const photos = Array.isArray(dog.photos) ? dog.photos : dog.photos.split(",")
    return photos[0] || null
  }

  const yesNo = (val) => (val == 1 ? "Yes" : "No")

  if (loading) {
    return (
      <div className="page-container">
        <button className="btn" onClick={() => navigate(-1)} style={{ background: 'transparent', padding: '0 0 24px 0' }}>Back</button>
        <div className="profile-grid">
          <div className="skeleton-image" style={{ height: '100%' }} />
          <div className="profile-details">
            <div className="skeleton-line" style={{ height: '48px', width: '60%' }} />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" style={{ width: '40%' }} />
          </div>
=======
  function handleFallback() {
    // This ensures the page works even during backend timeouts
    const fallbackDogs = [
      { id: 1, name: "Buddy", breed: "Labrador Mix", size: "Large", age: 2, description: "Buddy is a friendly and playful dog who loves people and long walks.", shelter: "Happy Tails Rescue" },
      { id: 2, name: "Luna", breed: "Golden Retriever", size: "Large", age: 1, description: "Luna is full of energy and looking for an active family.", shelter: "Safe Haven Dogs" },
      { id: 3, name: "Max", breed: "Beagle", size: "Medium", age: 4, description: "Max is a quiet companion who enjoys naps and treats.", shelter: "Paws & Homes" }
    ];
    const found = fallbackDogs.find((d) => d.id === parseInt(id));
    setDog(found || fallbackDogs[0]);
    if (found) checkIfSaved(found.id);
  }

  function checkIfSaved(dogId) {
    const saved = JSON.parse(localStorage.getItem("savedDogs") || "[]");
    setIsSaved(saved.some((d) => d.id === dogId));
  }

  const handleSave = () => {
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]");
    
    if (isSaved) {
      const updated = savedDogs.filter((d) => d.id !== dog.id);
      localStorage.setItem("savedDogs", JSON.stringify(updated));
      setIsSaved(false);
      addToast(`${dog.name} removed from favorites`, "info");
    } else {
      savedDogs.push(dog);
      localStorage.setItem("savedDogs", JSON.stringify(savedDogs));
      setIsSaved(true);
      addToast(`${dog.name} saved to your Vault!`, "success");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <p>Loading dog profile...</p>
>>>>>>> 037c91f (Frontend Additions)
        </div>
      </div>
    );
  }

  if (!dog) return null;

  const primaryPhoto = getPrimaryPhoto()

  return (
<<<<<<< HEAD
    <div className="page-container">
      <button
        className="btn"
        style={{ background: 'transparent', color: 'var(--text-light)', padding: '0 0 24px 0', fontWeight: '600' }}
        onClick={() => navigate(-1)}
      >
        Back to Search
      </button>

      <div className="profile-grid">
        <div className="profile-image-section">
          {primaryPhoto ? (
            <img src={primaryPhoto} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#fcedda', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6f5848' }}>No photo available</span>
            </div>
          )}
        </div>

        <div className="profile-details">
          <div className="content-header" style={{ marginBottom: '0' }}>
            <h1 style={{ fontSize: '42px', margin: 0 }}>{dog.name}</h1>
            <span className="status-badge review" style={{ fontSize: '14px' }}>{dog.breed}</span>
          </div>

          <div className="traits-container">
            <div className="trait-card">
              <span className="trait-label">Age</span>
              <span className="trait-value">{dog.age_years} {dog.age_years == 1 ? "yr" : "yrs"}</span>
            </div>
            <div className="trait-card">
              <span className="trait-label">Gender</span>
              <span className="trait-value">{dog.gender}</span>
            </div>
            <div className="trait-card">
              <span className="trait-label">Size</span>
              <span className="trait-value">{dog.size}</span>
=======
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
          ← Back to Browse
        </button>

        <div className="panel" style={{ display: 'flex', gap: '40px', padding: '40px', borderRadius: '30px' }}>
          <div style={{ flex: '1' }}>
            <div style={{ 
              width: '100%', 
              height: '400px', 
              background: '#fcedda', 
              borderRadius: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '120px',
              overflow: 'hidden'
            }}>
              {dog.image ? <img src={dog.image} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : "🐕"}
>>>>>>> 037c91f (Frontend Additions)
            </div>
            <div className="trait-card">
              <span className="trait-label">Energy</span>
              <span className="trait-value">{dog.energy_level}</span>
            </div>
          </div>

<<<<<<< HEAD
          <div className="form-section">
            <h2 style={{ fontSize: '20px', borderBottom: 'none' }}>About {dog.name}</h2>
            <p className="page-subtitle" style={{ color: 'var(--text-main)', textAlign: 'left' }}>
              {dog.description || `Meet ${dog.name}. This ${dog.breed} is looking for a loving home.`}
            </p>
          </div>

          <div className="form-section">
            <h2 style={{ fontSize: '20px', borderBottom: 'none' }}>Health</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-main)' }}>
              <li style={{ marginBottom: '8px' }}>Vaccinated: {yesNo(dog.is_vaccinated)}</li>
              <li>Spayed / Neutered: {yesNo(dog.is_spayed_neutered)}</li>
            </ul>
          </div>

          <div className="form-section">
            <h2 style={{ fontSize: '20px', borderBottom: 'none' }}>Compatibility</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-main)' }}>
              <li style={{ marginBottom: '8px' }}>Good with kids: {yesNo(dog.good_with_kids)}</li>
              <li style={{ marginBottom: '8px' }}>Good with dogs: {yesNo(dog.good_with_dogs)}</li>
              <li style={{ marginBottom: '8px' }}>Good with cats: {yesNo(dog.good_with_cats)}</li>
              <li>Apartment friendly: {yesNo(dog.apartment_friendly)}</li>
            </ul>
          </div>

          <div className="profile-actions">
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleApply}>
              Apply to Adopt
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleSaveDog}>
                 ❤️️ Save
            </button>
=======
          <div style={{ flex: '1.5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '48px', margin: '0 0 10px 0' }}>{dog.name}</h1>
                <p style={{ fontSize: '20px', color: '#d97706', fontWeight: 'bold' }}>{dog.breed}</p>
              </div>
              <button 
                onClick={handleSave}
                style={{ 
                  background: 'none', 
                  border: '1px solid #efdfd1', 
                  padding: '10px 20px', 
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                {isSaved ? "❤️ Saved" : "🤍 Save"}
              </button>
            </div>

            <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #efdfd1' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div>
                <p style={{ color: '#6f5848', marginBottom: '5px' }}>Age</p>
                <p style={{ fontWeight: 'bold', fontSize: '18px' }}>{dog.age} Years</p>
              </div>
              <div>
                <p style={{ color: '#6f5848', marginBottom: '5px' }}>Size</p>
                <p style={{ fontWeight: 'bold', fontSize: '18px' }}>{dog.size}</p>
              </div>
              <div>
                <p style={{ color: '#6f5848', marginBottom: '5px' }}>Shelter</p>
                <p style={{ fontWeight: 'bold', fontSize: '18px' }}>{dog.shelter || "Community Partner"}</p>
              </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ marginBottom: '15px' }}>About {dog.name}</h3>
              <p style={{ lineHeight: '1.6', color: '#2f241d', fontSize: '17px' }}>
                {dog.description || "No description provided. Contact the shelter for more details about this companion."}
              </p>
            </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '20px', fontSize: '18px' }}
            onClick={() => navigate('/apply', { state: { dogId: dog.id, dogName: dog.name } })}
            >
            Start Adoption Application
          </button>
>>>>>>> 037c91f (Frontend Additions)
          </div>
        </div>
      </div>
    </div>
<<<<<<< HEAD
  )
}
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
   
            
=======
  );
}
>>>>>>> 037c91f (Frontend Additions)
