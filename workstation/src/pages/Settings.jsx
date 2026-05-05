import React, { useState, useRef } from 'react'
import { useNavigate, useBlocker } from 'react-router-dom'
import { sendMessage } from '../services/messaging'
import { useToast } from '../context/ToastContext'

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: checked ? '#d97706' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: checked ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f3e8de', gap: '20px' }}>
      <div>
        <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600', color: '#2f241d' }}>{label}</p>
        {description && <p style={{ margin: 0, fontSize: '13px', color: '#a8a29e' }}>{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

function InfoRow({ label, value, badge }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #f3e8de' }}>
      <span style={{ fontSize: '14px', color: '#78716c', fontWeight: '500' }}>{label}</span>
      {badge
        ? <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>{value}</span>
        : <span style={{ fontSize: '14px', fontWeight: '600', color: '#2f241d' }}>{value}</span>
      }
    </div>
  )
}

const TABS = [
  { id: 'account',       label: 'Account Details',   icon: '👤' },
  { id: 'notifications', label: 'Notifications',      icon: '🔔' },
  { id: 'privacy',       label: 'Privacy & Security', icon: '🔒' },
]

export default function Settings() {
  const navigate     = useNavigate()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('account')

  const displayName  = localStorage.getItem('userFullName') || localStorage.getItem('userFirstName') || 'User'
  const displayEmail = localStorage.getItem('userEmail') || ''
  const userRole     = localStorage.getItem('userRole') || 'adopter'
  const initials     = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const savedDogsCount = JSON.parse(localStorage.getItem('savedDogs') || '[]').length
  const quizTaken      = !!localStorage.getItem('quizMatchedDogIds')
  const profileDone    = !!localStorage.getItem('userProfile')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]   = useState(false)

  const [notifs, setNotifs] = useState({ applicationUpdates: true, newMatches: true, meetGreetReminders: false, newsletter: false })
  const [privacy, setPrivacy] = useState({
    loginAlerts: localStorage.getItem('loginAlerts') === 'true',
    shareProfile: true,
    usageData: false,
  })
  const savedNotifs  = useRef({ applicationUpdates: true, newMatches: true, meetGreetReminders: false, newsletter: false })
  const savedPrivacy = useRef({ loginAlerts: localStorage.getItem('loginAlerts') === 'true', shareProfile: true, usageData: false })
  const [pendingTab, setPendingTab] = useState(null)

  const isNotifsDirty  = JSON.stringify(notifs)   !== JSON.stringify(savedNotifs.current)
  const isPrivacyDirty = JSON.stringify(privacy)  !== JSON.stringify(savedPrivacy.current)
  const isCurrentTabDirty = (activeTab === 'notifications' && isNotifsDirty) || (activeTab === 'privacy' && isPrivacyDirty)

  const blocker = useBlocker(isNotifsDirty || isPrivacyDirty)

  function handleTabClick(tabId) {
    if (tabId === activeTab) return
    if (isCurrentTabDirty) { setPendingTab(tabId); return }
    setActiveTab(tabId)
  }

  function confirmTabSwitch() {
    if (activeTab === 'notifications') setNotifs(savedNotifs.current)
    if (activeTab === 'privacy') setPrivacy(savedPrivacy.current)
    setActiveTab(pendingTab)
    setPendingTab(null)
  }

  const handleLoginAlertsToggle = async (val) => {
    setPrivacy(p => ({ ...p, loginAlerts: val }))
    localStorage.setItem('loginAlerts', val ? 'true' : 'false')
    const userId = localStorage.getItem('userId')
    if (!userId) return
    try {
      await sendMessage('request.profile.update', { user_id: parseInt(userId), login_notifications: val })
    } catch {}
  }

  const handleDeleteAccount = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) { addToast('Could not identify account. Please log in again.', 'error'); return }
    setDeleting(true)
    try {
      const result = await sendMessage('request.account.delete', { user_id: parseInt(userId) })
      if (result?.success) {
        localStorage.clear(); sessionStorage.clear()
        addToast('Account deleted. Redirecting…', 'success')
        setTimeout(() => navigate('/'), 2000)
      } else {
        addToast(result?.error || 'Failed to delete account. Please try again.', 'error')
        setShowDeleteConfirm(false)
      }
    } catch {
      addToast('Could not connect. Please try again.', 'error')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  const quickActions = [
    { icon: '🐶', label: 'Browse Dogs',      sub: 'Find your match',         path: '/browse-dogs' },
    { icon: '🧩', label: 'Take the Quiz',     sub: 'Get recommendations',     path: '/quiz' },
    { icon: '📋', label: 'My Applications',   sub: 'Track your requests',     path: '/applications' },
    { icon: '📖', label: 'My Journal',         sub: 'Your adoption story',     path: '/journal' },
    { icon: '🤍', label: 'Saved Dogs',         sub: `${savedDogsCount} saved`, path: '/saved-dogs' },
    { icon: '💬', label: 'Messages',           sub: 'Shelter conversations',   path: '/messages' },
  ]

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 0 60px 0' }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '28px', fontWeight: '800', color: '#2f241d' }}>Settings</h1>
        <p style={{ margin: 0, color: '#78716c', fontSize: '15px' }}>Manage your account, notifications and privacy.</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Sidebar */}
        <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => handleTabClick(tab.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '12px', border: 'none', background: active ? '#fcedda' : 'transparent', color: active ? '#d97706' : '#6f5848', fontWeight: active ? '700' : '500', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#fffaf5' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <span>{tab.icon}</span>{tab.label}
                </button>
              )
            })}
          </div>

          {/* Mini profile card in sidebar */}
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '20px', textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: 'white', margin: '0 auto 12px' }}>
              {initials}
            </div>
            <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700', color: '#2f241d' }}>{displayName}</p>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#a8a29e', wordBreak: 'break-all' }}>{displayEmail}</p>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', textTransform: 'capitalize' }}>{userRole}</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Account Details ── */}
          {activeTab === 'account' && (
            <>
              {/* Profile hero */}
              <div style={{ background: 'linear-gradient(135deg, #2f241d 0%, #4a3728 100%)', borderRadius: '20px', padding: '28px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '24px', top: '-12px', fontSize: '100px', opacity: 0.06, userSelect: 'none' }}>🐾</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '800', color: 'white', flexShrink: 0, border: '3px solid rgba(255,255,255,0.15)' }}>
                    {initials}
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: 'white' }}>{displayName}</h2>
                    {displayEmail && <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{displayEmail}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {[
                    { label: 'Saved Dogs', value: savedDogsCount, icon: '🤍' },
                    { label: 'Quiz',       value: quizTaken ? 'Done' : 'Not taken', icon: '🧩' },
                    { label: 'Profile',    value: profileDone ? 'Complete' : 'Incomplete', icon: '📋' },
                  ].map(stat => (
                    <div key={stat.label} style={{ padding: '10px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.icon} {stat.label}</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'white' }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/profile')}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  Edit Full Profile →
                </button>
              </div>

              {/* Account Information */}
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Account Information</h2>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#a8a29e' }}>Your registered account details.</p>
                <InfoRow label="Full name"     value={displayName} />
                <InfoRow label="Email address" value={displayEmail} />
                <InfoRow label="Account type"  value={userRole.charAt(0).toUpperCase() + userRole.slice(1)} badge />
                <InfoRow label="Email verified" value="✓ Verified" />
                <div style={{ marginTop: '16px' }}>
                  <button onClick={() => navigate('/profile')}
                    style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2d9d0', background: 'white', color: '#2f241d', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fffaf5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    Edit Profile →
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Quick Actions</h2>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#a8a29e' }}>Jump to any section of your account.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {quickActions.map(a => (
                    <button key={a.label} onClick={() => navigate(a.path)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '16px', borderRadius: '14px', border: '1px solid #efdfd1', background: '#fffaf5', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fcedda'; e.currentTarget.style.borderColor = '#f6d4a2' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fffaf5'; e.currentTarget.style.borderColor = '#efdfd1' }}
                    >
                      <span style={{ fontSize: '22px' }}>{a.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#2f241d' }}>{a.label}</span>
                      <span style={{ fontSize: '12px', color: '#a8a29e' }}>{a.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #fecaca', padding: '24px 28px' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700', color: '#dc2626' }}>Danger Zone</h2>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#78716c' }}>Permanently delete your account and all associated data. This cannot be undone.</p>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '10px 22px', borderRadius: '10px', border: '1px solid #fca5a5', background: 'white', color: '#dc2626', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                    Delete Account
                  </button>
                ) : (
                  <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '18px 20px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#991b1b' }}>Are you absolutely sure?</p>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#6f5848' }}>All your data — applications, messages, journal entries — will be permanently removed.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleDeleteAccount} disabled={deleting} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#dc2626', color: 'white', fontWeight: '700', fontSize: '13px', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                        {deleting ? 'Deleting…' : 'Yes, delete my account'}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2d9d0', background: 'white', color: '#6f5848', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <>
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🔔</div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Email Notifications</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#a8a29e' }}>Choose which updates you receive at {displayEmail || 'your email'}.</p>
                  </div>
                </div>
                <ToggleRow label='Adoption Application Updates' description='Status changes on your submitted applications' checked={notifs.applicationUpdates} onChange={v => setNotifs(n => ({ ...n, applicationUpdates: v }))} />
                <ToggleRow label='New Dog Matches' description='Dogs that match your quiz and profile preferences' checked={notifs.newMatches} onChange={v => setNotifs(n => ({ ...n, newMatches: v }))} />
                <ToggleRow label='Meet & Greet Reminders' description='Reminders before scheduled shelter visits' checked={notifs.meetGreetReminders} onChange={v => setNotifs(n => ({ ...n, meetGreetReminders: v }))} />
                <ToggleRow label='Shelter Newsletter' description='Monthly updates from partner shelters' checked={notifs.newsletter} onChange={v => setNotifs(n => ({ ...n, newsletter: v }))} />
                <button onClick={() => { savedNotifs.current = { ...notifs }; addToast('Notification preferences saved!', 'success') }} style={{ marginTop: '24px', padding: '11px 24px', borderRadius: '10px', border: 'none', background: '#d97706', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                  Save Preferences
                </button>
              </div>

              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📬</div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Communication Summary</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#a8a29e' }}>Overview of your active notification channels.</p>
                  </div>
                </div>
                {[
                  { label: 'Application updates',  active: notifs.applicationUpdates },
                  { label: 'New dog matches',       active: notifs.newMatches },
                  { label: 'Meet & greet reminders',active: notifs.meetGreetReminders },
                  { label: 'Shelter newsletter',    active: notifs.newsletter },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3e8de' }}>
                    <span style={{ fontSize: '14px', color: '#2f241d' }}>{item.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: item.active ? '#f0fdf4' : '#f9fafb', color: item.active ? '#16a34a' : '#9ca3af', border: `1px solid ${item.active ? '#bbf7d0' : '#e5e7eb'}` }}>
                      {item.active ? 'On' : 'Off'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Privacy & Security ── */}
          {activeTab === 'privacy' && (
            <>
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🔐</div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Account Security</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#a8a29e' }}>Control how your account is protected.</p>
                  </div>
                </div>
                <ToggleRow label='Login alerts' description='Email me when a new device logs into my account' checked={privacy.loginAlerts} onChange={handleLoginAlertsToggle} />
                <div style={{ marginTop: '16px', padding: '16px', borderRadius: '14px', background: '#fffaf5', border: '1px solid #efdfd1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600', color: '#2f241d' }}>Password</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#a8a29e' }}>Reset your account password via email.</p>
                    </div>
                    <button onClick={() => navigate('/forgot-password')}
                      style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2d9d0', background: 'white', color: '#d97706', fontWeight: '600', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Reset Password
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🔗</div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Data Sharing</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#a8a29e' }}>Control how your information is used.</p>
                  </div>
                </div>
                <ToggleRow label='Share profile with shelters' description='Lets partner shelters see your basic adoption profile' checked={privacy.shareProfile} onChange={v => setPrivacy(p => ({ ...p, shareProfile: v }))} />
                <ToggleRow label='Anonymous usage data' description='Help improve Canine Connections with anonymised analytics' checked={privacy.usageData} onChange={v => setPrivacy(p => ({ ...p, usageData: v }))} />
                <button onClick={() => { savedPrivacy.current = { ...privacy }; addToast('Privacy settings saved!', 'success') }} style={{ marginTop: '24px', padding: '11px 24px', borderRadius: '10px', border: 'none', background: '#d97706', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                  Save Privacy Settings
                </button>
              </div>

              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📄</div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Your Data</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#a8a29e' }}>What Canine Connections stores about you.</p>
                  </div>
                </div>
                {[
                  { icon: '✉️', label: 'Email address',          desc: 'Used for login, notifications and password reset' },
                  { icon: '👤', label: 'Name & contact info',    desc: 'Used to personalise your experience and applications' },
                  { icon: '📋', label: 'Adoption applications',  desc: 'Stored and shared with shelters you apply to' },
                  { icon: '🐾', label: 'Saved dogs & quiz data', desc: 'Used to generate your personalised recommendations' },
                  { icon: '💬', label: 'Messages',               desc: 'Conversations between you and shelter staff' },
                  { icon: '🔒', label: 'Password',               desc: 'Stored encrypted — never visible to anyone' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', gap: '14px', padding: '12px 0', borderBottom: '1px solid #f3e8de', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '18px', marginTop: '1px' }}>{item.icon}</span>
                    <div>
                      <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600', color: '#2f241d' }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#a8a29e' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab-switch unsaved changes modal */}
      {pendingTab && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(47,36,29,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800', color: '#2f241d' }}>Unsaved changes</h3>
            <p style={{ margin: '0 0 24px 0', color: '#78716c', fontSize: '15px' }}>You have unsaved changes on this tab. Leave without saving?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setPendingTab(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2d9d0', background: 'white', color: '#2f241d', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Stay
              </button>
              <button onClick={confirmTabSwitch} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Route-navigation unsaved changes modal */}
      {blocker.state === 'blocked' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(47,36,29,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800', color: '#2f241d' }}>Unsaved changes</h3>
            <p style={{ margin: '0 0 24px 0', color: '#78716c', fontSize: '15px' }}>You have unsaved changes in your settings. Leave without saving?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => blocker.reset()} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2d9d0', background: 'white', color: '#2f241d', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Stay
              </button>
              <button onClick={() => blocker.proceed()} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
