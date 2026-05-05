import React, { useState, useEffect } from "react"
import { sendMessage } from "../services/messaging"

const CATEGORIES = [
  { value: "all",       label: "All Resources" },
  { value: "training",  label: "Training" },
  { value: "nutrition", label: "Nutrition" },
  { value: "health",    label: "Health" },
  { value: "behavior",  label: "Behavior" },
  { value: "general",   label: "General" },
]

const CATEGORY_STYLES = {
  training:  { bg: "#dcfce7", color: "#166534" },
  nutrition: { bg: "#fef9c3", color: "#854d0e" },
  health:    { bg: "#dbeafe", color: "#1e40af" },
  behavior:  { bg: "#f3e8ff", color: "#6b21a8" },
  general:   { bg: "#f1f5f9", color: "#475569" },
}

const TYPE_ICONS = { article: "📄", video: "🎬", link: "🔗" }

export default function Resources() {
  const [resources, setResources] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [search, setSearch]       = useState("")

  useEffect(() => { loadResources() }, [])

  async function loadResources() {
    setLoading(true)
    setError("")
    try {
      const result = await sendMessage("request.resources.list", { limit: 100 })
      if (result?.success) {
        setResources(result.resources || [])
      } else {
        setError("Failed to load resources.")
      }
    } catch {
      setError("Could not connect to server.")
    } finally {
      setLoading(false)
    }
  }

  const filtered = resources.filter(r => {
    const matchCat    = activeCategory === "all" || r.category === activeCategory
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const grouped = CATEGORIES.slice(1).reduce((acc, cat) => {
    const items = filtered.filter(r => r.category === cat.value)
    if (items.length > 0) acc[cat.value] = items
    return acc
  }, {})

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 0 60px 0" }}>

        <header style={{ marginBottom: "28px" }}>
          <h1 style={{ margin: "0 0 6px 0", color: "#2f241d", fontSize: "28px", fontWeight: "800" }}>
            Educational Resources
          </h1>
          <p style={{ margin: 0, color: "#78716c", fontSize: "15px" }}>
            Guides and articles to help you give your dog the best life possible.
          </p>
        </header>

        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
          <input
            className="form-input"
            style={{ maxWidth: "320px", width: "100%" }}
            placeholder="Search resources..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "32px" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              style={{
                padding: "8px 18px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600",
                background: activeCategory === cat.value ? "#d97706" : "#f5ede4",
                color: activeCategory === cat.value ? "white" : "#6f5848",
                transition: "all 0.15s",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", color: "#dc2626", marginBottom: "20px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: "white", borderRadius: "16px", border: "1px solid #efdfd1", padding: "24px" }}>
                <div style={{ height: "14px", width: "30%", background: "#e0d5cc", borderRadius: "6px", marginBottom: "12px" }} />
                <div style={{ height: "16px", width: "80%", background: "#e0d5cc", borderRadius: "6px", marginBottom: "10px" }} />
                <div style={{ height: "12px", width: "60%", background: "#e0d5cc", borderRadius: "6px" }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 40px", background: "white", borderRadius: "20px", border: "1px solid #efdfd1" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px" }}>📚</div>
            <h2 style={{ margin: "0 0 8px 0", color: "#2f241d", fontSize: "20px" }}>No resources found</h2>
            <p style={{ margin: 0, color: "#78716c" }}>Try a different category or search term.</p>
          </div>
        ) : activeCategory !== "all" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {filtered.map(r => <ResourceCard key={r.resource_id} resource={r} />)}
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            const catInfo = CATEGORIES.find(c => c.value === cat)
            return (
              <div key={cat} style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <h2 style={{ margin: 0, color: "#2f241d", fontSize: "18px", fontWeight: "700" }}>{catInfo?.label}</h2>
                  <button
                    onClick={() => setActiveCategory(cat)}
                    style={{ background: "none", border: "none", color: "#b45309", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                  >
                    View all
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                  {items.map(r => <ResourceCard key={r.resource_id} resource={r} />)}
                </div>
              </div>
            )
          })
        )}
    </div>
  )
}

function ResourceCard({ resource }) {
  const catStyle  = CATEGORY_STYLES[resource.category] || CATEGORY_STYLES.general
  const typeIcon  = TYPE_ICONS[resource.content_type]  || "📄"

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{ background: "white", borderRadius: "16px", border: "1px solid #efdfd1", padding: "22px", height: "100%", boxSizing: "border-box", transition: "transform 0.15s, box-shadow 0.15s", cursor: "pointer" }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)" }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <span style={{ padding: "3px 10px", borderRadius: "20px", background: catStyle.bg, color: catStyle.color, fontSize: "11px", fontWeight: "700", textTransform: "capitalize" }}>
            {resource.category}
          </span>
          <span style={{ fontSize: "13px" }}>{typeIcon}</span>
        </div>

        <h3 style={{ margin: "0 0 8px 0", color: "#2f241d", fontSize: "15px", fontWeight: "700", lineHeight: "1.4" }}>
          {resource.title}
        </h3>

        {resource.description && (
          <p style={{ margin: "0 0 16px 0", color: "#6f5848", fontSize: "13px", lineHeight: "1.6" }}>
            {resource.description}
          </p>
        )}

        <span style={{ fontSize: "13px", color: "#b45309", fontWeight: "600" }}>
          Read more →
        </span>
      </div>
    </a>
  )
}