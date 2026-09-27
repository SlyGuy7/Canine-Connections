// Legacy "Saved Dogs" page — an older version of the saved-dogs list that renders with the
// classic Sidebar component. The newer MyDogs.jsx (reachable from the Dashboard sidebar)
// supersedes this page but both read from the same "savedDogs" localStorage key.
import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useToast } from "../context/toast"
import Sidebar from "../components/Sidebar"

export default function SavedDogs() {
  const [savedDogs, setSavedDogs] = useState(() => JSON.parse(localStorage.getItem("savedDogs") || "[]"))
  const navigate = useNavigate()
  const { addToast } = useToast()

  const handleRemove = (dogId) => {
    const updated = savedDogs.filter((d) => d.dog_id !== dogId)
    setSavedDogs(updated)
    localStorage.setItem("savedDogs", JSON.stringify(updated))
    addToast("Dog removed from your saved list.", "success")
  }

  const handleApply = (dog) => {
    navigate("/apply", { state: { dogId: dog.dog_id, dogName: dog.name } })
  }

  const getPrimaryPhoto = (dog) => {
    if (!dog.photos) return null
    const photos = Array.isArray(dog.photos) ? dog.photos : dog.photos.split(",")
    return photos[0] || null
  }

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <header className="content-header" style={{ marginBottom: '32px' }}>
          <div>
            <h1>Saved Dogs</h1>
            <p className="page-subtitle">
              {savedDogs.length > 0
                ? `You have ${savedDogs.length} dog${savedDogs.length === 1 ? "" : "s"} saved. Ready to take the next step?`
                : "Dogs you save while browsing will appear here."}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/browse-dogs")}>
            Browse More Dogs
          </button>
        </header>

        {savedDogs.length === 0 ? (
          <div className="empty-state">
            <h2>No Saved Dogs Yet</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
              Browse available dogs and save the ones you love. They will appear here for easy access.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/browse-dogs")}>
              Start Browsing
            </button>
          </div>
        ) : (
          <div className="dog-grid">
            {savedDogs.map((dog) => {
              const photo = getPrimaryPhoto(dog)
              return (
                <div key={dog.dog_id} className="dog-card" style={{ background: 'var(--card-bg)', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>

                  <div style={{ height: '200px', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                    {photo ? (
                      <img
                        src={photo}
                        alt={dog.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ height: '200px', background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No photo available</span>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemove(dog.dog_id)}
                      style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'rgba(255,255,255,0.9)', border: 'none',
                        borderRadius: '99px', padding: '6px 12px',
                        cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                        color: '#ef4444'
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{dog.name}</h3>
                    <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontSize: '14px' }}><strong>Breed:</strong> {dog.breed}</p>
                    <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontSize: '14px' }}><strong>Size:</strong> {dog.size}</p>
                    <p style={{ margin: '4px 0 16px 0', color: 'var(--text-muted)', fontSize: '14px' }}><strong>Age:</strong> {dog.age_years} {dog.age_years == 1 ? "year" : "years"}</p>

                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: '14px' }}
                        onClick={() => navigate(`/dogs/${dog.dog_id}`)}
                      >
                        View Profile
                      </button>
                      <button
                        className="btn"
                        style={{ flex: 1, fontSize: '14px', background: 'var(--card-bg)', border: '1px solid #d8c1af', color: 'var(--text-primary)' }}
                        onClick={() => handleApply(dog)}
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}