import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

const A = {
  bg:       '#0d0d0d',
  card:     '#141414',
  border:   '#1f1f1f',
  red:      '#dc2626',
  redHover: '#b91c1c',
  text:     '#ffffff',
  muted:    '#888888',
  subtle:   '#555555',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ dogs: 0, applications: 0, pending: 0, stories: 0 })
  const [recentApps, setRecentApps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [dogsRes, appsRes, storiesRes] = await Promise.all([
        sendMessage("request.dogs.list", { limit: 500 }),
        sendMessage("request.application.list", {}),
        sendMessage("request.stories.list", { limit: 50 }),
      ])
      const dogs    = dogsRes?.dogs         || []
      const apps    = appsRes?.applications  || []
      const stories = storiesRes?.stories    || []
      setStats({
        dogs:         dogs.filter(d => d.status === 'available').length,
        applications: apps.length,
        pending:      apps.filter(a => (a.status||'').toLowerCase() === 'pending').length,
        stories:      stories.length,
      })
      setRecentApps(apps.slice(0, 5))
    } catch { } finally { setLoading(false) }
  }

  const statusColor = (s) => {
    switch((s||'').toLowerCase()) {
      case 'approved':  return { bg: '#052e16', color: '#4ade80', label: 'Approved' }
      case 'rejected':  return { bg: '#450a0a', color: '#f87171', label: 'Rejected' }
      case 'finalized': return { bg: '#052e16', color: '#4ade80', label: 'Finalized' }
      default:          return { bg: '#1c1917', color: '#fbbf24', label: 'Pending' }
    }
  }

  const fmt = (d) => { try { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) } catch { return d||'' } }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: A.bg }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'40px', overflowY:'auto' }}>

        <div style={{ marginBottom:'32px' }}>
          <h1 style={{ margin:'0 0 6px 0', color: A.text, fontSize:'28px', fontWeight:'700' }}>Overview</h1>
          <p style={{ margin:0, color: A.muted }}>Welcome back, {localStorage.getItem("adminFirstName") || "Admin"}.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'16px', marginBottom:'36px' }}>
          {[
            { label:'Available Dogs',     value: stats.dogs,         path:'/admin/dogs' },
            { label:'Total Applications', value: stats.applications,  path:'/admin/applications' },
            { label:'Pending Review',     value: stats.pending,       path:'/admin/applications', accent: true },
            { label:'Success Stories',    value: stats.stories,       path:'/admin/stories' },
          ].map(card => (
            <div key={card.label} onClick={() => navigate(card.path)} style={{
              background: card.accent && stats.pending > 0 ? '#1a0505' : A.card,
              borderRadius:'12px', padding:'24px',
              border: `1px solid ${card.accent && stats.pending > 0 ? '#7f1d1d' : A.border}`,
              cursor:'pointer', transition:'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = A.red}
            onMouseLeave={e => e.currentTarget.style.borderColor = card.accent && stats.pending > 0 ? '#7f1d1d' : A.border}
            >
              <p style={{ margin:'0 0 10px 0', fontSize:'12px', color: A.subtle, fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' }}>{card.label}</p>
              <p style={{ margin:0, fontSize:'38px', fontWeight:'800', color: card.accent && stats.pending > 0 ? A.red : A.text }}>{loading ? '—' : card.value}</p>
            </div>
          ))}
        </div>

        <div style={{ background: A.card, borderRadius:'12px', border:`1px solid ${A.border}`, overflow:'hidden' }}>
          <div style={{ padding:'18px 24px', borderBottom:`1px solid ${A.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ margin:0, fontSize:'15px', color: A.text, fontWeight:'600' }}>Recent Applications</h2>
            <button onClick={() => navigate('/admin/applications')} style={{ background:'transparent', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'7px 14px', color: A.muted, fontSize:'12px', cursor:'pointer' }}>
              View All
            </button>
          </div>
          {loading ? (
            <div style={{ padding:'24px' }}>
              {[1,2,3].map(i => <div key={i} style={{ height:'14px', background:'#1f1f1f', borderRadius:'6px', marginBottom:'12px' }} />)}
            </div>
          ) : recentApps.length === 0 ? (
            <div style={{ padding:'40px', textAlign:'center', color: A.muted }}>No applications yet.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#111' }}>
                  {['Dog','Applicant','Date','Status','Action'].map(h => (
                    <th key={h} style={{ padding:'11px 24px', textAlign:'left', fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentApps.map((app, i) => {
                  const s = statusColor(app.status)
                  return (
                    <tr key={app.application_id||i} style={{ borderTop:`1px solid ${A.border}` }}>
                      <td style={{ padding:'13px 24px', color: A.text, fontWeight:'600', fontSize:'14px' }}>{app.dog_name||'—'}</td>
                      <td style={{ padding:'13px 24px', color: A.muted, fontSize:'14px' }}>{app.full_name||'—'}</td>
                      <td style={{ padding:'13px 24px', color: A.subtle, fontSize:'13px' }}>{fmt(app.submitted_at)}</td>
                      <td style={{ padding:'13px 24px' }}>
                        <span style={{ background: s.bg, color: s.color, padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>{s.label}</span>
                      </td>
                      <td style={{ padding:'13px 24px' }}>
                        <button onClick={() => navigate('/admin/applications')} style={{ background:'transparent', border:`1px solid ${A.border}`, borderRadius:'6px', padding:'5px 12px', color: A.muted, fontSize:'12px', cursor:'pointer' }}>
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