import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import Sidebar from "../components/Sidebar"

export default function QuizResults() {
  const [dogs, setDogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const navigate = useNavigate()

  useEffect(() => {
    loadMatches()
  }, [])

  async function loadMatches() {
    setLoading(true)
    setError("")

    const matchedIds = JSON.parse(localStorage.getItem("quizMatchedDogIds") || "[]")

    if (matchedIds.length === 0) {
      setError("No quiz results found. Please take the quiz first.")
      setLoading(false)
      return
    }

    try {
      const dogResults = await Promise.all(
        matchedIds.map((dogId) =>
          sendMessage("request.dogs.get", { dog_id: dogId })
        )
      )
      const loaded = dogResults
        .filter((r) => r.success && r.dog)
        .map((r) => r.dog)
      setDogs(loaded)
      if (loaded.length === 0) {
        setError("We could not load your matched dogs. Please try the quiz again.")
      }
    } catch (err) {
      setError("Network error. Could not load your matches.")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDog = (dog) => {
    const savedDogs = JSON.parse(localStorage.getItem("savedDogs") || "[]")
    if (savedDogs.some((d) => d.dog_id === dog.dog_id)) return
    savedDogs.push(dog)
    localStorage.setItem("savedDogs", JSON.stringify(savedDogs))
  }

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <header className="content-header">
            <h1>Your Matches</h1>
          </header>
          <div className="dog-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '15px' }}>
                <div style={{ height: '200px', background: '#e0e0e0', borderRadius: '10px' }} />
                <div style={{ marginTop: '20px' }}>
                  <div style={{ height: '20px', width: '60%', background: '#e0e0e0', marginBottom: '10px' }} />
                  <div style={{ height: '16px', width: '40%', background: '#e0e0e0' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <div className="empty-state">
            <h2>{error}</h2>
            <button className="btn btn-primary" onClick={() => navigate("/quiz")}>Take the Quiz</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <header className="content-header" style={{ marginBottom: '30px' }}>
          <h1>Your Matches</h1>
          <p className="dashboard-subtitle">
            Based on your quiz answers, here are the dogs that are the best fit for you.
          </p>
        </header>

        {dogs.length === 0 ? (
          <div className="empty-state">
            <h2>No matches found</h2>
            <p style={{ color: '#6f5848', marginBottom: '24px' }}>
              Try adjusting your answers to find more dogs.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/quiz")}>Retake Quiz</button>
          </div>
        ) : (
          <>
            <div className="dog-grid">
              {dogs.map((dog) => {
                const primaryPhoto = dog.photos
                  ? (Array.isArray(dog.photos) ? dog.photos[0] : dog.photos.split(",")[0])
                  : null

                return (
                  <div key={dog.dog_id} className="dog-card" style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', border: '1px solid #efdfd1' }}>
                    <div style={{ height: '200px', overflow: 'hidden' }}>
                      {primaryPhoto ? (
                        <img
                          src={primaryPhoto}
                          alt={dog.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ height: '200px', background: '#fcedda', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '14px', color: '#6f5848' }}>No photo available</span>
                        </div>
                      )}
                    </div>
                    <div className="dog-card-content" style={{ padding: '20px' }}>
                      <h3 style={{ margin: '0 0 10px 0', color: '#2f241d' }}>{dog.name}</h3>
                      <p style={{ margin: '5px 0', color: '#6f5848' }}><strong>Breed:</strong> {dog.breed}</p>
                      <p style={{ margin: '5px 0', color: '#6f5848' }}><strong>Size:</strong> {dog.size}</p>
                      <p style={{ margin: '5px 0', color: '#6f5848' }}><strong>Age:</strong> {dog.age_years} {dog.age_years == 1 ? "year" : "years"}</p>
                      <p style={{ margin: '5px 0', color: '#6f5848' }}><strong>Energy:</strong> {dog.energy_level}</p>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                          onClick={() => navigate(`/dogs/${dog.dog_id}`)}
                        >
                          Details
                        </button>
                        <button
                          className="btn"
                          style={{ flex: 1, background: 'white', border: '1px solid #d8c1af', color: '#2f241d' }}
                          onClick={() => handleSaveDog(dog)}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '40px', textAlign: 'center' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid #d8c1af', color: '#6f5848' }} onClick={() => navigate("/quiz")}>
                Retake Quiz
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}