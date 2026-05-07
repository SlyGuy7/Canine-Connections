import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

const A = {
  bg:     '#0a0a0a',
  card:   '#111111',
  card2:  '#141414',
  border: '#1a1a1a',
  red:    '#dc2626',
  text:   '#f0f0f0',
  muted:  '#777777',
  subtle: '#444444',
}

const fmt = (d) => {
  if (!d) return '—'
  try { return new Date(d.replace(" ","T")).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'}) }
  catch { return d }
}

const statusStyle = (s) => {
  switch((s||'').toLowerCase()) {
    case 'approved':  return { bg:'#052e16', color:'#4ade80', label:'Approved' }
    case 'rejected':  return { bg:'#450a0a', color:'#f87171', label:'Rejected' }
    case 'finalized': return { bg:'#0c1a4a', color:'#60a5fa', label:'Finalized' }
    default:          return { bg:'#1c1917', color:'#fbbf24', label:'Pending' }
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats]         = useState({ dogs: 0, applications: 0, pending: 0, stories: 0 })
  const [recentApps, setRecentApps] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [dogsRes, appsRes, storiesRes] = await Promise.all([
        sendMessage("request.dogs.list",      { limit: 500 }),
        sendMessage("request.application.list", {}),
        sendMessage("request.stories.list",   { limit: 50 }),
      ])
      const dogs    = dogsRes?.dogs          || []
      const apps    = appsRes?.applications  || []
      const stories = storiesRes?.stories    || []
      setStats({
        dogs:         dogs.filter(d => d.status === 'available').length,
        applications: apps.length,
        pending:      apps.filter(a => (a.status||'').toLowerCase() === 'pending').length,
        stories:      stories.length,
      })
      setRecentApps(apps.slice(0, 6))
    } catch { } finally { setLoading(false) }
  }

  const adminName = localStorage.getItem("adminFirstName") || localStorage.getItem("adminEmail") || "Admin"

  const statCards = [
    { label:'Available Dogs',     value: stats.dogs,         path:'/admin/dogs',         accent: false },
    { label:'Total Applications', value: stats.applications,  path:'/admin/applications', accent: false },
    { label:'Pending Review',     value: stats.pending,       path:'/admin/applications', accent: stats.pending > 0 },
    { label:'Success Stories',    value: stats.stories,       path:'/admin/stories',      accent: false },
  ]

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: A.bg }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'36px 40px', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ marginBottom:'32px' }}>
          <p style={{ margin:'0 0 4px 0', fontSize:'12px', color: A.subtle, fontWeight:'600', letterSpacing:'0.1em', textTransform:'uppercase' }}>Admin Dashboard</p>
          <h1 style={{ margin:'0 0 4px 0', color: A.text, fontSize:'26px', fontWeight:'700' }}>Overview</h1>
          <p style={{ margin:0, color: A.muted, fontSize:'13px' }}>Welcome back, {adminName}.</p>
        </div>

        {/* Stat Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:'14px', marginBottom:'32px' }}>
          {statCards.map(card => (
            <div
              key={card.label}
              onClick={() => navigate(card.path)}
              style={{
                background: card.accent ? '#160000' : A.card,
                borderRadius:'12px', padding:'22px 24px',
                border: `1px solid ${card.accent ? '#7f1d1d' : A.border}`,
                cursor:'pointer', transition:'border-color 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = card.accent ? '#dc2626' : '#333'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = card.accent ? '#7f1d1d' : A.border; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <p style={{ margin:'0 0 12px 0', fontSize:'11px', color: card.accent ? '#f87171' : A.muted, fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em' }}>{card.label}</p>
              <p style={{ margin:0, fontSize:'36px', fontWeight:'800', color: card.accent ? '#dc2626' : A.text, lineHeight:1 }}>
                {loading ? <span style={{ fontSize:'24px', color: A.subtle }}>—</span> : card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Recent Applications */}
        <div style={{ background: A.card, borderRadius:'12px', border:`1px solid ${A.border}`, overflow:'hidden' }}>
          <div style={{ padding:'16px 24px', borderBottom:`1px solid ${A.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h2 style={{ margin:'0 0 2px 0', fontSize:'14px', color: A.text, fontWeight:'600' }}>Recent Applications</h2>
              {!loading && <p style={{ margin:0, fontSize:'11px', color: A.muted }}>{recentApps.length} most recent</p>}
            </div>
            <button
              onClick={() => navigate('/admin/applications')}
              style={{ background:'transparent', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'6px 14px', color: A.muted, fontSize:'12px', cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = A.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = A.border; e.currentTarget.style.color = A.muted }}
            >
              View All →
            </button>
          </div>

          {loading ? (
            <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'10px' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height:'14px', background:'#1a1a1a', borderRadius:'6px', width: i % 2 === 0 ? '70%' : '90%' }} />
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <div style={{ padding:'60px', textAlign:'center' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px', opacity:0.3 }}>📋</div>
              <p style={{ color: A.muted, margin:0, fontSize:'14px' }}>No applications yet.</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#0d0d0d' }}>
                  {['Applicant','Dog','Submitted','Status',''].map(h => (
                    <th key={h} style={{ padding:'10px 24px', textAlign:'left', fontSize:'10px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentApps.map((app, i) => {
                  const s = statusStyle(app.status)
                  return (
                    <tr key={app.application_id||i} style={{ borderTop:`1px solid ${A.border}`, transition:'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#141414'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding:'14px 24px' }}>
                        <p style={{ margin:0, color: A.text, fontWeight:'600', fontSize:'13px' }}>{app.full_name || `${app.first_name||''} ${app.last_name||''}`.trim() || '—'}</p>
                        <p style={{ margin:'2px 0 0 0', color: A.muted, fontSize:'11px' }}>{app.email||''}</p>
                      </td>
                      <td style={{ padding:'14px 24px', color: A.muted, fontSize:'13px' }}>{app.dog_name || `Dog #${app.dog_id}` || '—'}</td>
                      <td style={{ padding:'14px 24px', color: A.subtle, fontSize:'12px' }}>{fmt(app.submitted_at)}</td>
                      <td style={{ padding:'14px 24px' }}>
                        <span style={{ background: s.bg, color: s.color, padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{s.label}</span>
                      </td>
                      <td style={{ padding:'14px 24px' }}>
                        <button
                          onClick={() => navigate('/admin/applications')}
                          style={{ background:'transparent', border:`1px solid ${A.border}`, borderRadius:'6px', padding:'4px 12px', color: A.muted, fontSize:'11px', cursor:'pointer' }}
                        >
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
