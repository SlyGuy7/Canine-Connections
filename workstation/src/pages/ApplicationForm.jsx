import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import { useToast } from "../context/ToastContext"
import Sidebar from "../components/Sidebar"

export default function ApplicationForm() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [targetDog, setTargetDog] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    full_name: `${localStorage.getItem("userFirstName") || ""} ${localStorage.getItem("userLastName") || ""}`.trim(),
    email: localStorage.getItem("userEmail") || "",
    phone: localStorage.getItem("userPhone") || "",
    address: localStorage.getItem("userAddress") || "",
    housing_type: "house",
    has_yard: false,
    has_other_pets: false,
    other_pets_description: "",
    has_children: false,
    children_ages: "",
    prior_pet_experience: "",
    reason_for_adopting: "",
    vet_reference: "",
  })

  useEffect(() => {
    const dogId = localStorage.getItem("pendingApplicationDogId")
    const dogName = localStorage.getItem("pendingApplicationDogName")
    if (!dogId) {
      addToast("No dog selected for application", "error")
      navigate("/browse-dogs")
      return
    }
    setTargetDog({ dog_id: dogId, name: dogName || "this dog" })
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await sendMessage("request.application.submit", {
        user_id:                parseInt(localStorage.getItem("userId")),
        dog_id:                 parseInt(targetDog.dog_id),
        email:                  formData.email,
        first_name:             localStorage.getItem("userFirstName") || "",
        dog_name:               targetDog.name,
        full_name:              formData.full_name,
        phone:                  formData.phone,
        address:                formData.address,
        housing_type:           formData.housing_type,
        has_yard:               formData.has_yard,
        has_other_pets:         formData.has_other_pets,
        other_pets_description: formData.other_pets_description,
        has_children:           formData.has_children,
        children_ages:          formData.children_ages,
        prior_pet_experience:   formData.prior_pet_experience,
        reason_for_adopting:    formData.reason_for_adopting,
        vet_reference:          formData.vet_reference,
      })

      if (result && result.success) {
        localStorage.removeItem("pendingApplicationDogId")
        localStorage.removeItem("pendingApplicationDogName")
        addToast("Application submitted successfully!", "success")
        navigate("/applications")
      } else {
        addToast(result?.error || "Could not submit application. Please try again.", "error")
      }
    } catch (err) {
      addToast("Network error. Please try again.", "error")
    } finally {
      setSubmitting(false)
    }
  }

  if (!targetDog) return null

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <header style={{ marginBottom: '40px' }}>
          <button
            className="btn"
            style={{ background: 'transparent', color: 'var(--text-light)', padding: '0 0 16px 0', fontWeight: '600' }}
            onClick={() => navigate(-1)}
          >
            Back
          </button>
          <h1>Adoption Application</h1>
          <p className="page-subtitle">
            You are applying to adopt <strong style={{ color: 'var(--brand)' }}>{targetDog.name}</strong>. Please complete all sections honestly — this helps us find the best match.
          </p>
        </header>

        <div style={{ maxWidth: '800px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            <section className="settings-card">
              <h2 className="card-title">Contact Information</h2>
              <div className="form-row">
                <div className="flex-1">
                  <label className="form-label">Full Name</label>
                  <input required name="full_name" value={formData.full_name} onChange={handleChange} className="form-input" placeholder="Your full name" />
                </div>
                <div className="flex-1">
                  <label className="form-label">Email Address</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="your@email.com" />
                </div>
              </div>
              <div className="form-row" style={{ marginTop: '16px' }}>
                <div className="flex-1">
                  <label className="form-label">Phone Number</label>
                  <input required name="phone" value={formData.phone} onChange={handleChange} className="form-input" placeholder="(555) 000-0000" />
                </div>
                <div className="flex-1">
                  <label className="form-label">Home Address</label>
                  <input required name="address" value={formData.address} onChange={handleChange} className="form-input" placeholder="123 Main St, City, State" />
                </div>
              </div>
            </section>

            <section className="settings-card">
              <h2 className="card-title">Living Situation</h2>
              <div className="form-row">
                <div className="flex-1">
                  <label className="form-label">Housing Type</label>
                  <select name="housing_type" value={formData.housing_type} onChange={handleChange} className="form-input">
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: '500' }}>
                    <input type="checkbox" name="has_yard" checked={formData.has_yard} onChange={handleChange} style={{ accentColor: 'var(--brand)', width: '16px', height: '16px' }} />
                    I have a fenced yard
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: '500' }}>
                    <input type="checkbox" name="has_children" checked={formData.has_children} onChange={handleChange} style={{ accentColor: 'var(--brand)', width: '16px', height: '16px' }} />
                    Children in the household
                  </label>
                </div>
              </div>
              {formData.has_children && (
                <div style={{ marginTop: '16px' }}>
                  <label className="form-label">Ages of Children</label>
                  <input name="children_ages" value={formData.children_ages} onChange={handleChange} className="form-input" placeholder="e.g. 4, 7, 12" />
                </div>
              )}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: '500' }}>
                  <input type="checkbox" name="has_other_pets" checked={formData.has_other_pets} onChange={handleChange} style={{ accentColor: 'var(--brand)', width: '16px', height: '16px' }} />
                  Other pets in the household
                </label>
              </div>
              {formData.has_other_pets && (
                <div style={{ marginTop: '16px' }}>
                  <label className="form-label">Describe Your Other Pets</label>
                  <input name="other_pets_description" value={formData.other_pets_description} onChange={handleChange} className="form-input" placeholder="e.g. 2 cats, 1 older dog" />
                </div>
              )}
            </section>

            <section className="settings-card">
              <h2 className="card-title">Experience and Motivation</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Prior Pet Experience</label>
                  <textarea
                    required
                    name="prior_pet_experience"
                    value={formData.prior_pet_experience}
                    onChange={handleChange}
                    className="form-input"
                    rows="3"
                    placeholder="Describe any dogs or other pets you have owned or cared for."
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
                <div>
                  <label className="form-label">Why Do You Want to Adopt {targetDog.name}?</label>
                  <textarea
                    required
                    name="reason_for_adopting"
                    value={formData.reason_for_adopting}
                    onChange={handleChange}
                    className="form-input"
                    rows="4"
                    placeholder="Tell us why you would be a great fit for this dog and what kind of home you can provide."
                    style={{ resize: 'vertical', minHeight: '100px' }}
                  />
                </div>
                <div>
                  <label className="form-label">Veterinarian Reference <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(optional)</span></label>
                  <input
                    name="vet_reference"
                    value={formData.vet_reference}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Vet clinic name and phone number"
                  />
                </div>
              </div>
            </section>

            <div style={{ background: '#fff7ed', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', color: '#92400e', fontSize: '14px' }}>
              By submitting this application you confirm that all information provided is accurate and complete. A shelter representative will review your application and contact you within 3 to 5 business days.
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '16px' }}
              disabled={submitting}
            >
              {submitting ? "Submitting Application..." : "Submit Application"}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}