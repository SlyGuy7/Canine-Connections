import React, { useState, useEffect } from "react"
import { sendMessage } from "../services/messaging"
import { useToast } from "../context/ToastContext"

const LOG_TYPES = [
  { value: "Milestone", label: "Milestone", bg: "#fef9c3", color: "#854d0e" },
  { value: "Vet Visit", label: "Vet Visit", bg: "#dbeafe", color: "#1e40af" },
  { value: "Training",  label: "Training",  bg: "#dcfce7", color: "#166534" },
  { value: "Walk",      label: "Walk",      bg: "#f3e8ff", color: "#6b21a8" },
  { value: "Note",      label: "Note",      bg: "#f1f5f9", color: "#475569" },
]

function getTypeStyle(type) {
  return LOG_TYPES.find(t => t.value === type) || { bg: "#f1f5f9", color: "#475569" }
}

function formatDate(dateStr) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return isNaN(d) ? dateStr : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

const BLANK = { log_id: null, title: "", log_type: "Note", notes: "", log_date: new Date().toISOString().split("T")[0] }

export default function Journal() {
  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(BLANK)
  const [deleteId, setDeleteId]   = useState(null)
  const [filterType, setFilterType] = useState("All")
  const { addToast } = useToast()

  const userId = parseInt(localStorage.getItem("userId") || "0")

  useEffect(() => { loadEntries() }, [])

  async function loadEntries() {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await sendMessage("request.adoption.log.list", { user_id: userId, dog_id: 0 })
      if (result?.success) {
        const logs = result.logs || []
        setEntries(logs)
        localStorage.setItem("journal_entries", JSON.stringify(logs))
      } else {
        setEntries([])
      }
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await sendMessage("request.adoption.log.delete", { log_id: editingId, user_id: userId })
      }
      const result = await sendMessage("request.adoption.log.create", {
        user_id: userId,
        dog_id:  0,
        log_type: form.log_type,
        title:    form.title,
        notes:    form.notes,
        log_date: form.log_date,
      })
      if (result?.success) {
        addToast(editingId ? "Entry updated" : "Entry saved", "success")
        closeModal()
        loadEntries()
      } else {
        addToast("Failed to save entry", "error")
      }
    } catch {
      addToast("Connection error", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(logId) {
    try {
      const result = await sendMessage("request.adoption.log.delete", { log_id: logId, user_id: userId })
      if (result?.success) {
        setEntries(prev => prev.filter(e => e.log_id !== logId))
        addToast("Entry deleted", "success")
      } else {
        addToast("Failed to delete entry", "error")
      }
    } catch {
      addToast("Connection error", "error")
    } finally {
      setDeleteId(null)
    }
  }

  function startEdit(entry) {
    setForm({ log_id: entry.log_id, title: entry.title, log_type: entry.log_type, notes: entry.notes, log_date: entry.log_date?.split("T")[0] || entry.log_date })
    setEditingId(entry.log_id)
    setIsModalOpen(true)
  }

  function closeModal() {
    setForm(BLANK)
    setEditingId(null)
    setIsModalOpen(false)
  }

  const filtered = filterType === "All" ? entries : entries.filter(e => e.log_type === filterType)

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #e2d9d0", fontSize: "14px", outline: "none", color: "#2f241d", boxSizing: "border-box", background: "#fffaf5" }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 0 60px 0" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>Pet Journal</h1>
          <p style={{ margin: 0, color: "#78716c", fontSize: "15px" }}>
            {loading ? "Loading..." : entries.length === 0 ? "Your memories will appear here." : `${entries.length} entr${entries.length !== 1 ? "ies" : "y"} recorded`}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{ padding: "12px 22px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(217,119,6,0.25)" }}
        >
          + Add Entry
        </button>
      </div>

      {entries.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
          {["All", ...LOG_TYPES.map(t => t.value)].map(type => {
            const active = filterType === type
            const style  = type !== "All" ? getTypeStyle(type) : null
            return (
              <button key={type} onClick={() => setFilterType(type)}
                style={{ padding: "7px 16px", borderRadius: "20px", border: active ? "none" : "1px solid #e2d9d0", background: active ? (style?.bg || "#2f241d") : "white", color: active ? (style?.color || "white") : "#78716c", fontWeight: active ? "700" : "500", fontSize: "13px", cursor: "pointer" }}>
                {type}
              </button>
            )
          })}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: "white", borderRadius: "20px", border: "1px solid #efdfd1", padding: "24px 28px" }}>
              <div style={{ height: "14px", width: "40%", background: "#e0d5cc", borderRadius: "6px", marginBottom: "12px" }} />
              <div style={{ height: "12px", width: "70%", background: "#e0d5cc", borderRadius: "6px" }} />
            </div>
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div style={{ textAlign: "center", padding: "100px 40px", background: "white", borderRadius: "24px", border: "1px solid #efdfd1" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>📖</div>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "22px", fontWeight: "800", color: "#2f241d" }}>No memories yet</h2>
          <p style={{ margin: 0, color: "#78716c", fontSize: "15px", maxWidth: "340px", display: "inline-block" }}>
            Record vet visits, training wins, milestones, or just a great walk.
          </p>
        </div>
      )}

      {!loading && entries.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "20px", border: "1px solid #efdfd1", color: "#78716c" }}>
          No {filterType} entries yet.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filtered.map(entry => {
          const typeStyle  = getTypeStyle(entry.log_type)
          const isDeleting = deleteId === entry.log_id
          return (
            <div key={entry.log_id}
              style={{ background: "white", borderRadius: "20px", border: "1px solid #efdfd1", padding: "24px 28px" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ padding: "4px 12px", borderRadius: "20px", background: typeStyle.bg, color: typeStyle.color, fontSize: "12px", fontWeight: "700" }}>
                  {entry.log_type || "Note"}
                </span>
                <span style={{ fontSize: "13px", color: "#a8a29e" }}>{formatDate(entry.log_date)}</span>
              </div>

              <h3 style={{ margin: "0 0 8px 0", fontSize: "17px", fontWeight: "700", color: "#2f241d" }}>{entry.title}</h3>
              <p style={{ margin: "0 0 20px 0", color: "#6f5848", lineHeight: "1.7", fontSize: "14px", whiteSpace: "pre-wrap" }}>{entry.notes}</p>

              {isDeleting ? (
                <div style={{ display: "flex", gap: "10px", alignItems: "center", padding: "12px 16px", background: "#fff1f2", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#dc2626", fontWeight: "600", flex: 1 }}>Delete this entry?</span>
                  <button onClick={() => handleDelete(entry.log_id)} style={{ padding: "7px 16px", borderRadius: "8px", border: "none", background: "#ef4444", color: "white", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>Delete</button>
                  <button onClick={() => setDeleteId(null)} style={{ padding: "7px 16px", borderRadius: "8px", border: "1px solid #e2d9d0", background: "white", color: "#6f5848", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => startEdit(entry)} style={{ padding: "9px 20px", borderRadius: "10px", border: "1px solid #e2d9d0", background: "white", color: "#2f241d", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => setDeleteId(entry.log_id)} style={{ padding: "9px 20px", borderRadius: "10px", border: "1px solid #fca5a5", background: "white", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>Delete</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isModalOpen && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, background: "rgba(47,36,29,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", width: "100%", maxWidth: "520px", borderRadius: "24px", padding: "36px", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#2f241d" }}>{editingId ? "Edit Entry" : "New Journal Entry"}</h2>
              <button onClick={closeModal} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "#f3e8de", color: "#6f5848", fontSize: "16px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#6f5848" }}>Entry Type</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {LOG_TYPES.map(t => {
                    const active = form.log_type === t.value
                    return (
                      <button type="button" key={t.value} onClick={() => setForm({ ...form, log_type: t.value })}
                        style={{ padding: "7px 14px", borderRadius: "20px", border: active ? "none" : "1px solid #e2d9d0", background: active ? t.bg : "white", color: active ? t.color : "#78716c", fontWeight: active ? "700" : "500", fontSize: "13px", cursor: "pointer" }}>
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#6f5848" }}>Title</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. First vet visit" required style={inputStyle} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#6f5848" }}>Notes</label>
                <textarea rows="4" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Write your memory here..." required style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#6f5848" }}>Date</label>
                <input type="date" value={form.log_date} onChange={e => setForm({ ...form, log_date: e.target.value })} required style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="button" onClick={closeModal} style={{ flex: 1, padding: "13px", borderRadius: "10px", border: "1px solid #e2d9d0", background: "white", color: "#2f241d", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: "13px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
                  {saving ? "Saving..." : editingId ? "Update Entry" : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}