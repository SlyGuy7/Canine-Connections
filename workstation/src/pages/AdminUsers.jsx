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

const AVATAR_COLORS = ['#7c3aed','#0369a1','#047857','#b45309','#be123c','#0e7490']

const avatarColor = (id) => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]

const roleStyle = (role) => {
  switch (role) {
    case 'admin':         return { bg:'#450a0a', color:'#f87171', label:'Admin' }
    case 'shelter_staff': return { bg:'#0c1a4a', color:'#60a5fa', label:'Staff' }
    default:              return { bg:'#1c1917', color:'#fbbf24', label:'Adopter' }
  }
}

export default function AdminUsers() {
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const result = await sendMessage("request.application.list", {})
      const apps = result?.applications || []
      const seen = new Set()
      const extracted = []
      apps.forEach(a => {
        if (a.user_id && !seen.has(a.user_id)) {
          seen.add(a.user_id)
          const userApps = apps.filter(x => x.user_id === a.user_id)
          extracted.push({
            user_id:      a.user_id,
            first_name:   a.first_name || "",
            last_name:    a.last_name  || "",
            email:        a.email      || "",
            role:         a.role       || "adopter",
            applications: userApps.length,
            approved:     userApps.filter(x => (x.status||'').toLowerCase() === 'approved').length,
            finalized:    userApps.filter(x => (x.status||'').toLowerCase() === 'finalized').length,
          })
        }
      })
      setUsers(extracted)
    } catch { setUsers([]) } finally { setLoading(false) }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)
  })

  const fullName = (u) => `${u.first_name} ${u.last_name}`.trim() || `User #${u.user_id}`
  const initials = (u) => {
    if (u.first_name && u.last_name) return (u.first_name[0] + u.last_name[0]).toUpperCase()
    if (u.first_name) return u.first_name[0].toUpperCase()
    if (u.email) return u.email[0].toUpperCase()
    return '?'
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: A.bg }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'36px 40px', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ marginBottom:'28px' }}>
          <p style={{ margin:'0 0 4px 0', fontSize:'12px', color: A.subtle, fontWeight:'600', letterSpacing:'0.1em', textTransform:'uppercase' }}>Admin Dashboard</p>
          <h1 style={{ margin:'0 0 4px 0', color: A.text, fontSize:'26px', fontWeight:'700' }}>Users</h1>
          <p style={{ margin:0, color: A.muted, fontSize:'13px' }}>
            {loading ? '—' : `${users.length} users with adoption activity`}
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom:'20px' }}>
          <input
            style={{ background:'#0d0d0d', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'9px 14px', color: A.text, fontSize:'13px', outline:'none', width:'280px' }}
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ background: A.card, borderRadius:'10px', padding:'18px', border:`1px solid ${A.border}`, height:'52px' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px', color: A.muted }}>
            <div style={{ fontSize:'36px', marginBottom:'12px', opacity:0.3 }}>👤</div>
            <p style={{ margin:0, fontSize:'14px' }}>No users found.</p>
          </div>
        ) : (
          <div style={{ background: A.card, borderRadius:'12px', border:`1px solid ${A.border}`, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#0d0d0d' }}>
                  {['User','Email','Role','Apps','Approved / Finalized'].map(h => (
                    <th key={h} style={{ padding:'10px 24px', textAlign:'left', fontSize:'10px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const rs = roleStyle(u.role)
                  const hovered = hoveredRow === u.user_id
                  const color = avatarColor(u.user_id)
                  return (
                    <tr
                      key={u.user_id}
                      style={{ borderTop:`1px solid ${A.border}`, background: hovered ? '#141414' : 'transparent', transition:'background 0.1s' }}
                      onMouseEnter={() => setHoveredRow(u.user_id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={{ padding:'12px 24px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          <div style={{ width:'34px', height:'34px', borderRadius:'10px', background: color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <span style={{ color:'white', fontSize:'12px', fontWeight:'700' }}>{initials(u)}</span>
                          </div>
                          <div>
                            <p style={{ margin:'0 0 1px 0', color: A.text, fontWeight:'600', fontSize:'13px' }}>{fullName(u)}</p>
                            <p style={{ margin:0, color: A.subtle, fontSize:'11px' }}>ID #{u.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'12px 24px', color: A.muted, fontSize:'13px' }}>{u.email || '—'}</td>
                      <td style={{ padding:'12px 24px' }}>
                        <span style={{ background: rs.bg, color: rs.color, padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{rs.label}</span>
                      </td>
                      <td style={{ padding:'12px 24px', color: A.muted, fontSize:'13px' }}>{u.applications}</td>
                      <td style={{ padding:'12px 24px' }}>
                        {u.approved > 0 || u.finalized > 0 ? (
                          <div style={{ display:'flex', gap:'6px' }}>
                            {u.approved > 0 && (
                              <span style={{ background:'#052e16', color:'#4ade80', padding:'2px 8px', borderRadius:'12px', fontSize:'11px', fontWeight:'600' }}>
                                {u.approved} approved
                              </span>
                            )}
                            {u.finalized > 0 && (
                              <span style={{ background:'#0c1a4a', color:'#60a5fa', padding:'2px 8px', borderRadius:'12px', fontSize:'11px', fontWeight:'600' }}>
                                {u.finalized} finalized
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: A.subtle, fontSize:'13px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
