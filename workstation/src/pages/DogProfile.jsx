import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import { useToast } from "../context/ToastContext"

export default function DogProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [dog, setDog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
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

    try {
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
    } finally {
      setLoading(false)
    }
  }

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
        </div>
      </div>
    )
  }

  if (error || !dog) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h2>{error}</h2>
          <button className="btn btn-primary" onClick={() => navigate("/browse-dogs")}>Return to Browse</button>
        </div>
      </div>
    )
  }

  const primaryPhoto = getPrimaryPhoto()

  return (
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
            </div>
            <div className="trait-card">
              <span className="trait-label">Energy</span>
              <span className="trait-value">{dog.energy_level}</span>
            </div>
          </div>

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
          </div>
        </div>
      </div>
    </div>
  )
}
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
   
            