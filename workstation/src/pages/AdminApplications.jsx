import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

const A = {
  bg:'#0d0d0d', card:'#141414', border:'#1f1f1f',
  red:'#dc2626', text:'#ffffff', muted:'#888888', subtle:'#555555',
}

export default function AdminApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterStatus, setFilterStatus] = useState("all")
  const [search, setSearch]             = useState("")
  const [processing, setProcessing]     = useState(null)
  const [expandedId, setExpandedId]     = useState(null)
  const [notes, setNotes]               = useState({})

  useEffect(() => { loadApplications() }, [])

  async function loadApplications() {
    setLoading(true)
    try {
      const result = await sendMessage("request.application.list", {})
      setApplications(result?.applications || [])
    } catch { setApplications([]) } finally { setLoading(false) }
  }

  const handleDecision = async (appId, decision) => {
    setProcessing(appId + decision)
    const adminId = parseInt(localStorage.getItem("adminUserId"))
    try {
      const queue = decision === "approve" ? "request.application.approve" : "request.application.reject"
      const result = await sendMessage(queue, {
        application_id: appId,
        reviewed_by: adminId,
        reviewer_notes: notes[appId] || "",
      })
      if (result?.success) {
        setApplications(prev => prev.map(a =>
          a.application_id === appId ? { ...a, status: decision === "approve" ? "approved" : "rejected" } : a
        ))
        setExpandedId(null)
      }
    } catch { } finally { setProcessing(null) }
  }

  const handleFinalize = async (appId) => {
    setProcessing(appId + "finalize")
    const adminId = parseInt(localStorage.getItem("adminUserId"))
    try {
      const result = await sendMessage("request.adoptions.finalize", {
        application_id: appId,
        finalized_by: adminId,
        notes: notes[appId] || "",
      })
      if (result?.success) {
        setApplications(prev => prev.map(a =>
          a.application_id === appId ? { ...a, status: "finalized" } : a
        ))
        setExpandedId(null)
      }
    } catch { } finally { setProcessing(null) }
  }

  const statusStyle = (s) => {
    switch((s||'').toLowerCase()) {
      case 'approved':  return { bg:'#052e16', color:'#4ade80', label:'Approved' }
      case 'rejected':  return { bg:'#450a0a', color:'#f87171', label:'Rejected' }
      case 'finalized': return { bg:'#0c1a4a', color:'#60a5fa', label:'Finalized' }
      default:          return { bg:'#1c1917', color:'#fbbf24', label:'Pending' }
    }
  }

  const fmt = (d) => { try { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) } catch { return d||'' } }

  const filtered = applications.filter(a => {
    const matchStatus = filterStatus === "all" || (a.status||'').toLowerCase() === filterStatus
    const matchSearch = (a.full_name||'').toLowerCase().includes(search.toLowerCase()) || (a.dog_name||'').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const inputStyle = { background:'#111', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'9px 14px', color: A.text, fontSize:'13px', outline:'none' }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: A.bg }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'40px', overflowY:'auto' }}>

        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ margin:'0 0 6px 0', color: A.text, fontSize:'28px', fontWeight:'700' }}>Applications</h1>
          <p style={{ margin:0, color: A.muted }}>{applications.filter(a => (a.status||'').toLowerCase() === 'pending').length} pending review.</p>
        </div>

        <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
          <input style={{ ...inputStyle, width:'260px' }} placeholder="Search applicant or dog..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={{ ...inputStyle, width:'160px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="finalized">Finalized</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[1,2,3].map(i => <div key={i} style={{ background: A.card, borderRadius:'10px', padding:'20px', border:`1px solid ${A.border}`, height:'60px' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color: A.muted }}>No applications found.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {filtered.map(app => {
              const s = statusStyle(app.status)
              const expanded = expandedId === app.application_id
              const isPending = (app.status||'').toLowerCase() === 'pending'
              const isApproved = (app.status||'').toLowerCase() === 'approved'
              return (
                <div key={app.application_id} style={{ background: A.card, borderRadius:'12px', border:`1px solid ${A.border}`, overflow:'hidden' }}>
                  <div style={{ padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', cursor:'pointer' }}
                    onClick={() => setExpandedId(expanded ? null : app.application_id)}
                  >
                    <div>
                      <h3 style={{ margin:'0 0 4px 0', color: A.text, fontSize:'15px', fontWeight:'600' }}>
                        {app.full_name||'Applicant'} <span style={{ color: A.muted, fontWeight:'400' }}>for</span> {app.dog_name||'Dog'}
                      </h3>
                      <p style={{ margin:0, color: A.subtle, fontSize:'12px' }}>Submitted {fmt(app.submitted_at)}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <span style={{ background: s.bg, color: s.color, padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>{s.label}</span>
                      <span style={{ color: A.subtle, fontSize:'16px' }}>{expanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ borderTop:`1px solid ${A.border}`, padding:'24px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'16px', marginBottom:'20px' }}>
                        {[
                          { label:'Full Name',      value: app.full_name },
                          { label:'Email',          value: app.email },
                          { label:'Phone',          value: app.phone },
                          { label:'Housing Type',   value: app.housing_type },
                          { label:'Has Yard',       value: app.has_yard ? 'Yes' : 'No' },
                          { label:'Has Children',   value: app.has_children ? 'Yes' : 'No' },
                          { label:'Has Other Pets', value: app.has_other_pets ? 'Yes' : 'No' },
                          { label:'Vet Reference',  value: app.vet_reference },
                        ].filter(f => f.value).map(field => (
                          <div key={field.label}>
                            <p style={{ margin:'0 0 4px 0', fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.05em' }}>{field.label}</p>
                            <p style={{ margin:0, color: A.text, fontSize:'14px' }}>{field.value}</p>
                          </div>
                        ))}
                      </div>

                      {app.prior_pet_experience && (
                        <div style={{ marginBottom:'16px' }}>
                          <p style={{ margin:'0 0 6px 0', fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.05em' }}>Prior Experience</p>
                          <p style={{ margin:0, color: A.text, fontSize:'14px', lineHeight:'1.6', background:'#111', padding:'12px', borderRadius:'8px' }}>{app.prior_pet_experience}</p>
                        </div>
                      )}

                      {app.reason_for_adopting && (
                        <div style={{ marginBottom:'20px' }}>
                          <p style={{ margin:'0 0 6px 0', fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.05em' }}>Reason for Adopting</p>
                          <p style={{ margin:0, color: A.text, fontSize:'14px', lineHeight:'1.6', background:'#111', padding:'12px', borderRadius:'8px' }}>{app.reason_for_adopting}</p>
                        </div>
                      )}

                      {(isPending || isApproved) && (
                        <div style={{ paddingTop:'16px', borderTop:`1px solid ${A.border}` }}>
                          <div style={{ marginBottom:'12px' }}>
                            <p style={{ margin:'0 0 6px 0', fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.05em' }}>Reviewer Notes</p>
                            <textarea
                              value={notes[app.application_id] || ''}
                              onChange={e => setNotes(prev => ({ ...prev, [app.application_id]: e.target.value }))}
                              placeholder="Optional notes..."
                              rows={2}
                              style={{ ...inputStyle, width:'100%', resize:'vertical', boxSizing:'border-box' }}
                            />
                          </div>
                          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                            {isPending && (
                              <>
                                <button
                                  disabled={!!processing}
                                  onClick={() => handleDecision(app.application_id, "approve")}
                                  style={{ background: A.red, border:'none', borderRadius:'8px', padding:'10px 24px', color:'white', fontWeight:'600', fontSize:'14px', cursor:'pointer', minWidth:'120px' }}
                                >
                                  {processing === app.application_id + "approve" ? "Approving..." : "Approve"}
                                </button>
                                <button
                                  disabled={!!processing}
                                  onClick={() => handleDecision(app.application_id, "reject")}
                                  style={{ background:'transparent', border:'1px solid #7f1d1d', borderRadius:'8px', padding:'10px 24px', color:'#f87171', fontWeight:'600', fontSize:'14px', cursor:'pointer', minWidth:'120px' }}
                                >
                                  {processing === app.application_id + "reject" ? "Rejecting..." : "Reject"}
                                </button>
                              </>
                            )}
                            {isApproved && (
                              <button
                                disabled={!!processing}
                                onClick={() => handleFinalize(app.application_id)}
                                style={{ background:'#0c1a4a', border:'1px solid #1e3a8a', borderRadius:'8px', padding:'10px 24px', color:'#60a5fa', fontWeight:'600', fontSize:'14px', cursor:'pointer', minWidth:'140px' }}
                              >
                                {processing === app.application_id + "finalize" ? "Finalizing..." : "Finalize Adoption"}
                              </button>
                            )}
                          </div>
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
