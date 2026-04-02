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
      { id: 1, name: "Buddy", breed: "Labrador Mix", size: "Large", age: 2, gender: "Male", image: "", description: "Buddy is a friendly and playful dog who loves people, long walks, and tennis balls. He does well with children and other pets.", health: "Vaccinated, Neutered", temperament: "Playful, Loyal" },
      { id: 2, name: "Luna", breed: "Golden Retriever", size: "Large", age: 1, gender: "Female", image: "", description: "Luna is a sweet and gentle pup. She is currently learning basic commands and loves belly rubs.", health: "Vaccinated, Spayed", temperament: "Gentle, Smart" },
      { id: 3, name: "Max", breed: "Beagle", size: "Medium", age: 4, gender: "Male", image: "", description: "Max is an energetic explorer. He needs a secure yard and loves to follow his nose.", health: "Vaccinated, Neutered", temperament: "Curious, Active" },
      { id: 4, name: "Bella", breed: "Pug", size: "Small", age: 3, gender: "Female", image: "", description: "Bella is a couch potato who enjoys cuddling and short walks. Perfect for apartment living.", health: "Vaccinated, Spayed", temperament: "Calm, Affectionate" },
      { id: 5, name: "Charlie", breed: "Poodle", size: "Medium", age: 5, gender: "Male", image: "", description: "Charlie is highly intelligent and hypoallergenic. He knows several tricks and loves agility training.", health: "Vaccinated, Neutered", temperament: "Intelligent, Alert" },
      { id: 6, name: "Daisy", breed: "Chihuahua", size: "Small", age: 1, gender: "Female", image: "", description: "Daisy is tiny but has a big personality. She prefers to be the only pet in the household.", health: "Vaccinated, Spayed", temperament: "Protective, Sassy" }
    ]

    try {
      const result = await sendMessage("request.dogs.get", {})
      let foundDog = null
      if (result.success && result.dogs && result.dogs.length > 0) {
        foundDog = result.dogs.find((d) => d.id.toString() === id)
      } else {
        foundDog = fallbackDogs.find((d) => d.id.toString() === id)
      }

      if (foundDog) {
        setDog({
          ...foundDog,
          gender: foundDog.gender || "Unknown",
          description: foundDog.description || `Meet ${foundDog.name}. This beautiful ${foundDog.breed} is looking for a loving home.`,
          health: foundDog.health || "Up to date on vaccinations",
          temperament: foundDog.temperament || "Friendly"
        })
      } else {
        setError("Dog profile not found.")
      }
    } catch (err) {
      setError("Network error. Profile unavailable.")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDog = () => {
    if (!dog) return
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]")
    if (savedDogs.some((d) => d.id === dog.id)) {
      addToast(`${dog.name} is already in your Vault!`, "error")
      return
    }
    savedDogs.push(dog)
    localStorage.setItem("savedDogs", JSON.stringify(savedDogs))
    addToast(`${dog.name} saved to your Vault!`, "success")
  }

  const handleApply = () => {
    localStorage.setItem("pendingApplicationDogId", dog.id)
    navigate("/apply")
  }

  if (loading) {
    return (
      <div className="page-container">
        <button className="btn" onClick={() => navigate(-1)} style={{ background: 'transparent', padding: '0 0 24px 0' }}>← Back</button>
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

  return (
    <div className="page-container">
      <button 
        className="btn" 
        style={{ background: 'transparent', color: 'var(--text-light)', padding: '0 0 24px 0', fontWeight: '600' }} 
        onClick={() => navigate(-1)}
      >
        ← Back to Search
      </button>

      <div className="profile-grid">
        <div className="profile-image-section">
          {dog.image ? (
            <img src={dog.image} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '120px' }}>🐕</span>
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
              <span className="trait-value">{dog.age} {dog.age === 1 ? "yr" : "yrs"}</span>
            </div>
            <div className="trait-card">
              <span className="trait-label">Gender</span>
              <span className="trait-value">{dog.gender}</span>
            </div>
            <div className="trait-card">
              <span className="trait-label">Size</span>
              <span className="trait-value">{dog.size}</span>
            </div>
          </div>

          <div className="form-section">
            <h2 style={{ fontSize: '20px', borderBottom: 'none' }}>About {dog.name}</h2>
            <p className="page-subtitle" style={{ color: 'var(--text-main)', textAlign: 'left' }}>
              {dog.description}
            </p>
          </div>

          <div className="form-section">
            <h2 style={{ fontSize: '20px', borderBottom: 'none' }}>Health & Temperament</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-main)' }}>
              <li style={{ marginBottom: '8px' }}>• Health: {dog.health}</li>
              <li>• Temperament: {dog.temperament}</li>
            </ul>
          </div>

          <div className="profile-actions">
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleApply}>
              Apply to Adopt
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleSaveDog}>
              ❤️ Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}