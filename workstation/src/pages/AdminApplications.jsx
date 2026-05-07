import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

const A = {
  bg:     '#0a0a0a',
  card:   '#111111',
  border: '#1a1a1a',
  red:    '#dc2626',
  text:   '#f0f0f0',
  muted:  '#777777',
  subtle: '#444444',
}

const statusStyle = (s) => {
  switch ((s || '').toLowerCase()) {
    case 'approved':  return { bg:'#052e16', color:'#4ade80', label:'Approved' }
    case 'rejected':  return { bg:'#450a0a', color:'#f87171', label:'Rejected' }
    case 'finalized': return { bg:'#0c1a4a', color:'#60a5fa', label:'Finalized' }
    default:          return { bg:'#1c1917', color:'#fbbf24', label:'Pending' }
  }
}

const fmt = (d) => {
  if (!d) return '—'
  try { return new Date(d.replace(' ', 'T')).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', timeZone:'America/New_York' }) }
  catch { return d }
}

const getName = (app) =>
  app.full_name || `${app.first_name || ''} ${app.last_name || ''}`.trim() || '—'

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

  const counts = {
    all:       applications.length,
    pending:   applications.filter(a => (a.status||'').toLowerCase() === 'pending').length,
    approved:  applications.filter(a => (a.status||'').toLowerCase() === 'approved').length,
    rejected:  applications.filter(a => (a.status||'').toLowerCase() === 'rejected').length,
    finalized: applications.filter(a => (a.status||'').toLowerCase() === 'finalized').length,
  }

  const filtered = applications.filter(a => {
    const matchStatus = filterStatus === "all" || (a.status||'').toLowerCase() === filterStatus
    const q = search.toLowerCase()
    const matchSearch = getName(a).toLowerCase().includes(q) || (a.dog_name||'').toLowerCase().includes(q) || (a.email||'').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const inputStyle = { background:'#0d0d0d', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'9px 14px', color: A.text, fontSize:'13px', outline:'none' }

  const tabs = [
    { key:'all',       label:'All',       count: counts.all },
    { key:'pending',   label:'Pending',   count: counts.pending },
    { key:'approved',  label:'Approved',  count: counts.approved },
    { key:'rejected',  label:'Rejected',  count: counts.rejected },
    { key:'finalized', label:'Finalized', count: counts.finalized },
  ]

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: A.bg }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'36px 40px', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ marginBottom:'28px' }}>
          <p style={{ margin:'0 0 4px 0', fontSize:'12px', color: A.subtle, fontWeight:'600', letterSpacing:'0.1em', textTransform:'uppercase' }}>Admin Dashboard</p>
          <h1 style={{ margin:'0 0 4px 0', color: A.text, fontSize:'26px', fontWeight:'700' }}>Applications</h1>
          <p style={{ margin:0, color: A.muted, fontSize:'13px' }}>
            {loading ? '—' : `${counts.pending} pending review · ${counts.all} total`}
          </p>
        </div>

        {/* Filter tabs + search */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {tabs.map(tab => {
              const active = filterStatus === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  style={{
                    background: active ? '#1a0000' : 'transparent',
                    border: `1px solid ${active ? A.red : A.border}`,
                    borderRadius:'8px', padding:'7px 14px', cursor:'pointer',
                    color: active ? '#f87171' : A.muted,
                    fontSize:'12px', fontWeight: active ? '700' : '400',
                    transition:'all 0.15s', display:'flex', alignItems:'center', gap:'6px',
                  }}
                >
                  {tab.label}
                  <span style={{
                    background: active ? 'rgba(220,38,38,0.2)' : '#1a1a1a',
                    color: active ? '#f87171' : A.subtle,
                    padding:'1px 7px', borderRadius:'10px', fontSize:'11px', fontWeight:'700',
                  }}>
                    {loading ? '—' : tab.count}
                  </span>
                </button>
              )
            })}
          </div>
          <input
            style={{ ...inputStyle, width:'240px' }}
            placeholder="Search name, dog, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: A.card, borderRadius:'12px', padding:'20px', border:`1px solid ${A.border}`, height:'64px' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px', color: A.muted }}>
            <div style={{ fontSize:'36px', marginBottom:'12px', opacity:0.3 }}>📋</div>
            <p style={{ margin:0, fontSize:'14px' }}>No applications found.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {filtered.map(app => {
              const s = statusStyle(app.status)
              const expanded = expandedId === app.application_id
              const isPending  = (app.status||'').toLowerCase() === 'pending'
              const isApproved = (app.status||'').toLowerCase() === 'approved'
              return (
                <div key={app.application_id} style={{ background: A.card, borderRadius:'12px', border:`1px solid ${A.border}`, overflow:'hidden', transition:'border-color 0.15s' }}>

                  {/* Collapsed header row */}
                  <div
                    onClick={() => setExpandedId(expanded ? null : app.application_id)}
                    style={{ padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#141414'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ minWidth:0 }}>
                      <p style={{ margin:'0 0 2px 0', color: A.text, fontSize:'14px', fontWeight:'600' }}>
                        {getName(app)}
                        <span style={{ color: A.subtle, fontWeight:'400' }}> · </span>
                        <span style={{ color: A.muted, fontWeight:'400' }}>{app.dog_name || `Dog #${app.dog_id}`}</span>
                      </p>
                      <p style={{ margin:0, color: A.subtle, fontSize:'11px' }}>{app.email || ''}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', flexShrink:0 }}>
                      <span style={{ background: s.bg, color: s.color, padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{s.label}</span>
                      <span style={{ color: A.subtle, fontSize:'13px' }}>{expanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {expanded && (
                    <div style={{ borderTop:`1px solid ${A.border}`, padding:'24px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'16px', marginBottom:'20px' }}>
                        {[
                          { label:'Full Name',      value: getName(app) },
                          { label:'Email',          value: app.email },
                          { label:'Phone',          value: app.phone },
                          { label:'Housing Type',   value: app.housing_type },
                          { label:'Has Yard',       value: app.has_yard != null ? (app.has_yard ? 'Yes' : 'No') : null },
                          { label:'Has Children',   value: app.has_children != null ? (app.has_children ? 'Yes' : 'No') : null },
                          { label:'Has Other Pets', value: app.has_other_pets != null ? (app.has_other_pets ? 'Yes' : 'No') : null },
                          { label:'Vet Reference',  value: app.vet_reference },
                          { label:'Submitted',      value: fmt(app.submitted_at) },
                        ].filter(f => f.value).map(field => (
                          <div key={field.label}>
                            <p style={{ margin:'0 0 4px 0', fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.05em' }}>{field.label}</p>
                            <p style={{ margin:0, color: A.text, fontSize:'13px' }}>{field.value}</p>
                          </div>
                        ))}
                      </div>

                      {app.prior_pet_experience && (
                        <div style={{ marginBottom:'16px' }}>
                          <p style={{ margin:'0 0 6px 0', fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.05em' }}>Prior Experience</p>
                          <p style={{ margin:0, color:'#bbb', fontSize:'13px', lineHeight:'1.6', background:'#0d0d0d', padding:'12px 16px', borderRadius:'8px', border:`1px solid ${A.border}` }}>{app.prior_pet_experience}</p>
                        </div>
                      )}

                      {app.reason_for_adopting && (
                        <div style={{ marginBottom:'20px' }}>
                          <p style={{ margin:'0 0 6px 0', fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.05em' }}>Reason for Adopting</p>
                          <p style={{ margin:0, color:'#bbb', fontSize:'13px', lineHeight:'1.6', background:'#0d0d0d', padding:'12px 16px', borderRadius:'8px', border:`1px solid ${A.border}` }}>{app.reason_for_adopting}</p>
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
                          <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                            {isPending && (
                              <>
                                <button
                                  disabled={!!processing}
                                  onClick={() => handleDecision(app.application_id, "approve")}
                                  style={{ background:'#052e16', border:'1px solid #166534', borderRadius:'8px', padding:'9px 22px', color:'#4ade80', fontWeight:'600', fontSize:'13px', cursor:'pointer', minWidth:'110px' }}
                                >
                                  {processing === app.application_id + "approve" ? "Approving..." : "Approve"}
                                </button>
                                <button
                                  disabled={!!processing}
                                  onClick={() => handleDecision(app.application_id, "reject")}
                                  style={{ background:'transparent', border:'1px solid #7f1d1d', borderRadius:'8px', padding:'9px 22px', color:'#f87171', fontWeight:'600', fontSize:'13px', cursor:'pointer', minWidth:'110px' }}
                                >
                                  {processing === app.application_id + "reject" ? "Rejecting..." : "Reject"}
                                </button>
                              </>
                            )}
                            {isApproved && (
                              <button
                                disabled={!!processing}
                                onClick={() => handleFinalize(app.application_id)}
                                style={{ background:'#0c1a4a', border:'1px solid #1e3a8a', borderRadius:'8px', padding:'9px 22px', color:'#60a5fa', fontWeight:'600', fontSize:'13px', cursor:'pointer', minWidth:'140px' }}
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
