// Admin moderation page for user-submitted success stories.
// Stories are split into two sections: Pending Approval and Published.
// Admins approve stories to make them visible on the public SuccessStories page.
import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import { useToast } from "../context/toast"
import AdminSidebar from "../components/AdminSidebar"

// Shared dark-theme color tokens used throughout this page.
const A = {
  bg:     '#0a0a0a',
  card:   '#111111',
  border: '#1a1a1a',
  red:    '#dc2626',
  text:   '#f0f0f0',
  muted:  '#777777',
  subtle: '#444444',
}

// Formats a MySQL datetime string into a short readable date.
const fmt = (d) => {
  if (!d) return '—'
  try { return new Date(d.replace(' ', 'T')).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', timeZone:'America/New_York' }) }
  catch { return d }
}

export default function AdminStories() {
  const { addToast } = useToast()
  const [stories, setStories]       = useState([])
  const [loading, setLoading]       = useState(true)
  // Stores the ID+action string of the button currently processing (e.g. "5approve") to show loading state.
  const [processing, setProcessing] = useState(null)
  // Map of story_id → boolean for "Read more / Show less" toggle per card.
  const [expanded, setExpanded]     = useState({})

  useEffect(() => { loadStories() }, [])

  async function loadStories() {
    setLoading(true)
    try {
      const result = await sendMessage("request.stories.list", { limit: 50 })
      setStories(result?.stories || [])
    } catch { setStories([]) } finally { setLoading(false) }
  }

  // Sends the approval request and updates the story's status in local state on success.
  const handleApprove = async (storyId) => {
    setProcessing(storyId + 'approve')
    const adminId = parseInt(localStorage.getItem("adminUserId"))
    try {
      const result = await sendMessage("request.stories.approve", { story_id: storyId, approved_by: adminId })
      if (result?.success) {
        // Optimistically flip the status locally so the card moves to the Published section immediately.
        setStories(prev => prev.map(s => s.story_id === storyId ? { ...s, status: 'approved' } : s))
      } else {
        addToast(result?.error || "Something went wrong. Please try again.", "error")
      }
    } catch {
      addToast("Could not reach the server. Please try again.", "error")
    } finally { setProcessing(null) }
  }

  // Toggles the expanded/collapsed state of a story's text body.
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  // Split the flat stories array into two display sections.
  const pending  = stories.filter(s => (s.status || '') !== 'approved')
  const approved = stories.filter(s => s.status === 'approved')

  const StoryCard = ({ story, showApprove }) => {
    const isExpanded = expanded[story.story_id]
    const text = story.story || ''
    const preview = text.length > 260 ? text.slice(0, 260) + '…' : text
    return (
      <div style={{ background: A.card, borderRadius:'12px', border:`1px solid ${showApprove ? '#7f1d1d' : A.border}`, padding:'22px', display:'flex', flexDirection:'column', gap:'12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px' }}>
          <div style={{ minWidth:0 }}>
            <h3 style={{ margin:'0 0 4px 0', color: A.text, fontSize:'15px', fontWeight:'600', lineHeight:1.3 }}>{story.title}</h3>
            <p style={{ margin:0, color: A.subtle, fontSize:'11px' }}>
              {story.first_name || 'User'} {story.last_name || ''} &bull; {fmt(story.created_at)}
            </p>
          </div>
          <span style={{
            flexShrink: 0,
            background: story.status === 'approved' ? '#052e16' : '#1c1917',
            color:      story.status === 'approved' ? '#4ade80' : '#fbbf24',
            padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600',
          }}>
            {story.status === 'approved' ? 'Published' : 'Pending'}
          </span>
        </div>

        <p style={{ margin:0, color:'#bbb', fontSize:'13px', lineHeight:'1.7', background:'#0d0d0d', padding:'12px 14px', borderRadius:'8px', border:`1px solid ${A.border}` }}>
          {isExpanded ? text : preview}
          {text.length > 260 && (
            <button
              onClick={() => toggleExpand(story.story_id)}
              style={{ background:'none', border:'none', color:'#f87171', fontSize:'12px', cursor:'pointer', marginLeft:'6px', padding:0, fontWeight:'600' }}
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>

        {showApprove && (
          <div>
            <button
              disabled={!!processing}
              onClick={() => handleApprove(story.story_id)}
              style={{ background: A.red, border:'none', borderRadius:'8px', padding:'9px 20px', color:'white', fontWeight:'600', fontSize:'13px', cursor:'pointer', transition:'opacity 0.15s', opacity: processing === story.story_id + 'approve' ? 0.7 : 1 }}
            >
              {processing === story.story_id + 'approve' ? 'Publishing…' : 'Approve & Publish'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: A.bg }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'36px 40px', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ marginBottom:'32px' }}>
          <p style={{ margin:'0 0 4px 0', fontSize:'12px', color: A.subtle, fontWeight:'600', letterSpacing:'0.1em', textTransform:'uppercase' }}>Admin Dashboard</p>
          <h1 style={{ margin:'0 0 4px 0', color: A.text, fontSize:'26px', fontWeight:'700' }}>Success Stories</h1>
          <p style={{ margin:0, color: A.muted, fontSize:'13px' }}>
            {loading ? '—' : `${pending.length} pending approval · ${approved.length} published`}
          </p>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {[1,2,3].map(i => <div key={i} style={{ background: A.card, borderRadius:'12px', padding:'24px', border:`1px solid ${A.border}`, height:'100px' }} />)}
          </div>
        ) : stories.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px', color: A.muted }}>
            <div style={{ fontSize:'36px', marginBottom:'12px', opacity:0.3 }}>⭐</div>
            <p style={{ margin:0, fontSize:'14px' }}>No stories submitted yet.</p>
          </div>
        ) : (
          <>
            {/* Pending section */}
            {pending.length > 0 && (
              <section style={{ marginBottom:'40px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                  <h2 style={{ margin:0, color:'#f87171', fontSize:'12px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                    Pending Approval
                  </h2>
                  <span style={{ background:'rgba(220,38,38,0.15)', color:'#f87171', padding:'2px 8px', borderRadius:'10px', fontSize:'11px', fontWeight:'700' }}>{pending.length}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {pending.map(s => <StoryCard key={s.story_id} story={s} showApprove />)}
                </div>
              </section>
            )}

            {/* Published section */}
            {approved.length > 0 && (
              <section>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                  <h2 style={{ margin:0, color: A.muted, fontSize:'12px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                    Published
                  </h2>
                  <span style={{ background:'#1a1a1a', color: A.subtle, padding:'2px 8px', borderRadius:'10px', fontSize:'11px', fontWeight:'700' }}>{approved.length}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(360px, 1fr))', gap:'10px' }}>
                  {approved.map(s => <StoryCard key={s.story_id} story={s} showApprove={false} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
