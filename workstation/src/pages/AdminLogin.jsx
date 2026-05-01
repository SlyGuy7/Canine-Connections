import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"

export default function AdminLogin() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await sendMessage("request.auth.login", {
        email:    formData.email,
        password: formData.password,
      })
      if (result?.success && result.user) {
        const role = result.user.role
        if (role !== "super_admin" && role !== "shelter_admin") {
          setError("Access denied. Admin privileges required.")
          setLoading(false)
          return
        }
        localStorage.setItem("adminToken",     "true")
        localStorage.setItem("adminRole",      role)
        localStorage.setItem("adminUserId",    result.user.user_id)
        localStorage.setItem("adminEmail",     result.user.email)
        localStorage.setItem("adminFirstName", result.user.first_name || "")
        navigate("/admin/dashboard")
      } else {
        setError(result?.error || "Invalid email or password.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'#141414', border:'1px solid #1f1f1f', borderRadius:'16px', padding:'48px', width:'100%', maxWidth:'420px' }}>

        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <div style={{ width:'52px', height:'52px', background:'#dc2626', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <span style={{ color:'white', fontSize:'18px', fontWeight:'800' }}>CC</span>
          </div>
          <h1 style={{ margin:'0 0 8px 0', fontSize:'22px', fontWeight:'700', color:'white' }}>Admin Portal</h1>
          <p style={{ margin:0, color:'#555', fontSize:'13px' }}>Canine Connections Shelter Management</p>
        </div>

        {error && (
          <div style={{ background:'#450a0a', border:'1px solid #7f1d1d', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px', color:'#f87171', fontSize:'13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <label style={{ fontSize:'12px', fontWeight:'600', color:'#666', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:'6px' }}>
              Email Address
            </label>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@shelter.org"
              style={{ width:'100%', background:'#111', border:'1px solid #1f1f1f', borderRadius:'8px', padding:'11px 14px', color:'white', fontSize:'14px', outline:'none', boxSizing:'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize:'12px', fontWeight:'600', color:'#666', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:'6px' }}>
              Password
            </label>
            <input
              required
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Your password"
              style={{ width:'100%', background:'#111', border:'1px solid #1f1f1f', borderRadius:'8px', padding:'11px 14px', color:'white', fontSize:'14px', outline:'none', boxSizing:'border-box' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ background:'#dc2626', border:'none', borderRadius:'8px', padding:'13px', color:'white', fontWeight:'700', fontSize:'15px', cursor:'pointer', marginTop:'8px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:'24px', fontSize:'12px', color:'#333' }}>
          Not an admin?{" "}
          <span style={{ color:'#dc2626', cursor:'pointer', fontWeight:'600' }} onClick={() => navigate("/landing")}>
            Return to main site
          </span>
        </p>
      </div>
    </div>
  )
}