import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

const A = {
  bg:'#0d0d0d', card:'#141414', border:'#1f1f1f',
  red:'#dc2626', text:'#ffffff', muted:'#888888', subtle:'#555555',
}

export default function AdminStories() {
  const [stories, setStories]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => { loadStories() }, [])

  async function loadStories() {
    setLoading(true)
    try {
      const result = await sendMessage("request.stories.list", { limit: 50 })
      setStories(result?.stories || [])
    } catch { setStories([]) } finally { setLoading(false) }
  }

  const handleApprove = async (storyId) => {
    setProcessing(storyId)
    const adminId = parseInt(localStorage.getItem("adminUserId"))
    try {
      const result = await sendMessage("request.stories.approve", { story_id: storyId, approved_by: adminId })
      if (result?.success) {
        setStories(prev => prev.map(s => s.story_id === storyId ? { ...s, status: 'approved' } : s))
      }
    } catch { } finally { setProcessing(null) }
  }

  const fmt = (d) => { try { const iso = d.replace(" ","T"); return new Date(iso.includes("T") ? iso+"Z" : iso+"T12:00:00Z").toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'}) } catch { return d||'' } }

  const pending  = stories.filter(s => s.status !== 'approved')
  const approved = stories.filter(s => s.status === 'approved')

  const Card = ({ story, showApprove }) => (
    <div style={{ background: A.card, borderRadius:'12px', border:`1px solid ${A.border}`, padding:'24px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'10px', marginBottom:'12px' }}>
        <div>
          <h3 style={{ margin:'0 0 4px 0', color: A.text, fontSize:'16px', fontWeight:'600' }}>{story.title}</h3>
          <p style={{ margin:0, color: A.subtle, fontSize:'12px' }}>
            By {story.first_name||'User'} {story.last_name||''} &bull; {fmt(story.created_at)}
          </p>
        </div>
        <span style={{
          background: story.status === 'approved' ? '#052e16' : '#1c1917',
          color:      story.status === 'approved' ? '#4ade80' : '#fbbf24',
          padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600',
        }}>
          {story.status === 'approved' ? 'Published' : 'Pending'}
        </span>
      </div>
      <p style={{ margin:'0 0 16px 0', color:'#aaa', fontSize:'14px', lineHeight:'1.6', background:'#111', padding:'12px', borderRadius:'8px' }}>
        {story.story?.length > 300 ? story.story.slice(0, 300) + '...' : story.story}
      </p>
      {showApprove && (
        <button
          disabled={processing === story.story_id}
          onClick={() => handleApprove(story.story_id)}
          style={{ background: A.red, border:'none', borderRadius:'8px', padding:'9px 20px', color:'white', fontWeight:'600', fontSize:'13px', cursor:'pointer' }}
        >
          {processing === story.story_id ? 'Publishing...' : 'Approve & Publish'}
        </button>
      )}
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: A.bg }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'40px', overflowY:'auto' }}>

        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ margin:'0 0 6px 0', color: A.text, fontSize:'28px', fontWeight:'700' }}>Success Stories</h1>
          <p style={{ margin:0, color: A.muted }}>{pending.length} pending approval.</p>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {[1,2].map(i => <div key={i} style={{ background: A.card, borderRadius:'12px', padding:'24px', border:`1px solid ${A.border}`, height:'80px' }} />)}
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section style={{ marginBottom:'40px' }}>
                <h2 style={{ margin:'0 0 16px 0', color: A.red, fontSize:'14px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em' }}>Pending Approval</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {pending.map(s => <Card key={s.story_id} story={s} showApprove />)}
                </div>
              </section>
            )}
            {approved.length > 0 && (
              <section>
                <h2 style={{ margin:'0 0 16px 0', color: A.muted, fontSize:'14px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em' }}>Published</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {approved.map(s => <Card key={s.story_id} story={s} showApprove={false} />)}
                </div>
              </section>
            )}
            {stories.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px', color: A.muted }}>No stories submitted yet.</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}