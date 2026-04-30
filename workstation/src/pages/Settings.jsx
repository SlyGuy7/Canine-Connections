import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendMessage } from '../services/messaging'
import { useToast } from '../context/ToastContext'

/* ── Toggle switch ── */
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

/* ── Password field with show/hide ── */
function PasswordInput({ value, onChange, placeholder, label }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '700', color: '#6f5848' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ width: '100%', padding: '11px 42px 11px 14px', borderRadius: '10px', border: '1px solid #e2d9d0', fontSize: '14px', fontFamily: "'Inter', sans-serif", outline: 'none', color: '#2f241d', boxSizing: 'border-box', background: '#fffaf5' }}
        />
        <button
          type='button'
          onClick={() => setShow(s => !s)}
          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#a8a29e', padding: 0, lineHeight: 1 }}
          tabIndex={-1}
        >
          {show ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )
}

/* ── Password strength ── */
function getStrength(pw) {
  if (!pw) return null
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { label: 'Weak',   color: '#ef4444', width: '25%' }
  if (score <= 2) return { label: 'Fair',   color: '#f97316', width: '50%' }
  if (score <= 3) return { label: 'Good',   color: '#eab308', width: '75%' }
  return               { label: 'Strong', color: '#22c55e', width: '100%' }
}

function StrengthBar({ password }) {
  const s = getStrength(password)
  if (!s) return null
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ height: '4px', background: '#f3e8de', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: s.width, background: s.color, borderRadius: '99px', transition: 'width 0.3s ease, background 0.3s ease' }} />
      </div>
      <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: '600', color: s.color }}>{s.label}</p>
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
  const initials     = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const savedDogsCount = JSON.parse(localStorage.getItem('savedDogs') || '[]').length
  const quizTaken      = !!localStorage.getItem('quizMatchedDogIds')
  const profileDone    = !!localStorage.getItem('userProfile')

  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [savingPw, setSavingPw]   = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]   = useState(false)

  const [notifs, setNotifs] = useState({ applicationUpdates: true, newMatches: true, meetGreetReminders: false, newsletter: false })
  const [privacy, setPrivacy] = useState({ loginAlerts: false, shareProfile: true, usageData: false })

  const handlePasswordSave = async () => {
    if (!passwords.oldPassword || !passwords.newPassword || !passwords.confirmPassword) {
      addToast('Please fill in all password fields.', 'error'); return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      addToast('New passwords do not match.', 'error'); return
    }
    if (passwords.newPassword.length < 8) {
      addToast('Password must be at least 8 characters.', 'error'); return
    }
    setSavingPw(true)
    try {
      const result = await sendMessage('request.auth.resetPassword', {
        email: displayEmail,
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      })
      if (result?.success) {
        addToast('Password updated successfully!', 'success')
        setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        addToast(result?.error || 'Password update failed.', 'error')
      }
    } catch {
      addToast('Could not connect. Please try again.', 'error')
    } finally {
      setSavingPw(false)
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

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 0 60px 0' }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '28px', fontWeight: '800', color: '#2f241d' }}>Settings</h1>
        <p style={{ margin: 0, color: '#78716c', fontSize: '15px' }}>Manage your account, notifications and privacy.</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Tab sidebar */}
        <div style={{ width: '220px', flexShrink: 0, background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '12px', border: 'none', background: active ? '#fcedda' : 'transparent', color: active ? '#d97706' : '#6f5848', fontWeight: active ? '700' : '500', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#fffaf5' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span>{tab.icon}</span>{tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Account Details ── */}
          {activeTab === 'account' && (
            <>
              {/* Profile card */}
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

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {[
                    { label: 'Saved Dogs',     value: savedDogsCount,          icon: '🤍' },
                    { label: 'Quiz',            value: quizTaken ? 'Done' : 'Not taken', icon: '🧩' },
                    { label: 'Profile',         value: profileDone ? 'Complete' : 'Incomplete', icon: '📋' },
                  ].map(stat => (
                    <div key={stat.label} style={{ padding: '10px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.icon} {stat.label}</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'white' }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate('/profile')}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  Edit Full Profile →
                </button>
              </div>

              {/* Change password */}
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Change Password</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <PasswordInput
                    label='Current Password'
                    value={passwords.oldPassword}
                    onChange={e => setPasswords(p => ({ ...p, oldPassword: e.target.value }))}
                    placeholder='••••••••'
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <PasswordInput
                        label='New Password'
                        value={passwords.newPassword}
                        onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                        placeholder='••••••••'
                      />
                      <StrengthBar password={passwords.newPassword} />
                    </div>
                    <PasswordInput
                      label='Confirm New Password'
                      value={passwords.confirmPassword}
                      onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder='••••••••'
                    />
                  </div>
                </div>
                <button
                  onClick={handlePasswordSave}
                  disabled={savingPw}
                  style={{ marginTop: '20px', padding: '11px 24px', borderRadius: '10px', border: 'none', background: '#d97706', color: 'white', fontWeight: '700', fontSize: '14px', cursor: savingPw ? 'default' : 'pointer', opacity: savingPw ? 0.7 : 1 }}
                >
                  {savingPw ? 'Updating…' : 'Update Password'}
                </button>
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
            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Notification Preferences</h2>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#78716c' }}>Choose which updates you receive by email.</p>
              <ToggleRow label='Adoption Application Updates' description='Status changes on your submitted applications' checked={notifs.applicationUpdates} onChange={v => setNotifs(n => ({ ...n, applicationUpdates: v }))} />
              <ToggleRow label='New Dog Matches' description='Dogs that match your quiz and profile preferences' checked={notifs.newMatches} onChange={v => setNotifs(n => ({ ...n, newMatches: v }))} />
              <ToggleRow label='Meet & Greet Reminders' description='Reminders before scheduled shelter visits' checked={notifs.meetGreetReminders} onChange={v => setNotifs(n => ({ ...n, meetGreetReminders: v }))} />
              <ToggleRow label='Shelter Newsletter' description='Monthly updates from partner shelters' checked={notifs.newsletter} onChange={v => setNotifs(n => ({ ...n, newsletter: v }))} />
              <button onClick={() => addToast('Notification preferences saved!', 'success')} style={{ marginTop: '24px', padding: '11px 24px', borderRadius: '10px', border: 'none', background: '#d97706', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Save Preferences
              </button>
            </div>
          )}

          {/* ── Privacy & Security ── */}
          {activeTab === 'privacy' && (
            <>
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Account Security</h2>
                <ToggleRow label='Login alerts' description='Email me when a new device logs into my account' checked={privacy.loginAlerts} onChange={v => setPrivacy(p => ({ ...p, loginAlerts: v }))} />
              </div>
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #efdfd1', padding: '24px 28px' }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '17px', fontWeight: '700', color: '#2f241d' }}>Data Sharing</h2>
                <ToggleRow label='Share profile with shelters' description='Lets partner shelters see your basic adoption profile' checked={privacy.shareProfile} onChange={v => setPrivacy(p => ({ ...p, shareProfile: v }))} />
                <ToggleRow label='Anonymous usage data' description='Help improve Canine Connections with anonymised analytics' checked={privacy.usageData} onChange={v => setPrivacy(p => ({ ...p, usageData: v }))} />
                <button onClick={() => addToast('Privacy settings saved!', 'success')} style={{ marginTop: '24px', padding: '11px 24px', borderRadius: '10px', border: 'none', background: '#d97706', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                  Save Privacy Settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
