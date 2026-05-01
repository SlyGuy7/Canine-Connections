import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

const A = {
  bg:'#0d0d0d', card:'#141414', border:'#1f1f1f',
  red:'#dc2626', text:'#ffffff', muted:'#888888', subtle:'#555555',
}

export default function AdminUsers() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState("")

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
          extracted.push({
            user_id:      a.user_id,
            first_name:   a.first_name || "",
            last_name:    a.last_name  || "",
            email:        a.email      || "",
            role:         a.role       || "adopter",
            applications: apps.filter(x => x.user_id === a.user_id).length,
            approved:     apps.filter(x => x.user_id === a.user_id && (x.status||'').toLowerCase() === 'approved').length,
          })
        }
      })
      setUsers(extracted)
    } catch { setUsers([]) } finally { setLoading(false) }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (u.first_name + ' ' + u.last_name).toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)
  })

  const roleStyle = (role) => {
    switch(role) {
      case 'admin':         return { bg:'#450a0a', color:'#f87171' }
      case 'shelter_staff': return { bg:'#0c1a4a', color:'#60a5fa' }
      default:              return { bg:'#1c1917', color:'#fbbf24' }
    }
  }

  const inputStyle = { background:'#111', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'9px 14px', color: A.text, fontSize:'13px', outline:'none' }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: A.bg }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'40px', overflowY:'auto' }}>

        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ margin:'0 0 6px 0', color: A.text, fontSize:'28px', fontWeight:'700' }}>Users</h1>
          <p style={{ margin:0, color: A.muted }}>{users.length} users with adoption activity.</p>
        </div>

        <div style={{ marginBottom:'20px' }}>
          <input style={{ ...inputStyle, width:'300px' }} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[1,2,3,4].map(i => <div key={i} style={{ background: A.card, borderRadius:'10px', padding:'20px', border:`1px solid ${A.border}`, height:'50px' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color: A.muted }}>No users found.</div>
        ) : (
          <div style={{ background: A.card, borderRadius:'12px', border:`1px solid ${A.border}`, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#111' }}>
                  {['Name','Email','Role','Applications','Approved'].map(h => (
                    <th key={h} style={{ padding:'11px 24px', textAlign:'left', fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const rs = roleStyle(u.role)
                  return (
                    <tr key={u.user_id} style={{ borderTop:`1px solid ${A.border}` }}>
                      <td style={{ padding:'13px 24px', color: A.text, fontWeight:'600', fontSize:'14px' }}>
                        {u.first_name||u.last_name ? `${u.first_name} ${u.last_name}`.trim() : `User #${u.user_id}`}
                      </td>
                      <td style={{ padding:'13px 24px', color: A.muted, fontSize:'13px' }}>{u.email||'—'}</td>
                      <td style={{ padding:'13px 24px' }}>
                        <span style={{ background: rs.bg, color: rs.color, padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600', textTransform:'capitalize' }}>{u.role||'adopter'}</span>
                      </td>
                      <td style={{ padding:'13px 24px', color: A.muted, fontSize:'14px' }}>{u.applications}</td>
                      <td style={{ padding:'13px 24px', color:'#4ade80', fontSize:'14px' }}>{u.approved}</td>
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