// Settings page — three-tab panel (Account Details, Notifications, Privacy & Security).
// Account info changes are persisted to both localStorage and the backend via request.profile.update.
// Notification and privacy toggles are stored client-side only (except loginAlerts which also
// calls request.profile.update). Both a tab-switch guard and a React Router blocker warn the
// user before they lose unsaved changes.
import React, { useState } from 'react'
import { useNavigate, useBlocker } from 'react-router-dom'
import { sendMessage } from '../services/messaging'
import { useToast } from '../context/toast'
import { useIsMobile } from '../hooks/useIsMobile'
import { Bell, ClipboardList, Dog, FileText, Heart, KeyRound, Link, Lock, Mail, MailOpen, MessageCircle, NotebookPen, PawPrint, Puzzle, UserRound } from "lucide-react"

// Reusable animated toggle switch component; calls onChange with the new boolean value when clicked.
function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: checked ? '#d97706' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--card-bg)', position: 'absolute', top: '3px', left: checked ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)', gap: '20px' }}>
      <div>
        <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{label}</p>
        {description && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

function InfoRow({ label, value, badge }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>{label}</span>
      {badge
        ? <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: 'var(--warning-soft)', color: '#d97706', border: '1px solid #fde68a' }}>{value}</span>
        : <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{value}</span>
      }
    </div>
  )
}

const TABS = [
  { id: 'account',       label: 'Account Details',   icon: <UserRound size={20} /> },
  { id: 'notifications', label: 'Notifications',      icon: <Bell size={20} /> },
  { id: 'privacy',       label: 'Privacy & Security', icon: <Lock size={20} /> },
]

export default function Settings() {
  const navigate     = useNavigate()
  const { addToast } = useToast()
  const isMobile     = useIsMobile()
  const [activeTab, setActiveTab] = useState('account')

  const displayEmail = localStorage.getItem('userEmail') || ''
  const userRole     = localStorage.getItem('userRole') || 'adopter'

  function deriveFromEmail(email) {
    const parts = (email || '').split('@')[0].split('.')
    return {
      first: parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '',
      last:  parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
    }
  }
  const derived = deriveFromEmail(displayEmail)

  const [firstName, setFirstName] = useState(localStorage.getItem('userFirstName') || derived.first)
  const [lastName,  setLastName]  = useState(localStorage.getItem('userLastName')  || derived.last)
  const [phone,     setPhone]     = useState(localStorage.getItem('userPhone')     || '')
  const [address,   setAddress]   = useState(localStorage.getItem('userAddress')   || '')
  const [savingInfo, setSavingInfo] = useState(false)

  const displayName = `${firstName} ${lastName}`.trim() || displayEmail.split('@')[0] || 'User'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const savedDogsCount = JSON.parse(localStorage.getItem('savedDogs') || '[]').length
  const quizTaken      = !!localStorage.getItem('quizMatchedDogIds')
  const profileDone    = !!localStorage.getItem('userProfile')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]   = useState(false)

  async function handleSaveInfo() {
    setSavingInfo(true)
    try {
      const userId = localStorage.getItem('userId')
      if (userId) {
        await sendMessage('request.profile.update', {
          user_id:    parseInt(userId),
          first_name: firstName,
          last_name:  lastName,
          phone,
          address,
        })
      }
      localStorage.setItem('userFirstName', firstName)
      localStorage.setItem('userLastName',  lastName)
      if (`${firstName} ${lastName}`.trim()) localStorage.setItem('userFullName', `${firstName} ${lastName}`.trim())
      if (phone)   localStorage.setItem('userPhone',   phone)
      if (address) localStorage.setItem('userAddress', address)
      setSavedInfo({ firstName, lastName, phone, address })
      addToast('Account info saved!', 'success')
    } catch {
      addToast('Could not save. Try again.', 'error')
    } finally {
      setSavingInfo(false)
    }
  }

  const [notifs, setNotifs] = useState({ applicationUpdates: true, newMatches: true, meetGreetReminders: false, newsletter: false })
  const [privacy, setPrivacy] = useState({
    loginAlerts: localStorage.getItem('loginAlerts') === 'true',
    shareProfile: true,
    usageData: false,
  })
  // Last-saved values; the unsaved-changes guards compare against these.
  const [savedNotifs, setSavedNotifs]   = useState({ applicationUpdates: true, newMatches: true, meetGreetReminders: false, newsletter: false })
  const [savedPrivacy, setSavedPrivacy] = useState({ loginAlerts: localStorage.getItem('loginAlerts') === 'true', shareProfile: true, usageData: false })
  const [savedInfo, setSavedInfo]       = useState({ firstName: localStorage.getItem('userFirstName') || '', lastName: localStorage.getItem('userLastName') || '', phone: localStorage.getItem('userPhone') || '', address: localStorage.getItem('userAddress') || '' })
  const [pendingTab, setPendingTab] = useState(null)

  // Track dirty state per-section so the tab-switch guard only fires for the currently active tab,
  // while the React Router blocker fires if any section has unsaved changes.
  const isNotifsDirty  = JSON.stringify(notifs)   !== JSON.stringify(savedNotifs)
  const isPrivacyDirty = JSON.stringify(privacy)  !== JSON.stringify(savedPrivacy)
  const isInfoDirty    = firstName !== savedInfo.firstName || lastName !== savedInfo.lastName || phone !== savedInfo.phone || address !== savedInfo.address
  const isCurrentTabDirty = (activeTab === 'notifications' && isNotifsDirty) || (activeTab === 'privacy' && isPrivacyDirty) || (activeTab === 'account' && isInfoDirty)

  const blocker = useBlocker(isNotifsDirty || isPrivacyDirty || isInfoDirty)

  function handleTabClick(tabId) {
    if (tabId === activeTab) return
    if (isCurrentTabDirty) { setPendingTab(tabId); return }
    setActiveTab(tabId)
  }

  function confirmTabSwitch() {
    if (activeTab === 'notifications') setNotifs(savedNotifs)
    if (activeTab === 'privacy') setPrivacy(savedPrivacy)
    if (activeTab === 'account') {
      setFirstName(savedInfo.firstName)
      setLastName(savedInfo.lastName)
      setPhone(savedInfo.phone)
      setAddress(savedInfo.address)
    }
    setActiveTab(pendingTab)
    setPendingTab(null)
  }

  const handleLoginAlertsToggle = async (val) => {
    setPrivacy(p => ({ ...p, loginAlerts: val }))
    localStorage.setItem('loginAlerts', val ? 'true' : 'false')
    const userId = localStorage.getItem('userId')
    if (!userId) return
    try {
      const result = await sendMessage('request.profile.update', { user_id: parseInt(userId), login_notifications: val })
      if (!result?.success) throw new Error(result?.error)
      // Saved immediately, so it is not an unsaved change.
      setSavedPrivacy(p => ({ ...p, loginAlerts: val }))
    } catch {
      // Put the switch back so it reflects what is actually saved.
      setPrivacy(p => ({ ...p, loginAlerts: !val }))
      localStorage.setItem('loginAlerts', val ? 'false' : 'true')
      addToast('Could not update login alerts. Please try again.', 'error')
    }
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
    { icon: <Dog size={20} />, label: 'Browse Dogs',      sub: 'Find your match',         path: '/browse-dogs' },
    { icon: <Puzzle size={20} />, label: 'Take the Quiz',     sub: 'Get recommendations',     path: '/quiz' },
    { icon: <ClipboardList size={20} />, label: 'My Applications',   sub: 'Track your requests',     path: '/applications' },
    { icon: <NotebookPen size={20} />, label: 'My Journal',         sub: 'Your adoption story',     path: '/journal' },
    { icon: <Heart size={20} />, label: 'Saved Dogs',         sub: `${savedDogsCount} saved`, path: '/saved-dogs' },
    { icon: <MessageCircle size={20} />, label: 'Messages',           sub: 'Shelter conversations',   path: '/messages' },
  ]

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 0 60px 0' }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>Settings</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '15px' }}>Manage your account, notifications and privacy.</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* Sidebar */}
        <div style={{ width: isMobile ? '100%' : '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => handleTabClick(tab.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '12px', border: 'none', background: active ? 'var(--brand-soft)' : 'transparent', color: active ? '#d97706' : '#6f5848', fontWeight: active ? '700' : '500', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#fffaf5' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <span>{tab.icon}</span>{tab.label}
                </button>
              )
            })}
          </div>

          {/* Mini profile card in sidebar */}
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', padding: '20px', textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: 'white', margin: '0 auto 12px' }}>
              {initials}
            </div>
            <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{displayName}</p>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-subtle)', wordBreak: 'break-all' }}>{displayEmail}</p>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: 'var(--warning-soft)', color: '#d97706', border: '1px solid #fde68a', textTransform: 'capitalize' }}>{userRole}</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Account Details ── */}
          {activeTab === 'account' && (
            <>
              {/* Profile hero */}
              <div style={{ background: 'linear-gradient(135deg, #2f241d 0%, #4a3728 100%)', borderRadius: '20px', padding: '28px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '24px', top: '-12px', fontSize: '100px', opacity: 0.06, userSelect: 'none' }}><PawPrint size={96} strokeWidth={1.5} /></div>
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
                    { label: 'Saved Dogs', value: savedDogsCount, icon: <Heart size={20} /> },
                    { label: 'Quiz',       value: quizTaken ? 'Done' : 'Not taken', icon: <Puzzle size={20} /> },
                    { label: 'Profile',    value: profileDone ? 'Complete' : 'Incomplete', icon: <ClipboardList size={20} /> },
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
              <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', padding: '24px 28px' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>Account Information</h2>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-subtle)' }}>Your registered account details.</p>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  {[
                    { label: 'First name', value: firstName, set: setFirstName },
                    { label: 'Last name',  value: lastName,  set: setLastName  },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</label>
                      <input value={value} onChange={e => set(e.target.value)} placeholder={`Enter ${label.toLowerCase()}`}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5ddd6', fontSize: '14px', fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#d97706'}
                        onBlur={e => e.target.style.borderColor = '#e5ddd6'}
                      />
                    </div>
                  ))}
                </div>

                <InfoRow label="Email address" value={displayEmail} />
                <InfoRow label="Account type"  value={userRole.charAt(0).toUpperCase() + userRole.slice(1)} badge />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
                  {[
                    { label: 'Phone number', value: phone,   set: setPhone,   placeholder: 'e.g. (555) 123-4567' },
                    { label: 'Home address', value: address, set: setAddress, placeholder: 'Street, City, State' },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</label>
                      <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5ddd6', fontSize: '14px', fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)', background: 'var(--bg-secondary)', boxSizing: 'border-box', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#d97706'}
                        onBlur={e => e.target.style.borderColor = '#e5ddd6'}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button onClick={handleSaveInfo} disabled={savingInfo}
                    style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#d97706', color: 'white', fontWeight: '700', fontSize: '13px', cursor: savingInfo ? 'default' : 'pointer', opacity: savingInfo ? 0.7 : 1 }}
                    onMouseEnter={e => { if (!savingInfo) e.currentTarget.style.background = '#b45309' }}
                    onMouseLeave={e => { if (!savingInfo) e.currentTarget.style.background = '#d97706' }}
                  >
                    {savingInfo ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => navigate('/profile')}
                    style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fffaf5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    Edit Full Profile →
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', padding: '24px 28px' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>Quick Actions</h2>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-subtle)' }}>Jump to any section of your account.</p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '12px' }}>
                  {quickActions.map(a => (
                    <button key={a.label} onClick={() => navigate(a.path)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-primary)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-soft)'; e.currentTarget.style.borderColor = '#f6d4a2' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fffaf5'; e.currentTarget.style.borderColor = '#efdfd1' }}
                    >
                      <span style={{ fontSize: '22px' }}>{a.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{a.label}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{a.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid #fecaca', padding: '24px 28px' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700', color: '#dc2626' }}>Danger Zone</h2>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Permanently delete your account and all associated data. This cannot be undone.</p>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '10px 22px', borderRadius: '10px', border: '1px solid #fca5a5', background: 'var(--card-bg)', color: '#dc2626', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                    Delete Account
                  </button>
                ) : (
                  <div style={{ background: 'var(--danger-soft)', border: '1px solid #fecaca', borderRadius: '12px', padding: '18px 20px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#991b1b' }}>Are you absolutely sure?</p>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>All your data — applications, messages, journal entries — will be permanently removed.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleDeleteAccount} disabled={deleting} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#dc2626', color: 'white', fontWeight: '700', fontSize: '13px', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                        {deleting ? 'Deleting…' : 'Yes, delete my account'}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
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
              <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}><Bell size={16} /></div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>Email Notifications</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>Choose which updates you receive at {displayEmail || 'your email'}.</p>
                  </div>
                </div>
                <ToggleRow label='Adoption Application Updates' description='Status changes on your submitted applications' checked={notifs.applicationUpdates} onChange={v => setNotifs(n => ({ ...n, applicationUpdates: v }))} />
                <ToggleRow label='New Dog Matches' description='Dogs that match your quiz and profile preferences' checked={notifs.newMatches} onChange={v => setNotifs(n => ({ ...n, newMatches: v }))} />
                <ToggleRow label='Meet & Greet Reminders' description='Reminders before scheduled shelter visits' checked={notifs.meetGreetReminders} onChange={v => setNotifs(n => ({ ...n, meetGreetReminders: v }))} />
                <ToggleRow label='Shelter Newsletter' description='Monthly updates from partner shelters' checked={notifs.newsletter} onChange={v => setNotifs(n => ({ ...n, newsletter: v }))} />
                <button onClick={() => { setSavedNotifs({ ...notifs }); addToast('Notification preferences saved!', 'success') }} style={{ marginTop: '24px', padding: '11px 24px', borderRadius: '10px', border: 'none', background: '#d97706', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                  Save Preferences
                </button>
              </div>

              <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}><MailOpen size={16} /></div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>Communication Summary</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>Overview of your active notification channels.</p>
                  </div>
                </div>
                {[
                  { label: 'Application updates',  active: notifs.applicationUpdates },
                  { label: 'New dog matches',       active: notifs.newMatches },
                  { label: 'Meet & greet reminders',active: notifs.meetGreetReminders },
                  { label: 'Shelter newsletter',    active: notifs.newsletter },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{item.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: item.active ? 'var(--success-soft)' : '#f9fafb', color: item.active ? '#16a34a' : '#9ca3af', border: `1px solid ${item.active ? 'var(--success-border)' : '#e5e7eb'}` }}>
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
              <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}><KeyRound size={16} /></div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>Account Security</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>Control how your account is protected.</p>
                  </div>
                </div>
                <ToggleRow label='Login alerts' description='Email me when a new device logs into my account' checked={privacy.loginAlerts} onChange={handleLoginAlertsToggle} />
                <div style={{ marginTop: '16px', padding: '16px', borderRadius: '14px', background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Password</p>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>Reset your account password via email.</p>
                    </div>
                    <button onClick={() => navigate('/forgot-password')}
                      style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: '#d97706', fontWeight: '600', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Reset Password
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--info-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}><Link size={16} /></div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>Data Sharing</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>Control how your information is used.</p>
                  </div>
                </div>
                <ToggleRow label='Share profile with shelters' description='Lets partner shelters see your basic adoption profile' checked={privacy.shareProfile} onChange={v => setPrivacy(p => ({ ...p, shareProfile: v }))} />
                <ToggleRow label='Anonymous usage data' description='Help improve Canine Connections with anonymised analytics' checked={privacy.usageData} onChange={v => setPrivacy(p => ({ ...p, usageData: v }))} />
                <button onClick={() => { setSavedPrivacy({ ...privacy }); addToast('Privacy settings saved!', 'success') }} style={{ marginTop: '24px', padding: '11px 24px', borderRadius: '10px', border: 'none', background: '#d97706', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                  Save Privacy Settings
                </button>
              </div>

              <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border)', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}><FileText size={16} /></div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>Your Data</h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>What Canine Connections stores about you.</p>
                  </div>
                </div>
                {[
                  { icon: <Mail size={20} />, label: 'Email address',          desc: 'Used for login, notifications and password reset' },
                  { icon: <UserRound size={20} />, label: 'Name & contact info',    desc: 'Used to personalise your experience and applications' },
                  { icon: <ClipboardList size={20} />, label: 'Adoption applications',  desc: 'Stored and shared with shelters you apply to' },
                  { icon: <PawPrint size={20} />, label: 'Saved dogs & quiz data', desc: 'Used to generate your personalised recommendations' },
                  { icon: <MessageCircle size={20} />, label: 'Messages',               desc: 'Conversations between you and shelter staff' },
                  { icon: <Lock size={20} />, label: 'Password',               desc: 'Stored encrypted — never visible to anyone' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', gap: '14px', padding: '12px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '18px', marginTop: '1px' }}>{item.icon}</span>
                    <div>
                      <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>{item.desc}</p>
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
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>Unsaved changes</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '15px' }}>You have unsaved changes on this tab. Leave without saving?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setPendingTab(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
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
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>Unsaved changes</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '15px' }}>You have unsaved changes in your settings. Leave without saving?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => blocker.reset()} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
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
