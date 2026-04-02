import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useToast } from "../context/ToastContext"

export default function ApplicationForm() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [targetDog, setTargetDog] = useState(null)
  
  const [formData, setFormData] = useState({
    firstName: localStorage.getItem("userFirstName") || "",
    lastName: localStorage.getItem("userLastName") || "",
    email: localStorage.getItem("userEmail") || "",
    phone: "",
    housing: "House",
    yard: "Yes",
    experience: ""
  })

  useEffect(() => {
    const dogId = localStorage.getItem("pendingApplicationDogId")
    if (!dogId) {
      addToast("No dog selected for application", "error")
      navigate("/browse-dogs")
      return
    }

    const fallbackDogs = [
      { id: 1, name: "Buddy", breed: "Labrador Mix" },
      { id: 2, name: "Luna", breed: "Golden Retriever" },
      { id: 3, name: "Max", breed: "Beagle" },
      { id: 4, name: "Bella", breed: "Pug" },
      { id: 5, name: "Charlie", breed: "Poodle" },
      { id: 6, name: "Daisy", breed: "Chihuahua" }
    ]

    const foundDog = fallbackDogs.find((d) => d.id.toString() === dogId)
    if (foundDog) {
      setTargetDog(foundDog)
    }
  }, [navigate, addToast])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const apps = JSON.parse(localStorage.getItem("myApplications") || "[]")
    
    const newApp = {
      id: Date.now(),
      dog: targetDog.name,
      breed: targetDog.breed,
      shelter: "Canine Connections Rescue",
      status: "Pending",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      applicantName: `${formData.firstName} ${formData.lastName}`
    }
    
    apps.push(newApp)
    localStorage.setItem("myApplications", JSON.stringify(apps))
    localStorage.removeItem("pendingApplicationDogId")
    
    addToast("Application submitted successfully", "success")
    navigate("/applications")
  }

  if (!targetDog) return null

  return (
    <div className="page-container">
      <header style={{ marginBottom: '40px' }}>
        <button 
          className="btn" 
          style={{ background: 'transparent', color: 'var(--text-light)', padding: '0 0 16px 0' }} 
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <h1>Adoption Application</h1>
        <p className="page-subtitle">You are applying to adopt {targetDog.name}.</p>
      </header>

      <div className="panel" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          
          <section className="form-section">
            <h2>Contact Information</h2>
            <div className="input-row">
              <div className="input-group">
                <label>First Name</label>
                <input required name="firstName" value={formData.firstName} onChange={handleChange} className="form-input" />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input required name="lastName" value={formData.lastName} onChange={handleChange} className="form-input" />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Email Address</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input required name="phone" value={formData.phone} onChange={handleChange} className="form-input" />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>Living Situation</h2>
            <div className="input-row">
              <div className="input-group">
                <label>Housing Type</label>
                <select name="housing" value={formData.housing} onChange={handleChange} className="form-select">
                  <option value="House">House</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Condo">Condo</option>
                </select>
              </div>
              <div className="input-group">
                <label>Fenced Yard</label>
                <select name="yard" value={formData.yard} onChange={handleChange} className="form-select">
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>Experience</h2>
            <div className="input-group">
              <label>Tell us about your experience with dogs.</label>
              <textarea required name="experience" value={formData.experience} onChange={handleChange} className="form-textarea" rows="4"></textarea>
            </div>
          </section>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '16px' }}>
            Submit Application
          </button>
        </form>
      </div>
    </div>
  )
}