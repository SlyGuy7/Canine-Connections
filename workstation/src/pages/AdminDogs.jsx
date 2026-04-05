import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

const EMPTY_FORM = {
  name: "", breed: "", age_years: "", size: "medium", gender: "male",
  energy_level: "medium", description: "", status: "available",
  good_with_kids: false, good_with_dogs: false, good_with_cats: false,
  apartment_friendly: false, is_vaccinated: false, is_spayed_neutered: false,
  shelter_id: 1,
}

export default function AdminDogs() {
  const [dogs, setDogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [successMsg, setSuccessMsg] = useState("")

  useEffect(() => { loadDogs() }, [])

  async function loadDogs() {
    setLoading(true)
    try {
      const result = await sendMessage("request.dogs.list", {})
      setDogs(result?.dogs || [])
    } catch (err) {
      setDogs([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  const handleAddDog = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await sendMessage("request.api.dog.upsert", {
        ...formData,
        age_years: parseInt(formData.age_years) || 0,
        shelter_id: parseInt(formData.shelter_id) || 1,
        external_id: "",
      })
      if (result?.success) {
        setSuccessMsg("Dog added successfully.")
        setShowForm(false)
        setFormData(EMPTY_FORM)
        loadDogs()
        setTimeout(() => setSuccessMsg(""), 4000)
      }
    } catch (err) {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (dog, newStatus) => {
    try {
      await sendMessage("request.api.dog.upsert", {
        ...dog,
        status: newStatus,
        external_id: dog.external_id || "",
        shelter_id: dog.shelter_id || 1,
      })
      setDogs((prev) => prev.map((d) => d.dog_id === dog.dog_id ? { ...d, status: newStatus } : d))
    } catch (err) {
      // silent
    }
  }

  const filtered = dogs.filter((d) => {
    const matchSearch = d.name?.toLowerCase().includes(search.toLowerCase()) || d.breed?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || d.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fdf6ef' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', color: '#2f241d', fontSize: '28px' }}>Dog Listings</h1>
            <p style={{ margin: 0, color: '#6f5848' }}>{dogs.length} dogs in the system.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowForm((v) => !v); setFormData(EMPTY_FORM) }}>
            {showForm ? "Cancel" : "Add New Dog"}
          </button>
        </div>

        {successMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#15803d', fontSize: '14px' }}>
            {successMsg}
          </div>
        )}

        {showForm && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #efdfd1', padding: '28px', marginBottom: '28px' }}>
            <h2 style={{ margin: '0 0 24px 0', color: '#2f241d', fontSize: '18px' }}>Add New Dog</h2>
            <form onSubmit={handleAddDog} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Name</label>
                  <input required name="name" value={formData.name} onChange={handleChange} className="form-input" placeholder="Dog name" />
                </div>
                <div>
                  <label className="form-label">Breed</label>
                  <input required name="breed" value={formData.breed} onChange={handleChange} className="form-input" placeholder="e.g. Labrador Mix" />
                </div>
                <div>
                  <label className="form-label">Age (years)</label>
                  <input required type="number" min="0" max="25" name="age_years" value={formData.age_years} onChange={handleChange} className="form-input" placeholder="2" />
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="form-input">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Size</label>
                  <select name="size" value={formData.size} onChange={handleChange} className="form-input">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Energy Level</label>
                  <select name="energy_level" value={formData.energy_level} onChange={handleChange} className="form-input">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="form-input">
                    <option value="available">Available</option>
                    <option value="pending">Pending</option>
                    <option value="adopted">Adopted</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Shelter ID</label>
                  <input type="number" name="shelter_id" value={formData.shelter_id} onChange={handleChange} className="form-input" />
                </div>
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="form-input" rows="3" style={{ resize: 'vertical' }} placeholder="Tell adopters about this dog." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {[
                  { name: "good_with_kids",     label: "Good with kids" },
                  { name: "good_with_dogs",     label: "Good with dogs" },
                  { name: "good_with_cats",     label: "Good with cats" },
                  { name: "apartment_friendly", label: "Apartment friendly" },
                  { name: "is_vaccinated",      label: "Vaccinated" },
                  { name: "is_spayed_neutered", label: "Spayed / Neutered" },
                ].map((cb) => (
                  <label key={cb.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#2f241d', fontSize: '14px', fontWeight: '500' }}>
                    <input type="checkbox" name={cb.name} checked={formData[cb.name]} onChange={handleChange} style={{ accentColor: '#b45309', width: '15px', height: '15px' }} />
                    {cb.label}
                  </label>
                ))}
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', minWidth: '140px' }} disabled={saving}>
                {saving ? "Saving..." : "Add Dog"}
              </button>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ maxWidth: '280px' }}
            placeholder="Search by name or breed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-input" style={{ maxWidth: '160px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="adopted">Adopted</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #efdfd1' }}>
                <div style={{ height: '16px', width: '30%', background: '#e0e0e0', borderRadius: '6px', marginBottom: '10px' }} />
                <div style={{ height: '14px', width: '50%', background: '#e0e0e0', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6f5848' }}>No dogs found.</div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #efdfd1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fdf6ef' }}>
                  {["Name", "Breed", "Age", "Size", "Energy", "Status", "Change Status"].map((h) => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#6f5848', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((dog, i) => (
                  <tr key={dog.dog_id || i} style={{ borderTop: '1px solid #f1ebe5' }}>
                    <td style={{ padding: '14px 20px', color: '#2f241d', fontWeight: '600' }}>{dog.name}</td>
                    <td style={{ padding: '14px 20px', color: '#6f5848', fontSize: '14px' }}>{dog.breed}</td>
                    <td style={{ padding: '14px 20px', color: '#6f5848', fontSize: '14px' }}>{dog.age_years} yr</td>
                    <td style={{ padding: '14px 20px', color: '#6f5848', fontSize: '14px', textTransform: 'capitalize' }}>{dog.size}</td>
                    <td style={{ padding: '14px 20px', color: '#6f5848', fontSize: '14px', textTransform: 'capitalize' }}>{dog.energy_level}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`status-badge ${dog.status === "available" ? "approved" : dog.status === "adopted" ? "review" : "pending"}`} style={{ textTransform: 'capitalize' }}>
                        {dog.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <select
                        value={dog.status}
                        onChange={(e) => handleStatusChange(dog, e.target.value)}
                        className="form-input"
                        style={{ fontSize: '13px', padding: '6px 10px' }}
                      >
                        <option value="available">Available</option>
                        <option value="pending">Pending</option>
                        <option value="adopted">Adopted</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
