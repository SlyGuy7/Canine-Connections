import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

export default function AdminUsers() {
  const [applications, setApplications] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const result = await sendMessage("request.application.list", {})
      const apps = result?.applications || []
      setApplications(apps)

      const seen = new Set()
      const extracted = []
      apps.forEach((a) => {
        if (a.user_id && !seen.has(a.user_id)) {
          seen.add(a.user_id)
          extracted.push({
            user_id:    a.user_id,
            first_name: a.first_name || "",
            last_name:  a.last_name  || "",
            email:      a.email      || "",
            role:       a.role       || "adopter",
            applications: apps.filter((x) => x.user_id === a.user_id).length,
          })
        }
      })
      setUsers(extracted)
    } catch (err) {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      (u.first_name + " " + u.last_name).toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    )
  })

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":         return "approved"
      case "shelter_staff": return "review"
      default:              return "pending"
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fdf6ef' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: '0 0 6px 0', color: '#2f241d', fontSize: '28px' }}>Users</h1>
          <p style={{ margin: 0, color: '#6f5848' }}>
            {users.length} registered users with adoption activity.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            className="form-input"
            style={{ maxWidth: '320px' }}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #efdfd1' }}>
                <div style={{ height: '16px', width: '30%', background: '#e0e0e0', borderRadius: '6px', marginBottom: '10px' }} />
                <div style={{ height: '14px', width: '50%', background: '#e0e0e0', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6f5848' }}>No users found.</div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #efdfd1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fdf6ef' }}>
                  {["Name", "Email", "Role", "Applications"].map((h) => (
                    <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#6f5848', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.user_id} style={{ borderTop: '1px solid #f1ebe5' }}>
                    <td style={{ padding: '14px 24px', color: '#2f241d', fontWeight: '600' }}>
                      {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : "User #" + u.user_id}
                    </td>
                    <td style={{ padding: '14px 24px', color: '#6f5848', fontSize: '14px' }}>{u.email || "-"}</td>
                    <td style={{ padding: '14px 24px' }}>
                      <span className={`status-badge ${getRoleBadge(u.role)}`} style={{ textTransform: 'capitalize' }}>
                        {u.role || "adopter"}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px', color: '#6f5848', fontSize: '14px' }}>{u.applications}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
