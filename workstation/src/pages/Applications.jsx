import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import Sidebar from "../components/Sidebar"

export default function Applications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const userId = localStorage.getItem("userId")

  useEffect(() => {
    loadApplications()
  }, [])

  async function loadApplications() {
    setLoading(true)
    try {
      const result = await sendMessage("request.application.list", { user_id: parseInt(userId) })
      if (result.success && result.applications?.length > 0) {
        setApplications(result.applications)
      } else {
        setApplications([])
      }
    } catch (err) {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusMeta = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending":
        return { label: "Pending", badgeClass: "pending", progress: "25%", color: "#f59e0b", message: "Your application has been received and is awaiting shelter review." }
      case "in review":
      case "review":
        return { label: "In Review", badgeClass: "review", progress: "60%", color: "#3b82f6", message: "The shelter team is currently reviewing your application." }
      case "approved":
        return { label: "Approved", badgeClass: "approved", progress: "100%", color: "#10b981", message: "Congratulations! Your application has been approved. Check your email for next steps." }
      case "rejected":
        return { label: "Not Approved", badgeClass: "rejected", progress: "100%", color: "#ef4444", message: "Unfortunately this application was not successful. You are welcome to apply for other dogs." }
      case "finalized":
        return { label: "Finalized", badgeClass: "approved", progress: "100%", color: "#10b981", message: "Adoption complete. Welcome to the family!" }
      default:
        return { label: status || "Unknown", badgeClass: "pending", progress: "10%", color: "#94a3b8", message: "Status update pending." }
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <header className="content-header" style={{ marginBottom: '32px' }}>
          <div>
            <h1>My Applications</h1>
            <p className="page-subtitle">Track your adoption requests and their current status.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/browse-dogs")}>
            Browse More Dogs
          </button>
        </header>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[1, 2].map((i) => (
              <div key={i} className="settings-card">
                <div style={{ height: '28px', width: '40%', background: '#e0e0e0', borderRadius: '6px', marginBottom: '12px' }} />
                <div style={{ height: '16px', width: '60%', background: '#e0e0e0', borderRadius: '6px', marginBottom: '24px' }} />
                <div style={{ height: '8px', background: '#e0e0e0', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <h2>No Applications Yet</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
              You have not applied to adopt any dogs yet. Browse available dogs and start your adoption journey.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/browse-dogs")}>
              Find a Dog
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {applications.map((app) => {
              const meta = getStatusMeta(app.status)
              return (
                <div key={app.application_id || app.id} className="settings-card">

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '22px', margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                        {app.dog_name || app.dog || "Dog"}
                      </h3>
                      <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '14px' }}>
                        {app.breed && <span>{app.breed} &nbsp;&bull;&nbsp; </span>}
                        Applied {formatDate(app.submitted_at || app.date)}
                      </p>
                    </div>
                    <span className={`status-badge ${meta.badgeClass}`}>{meta.label}</span>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Application Progress</span>
                      <span style={{ fontSize: '13px', color: meta.color, fontWeight: '700' }}>{meta.label}</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1ebe5', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: meta.progress, background: meta.color, borderRadius: '99px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1ebe5' }}>
                    <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '14px', maxWidth: '480px' }}>
                      {meta.message}
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {app.dog_id && (
                        <button
                          className="btn"
                          style={{ background: 'white', border: '1px solid #d8c1af', color: 'var(--text-main)', fontSize: '14px' }}
                          onClick={() => navigate(`/dogs/${app.dog_id}`)}
                        >
                          View Dog
                        </button>
                      )}
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '14px' }}
                        onClick={() => navigate("/messages")}
                      >
                        Message Shelter
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