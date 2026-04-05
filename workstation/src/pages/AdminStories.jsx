import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

export default function AdminStories() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => { loadStories() }, [])

  async function loadStories() {
    setLoading(true)
    try {
      const result = await sendMessage("request.stories.list", { limit: 50 })
      setStories(result?.stories || [])
    } catch (err) {
      setStories([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (storyId) => {
    setProcessing(storyId)
    const adminId = parseInt(localStorage.getItem("adminUserId"))
    try {
      const result = await sendMessage("request.stories.approve", {
        story_id: storyId,
        approved_by: adminId,
      })
      if (result?.success) {
        setStories((prev) => prev.map((s) => s.story_id === storyId ? { ...s, status: "approved" } : s))
      }
    } catch (err) {
      // silent
    } finally {
      setProcessing(null)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
    catch { return dateStr }
  }

  const pending = stories.filter((s) => s.status !== "approved")
  const approved = stories.filter((s) => s.status === "approved")

  const StoryCard = ({ story, showApprove }) => (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #efdfd1', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', color: '#2f241d', fontSize: '16px' }}>{story.title}</h3>
          <p style={{ margin: 0, color: '#6f5848', fontSize: '13px' }}>
            By {story.first_name || "User"} {story.last_name || ""} &bull; {formatDate(story.created_at)}
          </p>
        </div>
        <span className={`status-badge ${story.status === "approved" ? "approved" : "pending"}`} style={{ textTransform: 'capitalize' }}>
          {story.status === "approved" ? "Approved" : "Pending"}
        </span>
      </div>
      <p style={{ margin: '0 0 16px 0', color: '#2f241d', fontSize: '14px', lineHeight: '1.6' }}>
        {story.story?.length > 300 ? story.story.slice(0, 300) + "..." : story.story}
      </p>
      {showApprove && (
        <button
          className="btn btn-primary"
          style={{ fontSize: '13px' }}
          disabled={processing === story.story_id}
          onClick={() => handleApprove(story.story_id)}
        >
          {processing === story.story_id ? "Approving..." : "Approve Story"}
        </button>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fdf6ef' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: '0 0 6px 0', color: '#2f241d', fontSize: '28px' }}>Success Stories</h1>
          <p style={{ margin: 0, color: '#6f5848' }}>{pending.length} pending approval.</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #efdfd1' }}>
                <div style={{ height: '16px', width: '40%', background: '#e0e0e0', borderRadius: '6px', marginBottom: '10px' }} />
                <div style={{ height: '14px', background: '#e0e0e0', borderRadius: '6px', marginBottom: '8px' }} />
                <div style={{ height: '14px', width: '70%', background: '#e0e0e0', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section style={{ marginBottom: '40px' }}>
                <h2 style={{ margin: '0 0 16px 0', color: '#2f241d', fontSize: '16px', fontWeight: '700' }}>Pending Approval</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pending.map((s) => <StoryCard key={s.story_id} story={s} showApprove />)}
                </div>
              </section>
            )}

            {approved.length > 0 && (
              <section>
                <h2 style={{ margin: '0 0 16px 0', color: '#2f241d', fontSize: '16px', fontWeight: '700' }}>Published Stories</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {approved.map((s) => <StoryCard key={s.story_id} story={s} showApprove={false} />)}
                </div>
              </section>
            )}

            {stories.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6f5848' }}>No stories submitted yet.</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
