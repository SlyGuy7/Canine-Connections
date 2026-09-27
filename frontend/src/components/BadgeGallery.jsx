// Achievement badge gallery shown on the user's Dashboard and Profile pages.
// Reads localStorage to determine which of the 12 badges have been earned.
import React, { useState } from "react";

// Works out which badges are earned from localStorage.
function computeEarnedBadges() {
  // No backend call needed — all signals are stored locally after user actions.
  const earned = [];

  const userEmail = localStorage.getItem("userEmail");
  const quizDone = localStorage.getItem("quizCompleted") === "true";
  const saved = JSON.parse(localStorage.getItem("savedDogs") || "[]");
  const apps = JSON.parse(localStorage.getItem("myApplications") || "[]");
  const entries = JSON.parse(localStorage.getItem("journal_entries") || "[]");
  const messages = JSON.parse(localStorage.getItem("messages") || "[]");
  const viewedShelters = JSON.parse(localStorage.getItem("viewedShelters") || "[]");

  // Each push corresponds to one of the 12 badge definitions in badgeSystem below.
  if (userEmail) earned.push("member");
  if (quizDone) earned.push("matching");
  if (saved.length >= 1) earned.push("seeker");
  if (saved.length >= 10) earned.push("collector");
  if (apps.length > 0) earned.push("applicant");
  if (apps.some(a => a.status === "Approved")) earned.push("approved");
  if (entries.length >= 1) earned.push("writer");
  if (entries.length >= 10) earned.push("biographer");
  if (messages.length > 0) earned.push("talker");
  if (viewedShelters.length >= 5) earned.push("explorer");
  if (apps.length >= 3) earned.push("determined");
  if (entries.some(e => (e.notes || e.content || "").length > 200)) earned.push("detailed");

  return earned;
}

export default function BadgeGallery() {
  // Array of badge IDs the current user has unlocked (e.g. ["member", "seeker"]).
  const [unlockedBadges] = useState(computeEarnedBadges);
  // The badge the user clicked — drives the detail modal.
  const [selectedBadge, setSelectedBadge] = useState(null);


  const badgeSystem = [
    { id: "member", title: "Pack Member", goal: "Complete initial sign-up.", icon: "🆔", color: "#3b82f6" },
    { id: "matching", title: "Soul Seeker", goal: "Complete the compatibility quiz.", icon: "🔮", color: "#8b5cf6" },
    { id: "seeker", title: "Window Shopper", goal: "Save your first profile.", icon: "❤️", color: "#ef4444" },
    { id: "explorer", title: "Shelter Scout", goal: "Connect with 5 local shelters.", icon: "🗺️", color: "#06b6d4" },
    { id: "talker", title: "Small Talk", goal: "Send your first direct message.", icon: "💬", color: "#10b981" },
    { id: "applicant", title: "Hopeful Heart", goal: "Submit your first application.", icon: "📩", color: "#f59e0b" },
    { id: "collector", title: "Top Fan", goal: "Save 10 potential pets.", icon: "⭐", color: "#eab308" },
    { id: "determined", title: "Persistent Candidate", goal: "Submit 3 total applications.", icon: "🔥", color: "#f97316" },
    { id: "approved", title: "Certified Parent", goal: "Get an application approved.", icon: "📜", color: "#22c55e" },
    { id: "writer", title: "First Chapter", goal: "Start your adoption journal.", icon: "✍️", color: "#6366f1" },
    { id: "detailed", title: "Deep Thinker", goal: "Log a detailed journal memory. (200+ Characters)", icon: "📓", color: "#a855f7" },
    { id: "biographer", title: "Autobiographer", goal: "Log 10 journal entries.", icon: "📚", color: "#ec4899" },
  ];

  const handleBadgeClick = (badgeId) => {
    const badgeDetails = badgeSystem.find(b => b.id === badgeId);
    setSelectedBadge(badgeDetails);
  };

  const closeModal = () => setSelectedBadge(null);
  const progress = (unlockedBadges.length / badgeSystem.length) * 100;

  return (
    <div style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '28px', boxShadow: '0 12px 40px rgba(47, 36, 29, 0.08)', border: '1px solid var(--border)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '28px', color: 'var(--text-primary)', margin: 0 }}>Pack Milestones</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '6px' }}>Click a milestone to view requirement details.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#d97706', marginBottom: '8px' }}>{unlockedBadges.length} / {badgeSystem.length} UNLOCKED</div>
          <div style={{ width: '200px', height: '12px', background: '#f5f5f4', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #d97706, #f59e0b)', transition: 'width 1.2s ease' }} />
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
        {badgeSystem.map((badge) => {
          const isUnlocked = unlockedBadges.includes(badge.id);
          return (
            <button 
              key={badge.id} 
              onClick={() => handleBadgeClick(badge.id)}
              style={{ 
                padding: '30px 20px', borderRadius: '24px', border: '1px solid',
                borderColor: isUnlocked ? `${badge.color}30` : '#efdfd1',
                backgroundColor: isUnlocked ? 'white' : '#fafaf9',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                boxShadow: isUnlocked ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
                opacity: isUnlocked ? 1 : 0.65, transition: 'all 0.3s ease',
                cursor: 'pointer', outline: 'none', width: '100%'
            }}>
              <div style={{ 
                fontSize: '34px', marginBottom: '20px', width: '70px', height: '70px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: isUnlocked ? `${badge.color}15` : '#f3f4f6',
                borderRadius: '20px', filter: isUnlocked ? 'none' : 'grayscale(100%)',
                boxShadow: isUnlocked ? `0 10px 20px ${badge.color}15` : 'none'
              }}>
                {badge.icon}
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 10px 0' }}>{badge.title}</h3>
              <div style={{ 
                fontSize: '12px', padding: '6px 14px', borderRadius: '12px',
                background: isUnlocked ? 'var(--success-soft)' : '#f5f5f4',
                color: isUnlocked ? '#166534' : '#6f5848',
                fontWeight: '600'
              }}>
                {isUnlocked ? "COMPLETED" : "CLICK TO VIEW"}
              </div>
            </button>
          );
        })}
      </div>

      {selectedBadge && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(47, 36, 29, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '28px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            
            <div style={{ 
              fontSize: '60px', marginBottom: '24px', width: '120px', height: '120px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: `${selectedBadge.color}15`,
              borderRadius: '30px', margin: '0 auto 24px auto',
              filter: unlockedBadges.includes(selectedBadge.id) ? 'none' : 'grayscale(100%)'
            }}>
              {selectedBadge.icon}
            </div>
            
            <h2 style={{ fontSize: '28px', color: 'var(--text-primary)', marginBottom: '12px' }}>{selectedBadge.title}</h2>
            
            <div style={{ 
              display: 'inline-block', fontSize: '12px', padding: '6px 14px', borderRadius: '12px', 
              background: unlockedBadges.includes(selectedBadge.id) ? 'var(--success-soft)' : '#fef2f2', 
              color: unlockedBadges.includes(selectedBadge.id) ? '#166534' : '#991b1b', 
              fontWeight: '700', marginBottom: '32px' 
            }}>
              {unlockedBadges.includes(selectedBadge.id) ? "COMPLETED" : "LOCKED"}
            </div>

            <div style={{ background: '#fafaf9', padding: '24px', borderRadius: '20px', marginBottom: '32px', fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.8', border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>Requirement:</p>
              <span style={{ fontSize: '16px' }}>{selectedBadge.goal}</span>
            </div>

            <button 
              onClick={closeModal} 
              style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: '#d97706', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}