// Pet adoption journal — lets users create, edit, and delete dated log entries (vet visits,
// training sessions, milestones, etc.). Entries are stored via RabbitMQ messages and cached
// in localStorage under "journal_entries" so other parts of the app can read them without
// an extra fetch.
import React, { useState, useEffect, useEffectEvent } from "react"
import { formatEnum } from "../utils/format"
import { sendMessage } from "../services/messaging"
import { useToast } from "../context/toast"
import { NotebookPen, Sparkles } from "lucide-react"

// Pre-written milestone prompts shown as quick-start chips when a user has fewer than 3 entries.
// Each milestone carries a hint string that pre-fills the Notes textarea placeholder.
const MILESTONES = [
  { title: "First Week Home",       type: "Milestone", hint: "How did the first week go? Any settling-in moments worth remembering?" },
  { title: "First Vet Visit",       type: "Vet Visit", hint: "Record the vet's name, clinic, vaccinations given, and any health notes." },
  { title: "First Walk",            type: "Walk",      hint: "Where did you go? How did they do on the leash?" },
  { title: "First Training Session", type: "Training", hint: "What commands did you work on? Any breakthroughs?" },
  { title: "One Month Milestone",   type: "Milestone", hint: "How have things changed since adoption day? What's your dog's personality like?" },
]

// All supported entry categories with their badge colours; used in the type picker and filter tabs.
const LOG_TYPES = [
  { value: "Milestone", label: "Milestone", bg: "#fef9c3", color: "#854d0e" },
  { value: "Vet Visit", label: "Vet Visit", bg: "#dbeafe", color: "#1e40af" },
  { value: "Training",  label: "Training",  bg: "#dcfce7", color: "#166534" },
  { value: "Walk",      label: "Walk",      bg: "#f3e8ff", color: "#6b21a8" },
  { value: "Note",      label: "Note",      bg: "#f1f5f9", color: "#475569" },
]

// Returns the bg/color pair for a given log type, defaulting to the Note style for unknown types.
function getTypeStyle(type) {
  return LOG_TYPES.find(t => t.value === type) || { bg: "#f1f5f9", color: "#475569" }
}

function formatDate(dateStr) {
  if (!dateStr) return ""
  const d = new Date(dateStr.replace(" ", "T"))
  return isNaN(d) ? dateStr : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" })
}

// Default form state — reused every time the modal is closed or opened for a new entry.
// hint is not a persisted field; it just pre-fills the textarea placeholder for milestone prompts.
const BLANK = { log_id: null, title: "", log_type: "Note", notes: "", hint: "", log_date: new Date().toISOString().split("T")[0] }

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

  // Effect event: always calls the latest version without re-running the effect.
  const onMountLoad = useEffectEvent(() => loadEntries());
  useEffect(() => { onMountLoad() }, [])

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
      // The API has no "update" endpoint, so edits are implemented as delete-then-recreate.
      // The old entry is deleted first, then a new one is created with the updated fields.
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

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", color: "var(--text-primary)", boxSizing: "border-box", background: "var(--bg-primary)" }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 0 60px 0" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>Pet Journal</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "15px" }}>
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

      {/* Milestone prompts — show when few entries */}
      {!loading && entries.length < 3 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "20px", padding: "20px 24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Sparkles size={16} color="#d97706" />
            <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>Suggested Milestones</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>— tap one to start an entry</span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {MILESTONES.map(m => {
              const already = entries.some(e => e.title === m.title)
              if (already) return null
              const ts = getTypeStyle(m.type)
              return (
                <button
                  key={m.title}
                  onClick={() => { setForm({ ...BLANK, title: m.title, log_type: m.type, hint: m.hint }); setIsModalOpen(true); }}
                  style={{ padding: "8px 14px", borderRadius: "20px", border: `1px solid ${ts.color}30`, background: ts.bg, color: ts.color, fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  + {m.title}
                </button>
              )
            })}
          </div>
        </div>
      )}

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
            <div key={i} style={{ background: "var(--card-bg)", borderRadius: "20px", border: "1px solid var(--border)", padding: "24px 28px" }}>
              <div style={{ height: "14px", width: "40%", background: "#e0d5cc", borderRadius: "6px", marginBottom: "12px" }} />
              <div style={{ height: "12px", width: "70%", background: "#e0d5cc", borderRadius: "6px" }} />
            </div>
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div style={{ textAlign: "center", padding: "100px 40px", background: "var(--card-bg)", borderRadius: "24px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}><NotebookPen size={51} strokeWidth={1.5} /></div>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>No memories yet</h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "15px", maxWidth: "340px", display: "inline-block" }}>
            Record vet visits, training wins, milestones, or just a great walk.
          </p>
        </div>
      )}

      {!loading && entries.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", background: "var(--card-bg)", borderRadius: "20px", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          No {filterType} entries yet.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filtered.map(entry => {
          const typeStyle  = getTypeStyle(entry.log_type)
          const isDeleting = deleteId === entry.log_id
          return (
            <div key={entry.log_id}
              style={{ background: "var(--card-bg)", borderRadius: "20px", border: "1px solid var(--border)", padding: "24px 28px" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ padding: "4px 12px", borderRadius: "20px", background: typeStyle.bg, color: typeStyle.color, fontSize: "12px", fontWeight: "700" }}>
                  {formatEnum(entry.log_type || "note")}
                </span>
                <span style={{ fontSize: "13px", color: "var(--text-subtle)" }}>{formatDate(entry.log_date)}</span>
              </div>

              <h3 style={{ margin: "0 0 8px 0", fontSize: "17px", fontWeight: "700", color: "var(--text-primary)" }}>{entry.title}</h3>
              <p style={{ margin: "0 0 20px 0", color: "var(--text-muted)", lineHeight: "1.7", fontSize: "14px", whiteSpace: "pre-wrap" }}>{entry.notes}</p>

              {isDeleting ? (
                <div style={{ display: "flex", gap: "10px", alignItems: "center", padding: "12px 16px", background: "var(--danger-soft)", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#dc2626", fontWeight: "600", flex: 1 }}>Delete this entry?</span>
                  <button onClick={() => handleDelete(entry.log_id)} style={{ padding: "7px 16px", borderRadius: "8px", border: "none", background: "#ef4444", color: "white", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>Delete</button>
                  <button onClick={() => setDeleteId(null)} style={{ padding: "7px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-muted)", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => startEdit(entry)} style={{ padding: "9px 20px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => setDeleteId(entry.log_id)} style={{ padding: "9px 20px", borderRadius: "10px", border: "1px solid #fca5a5", background: "var(--card-bg)", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>Delete</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isModalOpen && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, background: "rgba(47,36,29,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--card-bg)", width: "100%", maxWidth: "520px", borderRadius: "24px", padding: "36px", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>{editingId ? "Edit Entry" : "New Journal Entry"}</h2>
              <button onClick={closeModal} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "#f3e8de", color: "var(--text-muted)", fontSize: "16px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "var(--text-muted)" }}>Entry Type</label>
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
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "var(--text-muted)" }}>Title</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. First vet visit" required style={inputStyle} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "var(--text-muted)" }}>Notes</label>
                <textarea rows="4" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={form.hint || "Write your memory here…"} required style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6", color: "var(--text-primary)" }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "var(--text-muted)" }}>Date</label>
                <input type="date" value={form.log_date} onChange={e => setForm({ ...form, log_date: e.target.value })} required style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="button" onClick={closeModal} style={{ flex: 1, padding: "13px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
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