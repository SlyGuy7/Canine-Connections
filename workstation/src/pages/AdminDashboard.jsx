import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ dogs: 0, applications: 0, pending: 0, stories: 0 })
  const [recentApps, setRecentApps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [dogsRes, appsRes, storiesRes] = await Promise.all([
        sendMessage("request.dogs.list", {}),
        sendMessage("request.application.list", {}),
        sendMessage("request.stories.list", { limit: 50 }),
      ])

      const dogs = dogsRes?.dogs || []
      const apps = appsRes?.applications || []
      const stories = storiesRes?.stories || []

      setStats({
        dogs: dogs.length,
        applications: apps.length,
        pending: apps.filter((a) => (a.status || "").toLowerCase() === "pending").length,
        stories: stories.length,
      })
      setRecentApps(apps.slice(0, 5))
    } catch (err) {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const getStatusMeta = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending":  return { label: "Pending",     badgeClass: "pending" }
      case "approved": return { label: "Approved",    badgeClass: "approved" }
      case "rejected": return { label: "Not Approved",badgeClass: "rejected" }
      case "finalized":return { label: "Finalized",   badgeClass: "approved" }
      default:         return { label: status,         badgeClass: "pending" }
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
    catch { return dateStr }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fdf6ef' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 6px 0', color: '#2f241d', fontSize: '28px' }}>Overview</h1>
          <p style={{ margin: 0, color: '#6f5848' }}>Welcome back, {localStorage.getItem("adminFirstName") || "Admin"}.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '36px' }}>
          {[
            { label: "Available Dogs",    value: stats.dogs,         action: () => navigate("/admin/dogs") },
            { label: "Total Applications",value: stats.applications,  action: () => navigate("/admin/applications") },
            { label: "Pending Review",    value: stats.pending,       action: () => navigate("/admin/applications") },
            { label: "Success Stories",   value: stats.stories,       action: () => navigate("/admin/stories") },
          ].map((card) => (
            <div
              key={card.label}
              onClick={card.action}
              style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #efdfd1', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            >
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6f5848', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
              <p style={{ margin: 0, fontSize: '36px', fontWeight: '700', color: '#2f241d' }}>{loading ? "-" : card.value}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #efdfd1', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1ebe5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#2f241d' }}>Recent Applications</h2>
            <button className="btn" style={{ fontSize: '13px', background: 'white', border: '1px solid #d8c1af', color: '#2f241d' }} onClick={() => navigate("/admin/applications")}>
              View All
            </button>
          </div>
          {loading ? (
            <div style={{ padding: '24px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: '16px', background: '#e0e0e0', borderRadius: '6px', marginBottom: '12px' }} />
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6f5848' }}>No applications yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fdf6ef' }}>
                  {["Dog", "Applicant", "Date", "Status", "Action"].map((h) => (
                    <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#6f5848', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentApps.map((app, i) => {
                  const meta = getStatusMeta(app.status)
                  return (
                    <tr key={app.application_id || i} style={{ borderTop: '1px solid #f1ebe5' }}>
                      <td style={{ padding: '14px 24px', color: '#2f241d', fontWeight: '600' }}>{app.dog_name || "Dog"}</td>
                      <td style={{ padding: '14px 24px', color: '#6f5848' }}>{app.full_name || app.applicant || "-"}</td>
                      <td style={{ padding: '14px 24px', color: '#6f5848', fontSize: '13px' }}>{formatDate(app.submitted_at || app.date)}</td>
                      <td style={{ padding: '14px 24px' }}><span className={`status-badge ${meta.badgeClass}`}>{meta.label}</span></td>
                      <td style={{ padding: '14px 24px' }}>
                        <button className="btn" style={{ fontSize: '12px', padding: '6px 14px', background: 'white', border: '1px solid #d8c1af', color: '#2f241d' }} onClick={() => navigate("/admin/applications")}>
                          Review
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
