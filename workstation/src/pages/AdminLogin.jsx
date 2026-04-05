import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"

export default function AdminLogin() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await sendMessage("request.auth.login", {
        email: formData.email,
        password: formData.password,
      })

      if (result && result.success && result.user) {
        const role = result.user.role
        if (role !== "admin" && role !== "shelter_staff") {
          setError("Access denied. You do not have admin privileges.")
          setLoading(false)
          return
        }
        localStorage.setItem("adminToken", "true")
        localStorage.setItem("adminRole", role)
        localStorage.setItem("adminUserId", result.user.user_id)
        localStorage.setItem("adminEmail", result.user.email)
        localStorage.setItem("adminFirstName", result.user.first_name || "")
        navigate("/admin/dashboard")
      } else {
        setError(result?.error || "Invalid email or password.")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fdf6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '48px', width: '100%', maxWidth: '440px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ width: '56px', height: '56px', background: '#b45309', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ color: 'white', fontSize: '24px', fontWeight: '700' }}>CC</span>
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#2f241d' }}>Admin Portal</h1>
          <p style={{ margin: 0, color: '#6f5848', fontSize: '14px' }}>Canine Connections Shelter Management</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#dc2626', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Email Address</label>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="admin@shelter.org"
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              required
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Your password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In to Admin Portal"}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#94a3b8' }}>
          Not an admin?{" "}
          <span style={{ color: '#b45309', cursor: 'pointer', fontWeight: '600' }} onClick={() => navigate("/")}>
            Return to main site
          </span>
        </p>

      </div>
    </div>
  )
}
