import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

export default function AdminApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [processing, setProcessing] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { loadApplications() }, [])

  async function loadApplications() {
    setLoading(true)
    try {
      const result = await sendMessage("request.application.list", {})
      setApplications(result?.applications || [])
    } catch (err) {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (appId, decision) => {
    setProcessing(appId + decision)
    const adminId = parseInt(localStorage.getItem("adminUserId"))
    try {
      const queue = decision === "approve" ? "request.application.approve" : "request.application.reject"
      const result = await sendMessage(queue, {
        application_id: appId,
        reviewed_by: adminId,
        reviewer_notes: "",
      })
      if (result?.success) {
        setApplications((prev) =>
          prev.map((a) =>
            a.application_id === appId
              ? { ...a, status: decision === "approve" ? "approved" : "rejected" }
              : a
          )
        )
        setExpandedId(null)
      }
    } catch (err) {
      // silent
    } finally {
      setProcessing(null)
    }
  }

  const getStatusMeta = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending":   return { label: "Pending",      badgeClass: "pending" }
      case "approved":  return { label: "Approved",     badgeClass: "approved" }
      case "rejected":  return { label: "Not Approved", badgeClass: "rejected" }
      case "finalized": return { label: "Finalized",    badgeClass: "approved" }
      default:          return { label: status,          badgeClass: "pending" }
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
    catch { return dateStr }
  }

  const filtered = applications.filter((a) => {
    const matchStatus = filterStatus === "all" || (a.status || "").toLowerCase() === filterStatus
    const matchSearch =
      (a.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.dog_name || "").toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const isPending = (app) => (app.status || "").toLowerCase() === "pending"

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fdf6ef' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: '0 0 6px 0', color: '#2f241d', fontSize: '28px' }}>Applications</h1>
          <p style={{ margin: 0, color: '#6f5848' }}>{applications.filter((a) => isPending(a)).length} pending review.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ maxWidth: '280px' }}
            placeholder="Search by applicant or dog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-input" style={{ maxWidth: '180px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Not Approved</option>
            <option value="finalized">Finalized</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #efdfd1' }}>
                <div style={{ height: '16px', width: '40%', background: '#e0e0e0', borderRadius: '6px', marginBottom: '10px' }} />
                <div style={{ height: '14px', width: '60%', background: '#e0e0e0', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6f5848' }}>No applications found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map((app) => {
              const meta = getStatusMeta(app.status)
              const expanded = expandedId === app.application_id
              return (
                <div key={app.application_id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #efdfd1', overflow: 'hidden' }}>

                  <div
                    style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', cursor: 'pointer' }}
                    onClick={() => setExpandedId(expanded ? null : app.application_id)}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', color: '#2f241d', fontSize: '16px', fontWeight: '600' }}>
                        {app.full_name || "Applicant"} <span style={{ color: '#6f5848', fontWeight: '400' }}>applying for</span> {app.dog_name || "Dog"}
                      </h3>
                      <p style={{ margin: 0, color: '#6f5848', fontSize: '13px' }}>
                        Submitted {formatDate(app.submitted_at || app.date)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={`status-badge ${meta.badgeClass}`}>{meta.label}</span>
                      <span style={{ color: '#94a3b8', fontSize: '18px' }}>{expanded ? "^" : "v"}</span>
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ borderTop: '1px solid #f1ebe5', padding: '24px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                        {[
                          { label: "Full Name",     value: app.full_name },
                          { label: "Phone",         value: app.phone },
                          { label: "Housing Type",  value: app.housing_type },
                          { label: "Has Yard",      value: app.has_yard ? "Yes" : "No" },
                          { label: "Has Children",  value: app.has_children ? "Yes" : "No" },
                          { label: "Has Other Pets",value: app.has_other_pets ? "Yes" : "No" },
                        ].map((field) => field.value ? (
                          <div key={field.label}>
                            <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '700', color: '#6f5848', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</p>
                            <p style={{ margin: 0, color: '#2f241d', fontSize: '14px' }}>{field.value}</p>
                          </div>
                        ) : null)}
                      </div>

                      {app.prior_pet_experience && (
                        <div style={{ marginBottom: '16px' }}>
                          <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: '700', color: '#6f5848', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prior Experience</p>
                          <p style={{ margin: 0, color: '#2f241d', fontSize: '14px', lineHeight: '1.6' }}>{app.prior_pet_experience}</p>
                        </div>
                      )}

                      {app.reason_for_adopting && (
                        <div style={{ marginBottom: '20px' }}>
                          <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: '700', color: '#6f5848', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason for Adopting</p>
                          <p style={{ margin: 0, color: '#2f241d', fontSize: '14px', lineHeight: '1.6' }}>{app.reason_for_adopting}</p>
                        </div>
                      )}

                      {isPending(app) && (
                        <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1ebe5' }}>
                          <button
                            className="btn btn-primary"
                            style={{ minWidth: '120px' }}
                            disabled={!!processing}
                            onClick={() => handleDecision(app.application_id, "approve")}
                          >
                            {processing === app.application_id + "approve" ? "Approving..." : "Approve"}
                          </button>
                          <button
                            className="btn"
                            style={{ minWidth: '120px', background: 'white', border: '1px solid #fecaca', color: '#dc2626' }}
                            disabled={!!processing}
                            onClick={() => handleDecision(app.application_id, "reject")}
                          >
                            {processing === app.application_id + "reject" ? "Rejecting..." : "Reject"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
