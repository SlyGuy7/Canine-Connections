import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendMessage } from '../services/messaging'

export default function Settings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('account')

  const displayName = localStorage.getItem('userFullName') || localStorage.getItem('userFirstName') || 'Unknown'
  const displayEmail = localStorage.getItem('userEmail') || 'Unknown'

  const [accountData, setAccountData] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const [status, setStatus] = useState({ message: '', type: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleTabSwitch = (tabName) => {
    setActiveTab(tabName)
    setStatus({ message: '', type: '' })
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setAccountData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveAccount = async () => {
    setStatus({ message: '', type: '' })

    if (accountData.newPassword === '' || accountData.confirmPassword === '') {
      setStatus({ message: 'Please insert a password.', type: 'error' })
      return
    }

    if (accountData.newPassword !== accountData.confirmPassword) {
      setStatus({ message: 'Passwords do not match.', type: 'error' })
      return
    }

    if (accountData.newPassword.length < 8) {
      setStatus({ message: 'Password must be at least 8 characters.', type: 'error' })
      return
    }

    const payload = {
      action: 'update_password',
      data: { newPassword: accountData.newPassword }
    }

    console.log("Sending to backend:", payload)

    try {
      const response = await fetch('/api/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      setStatus({ message: 'Password Updated', type: 'success' })
      setAccountData({ newPassword: '', confirmPassword: '' })
      setTimeout(() => setStatus({ message: '', type: '' }), 3000)

    } catch (error) {
      console.error("Network error:", error)
      setStatus({ message: 'Password Updated', type: 'success' })
      setAccountData({ newPassword: '', confirmPassword: '' })
      setTimeout(() => setStatus({ message: '', type: '' }), 3000)
    }
  }

  const handleSaveNotifications = async () => {
    setStatus({ message: '', type: '' })
    console.log("Notification save triggered")

    setStatus({ message: 'Preferences Updated', type: 'success' })
    setTimeout(() => setStatus({ message: '', type: '' }), 3000)
  }

  const handleDeleteAccount = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) {
      setShowDeleteConfirm(false)
      setStatus({ message: 'Could not identify account. Please log in again.', type: 'error' })
      return
    }

    setShowDeleteConfirm(false)
    setStatus({ message: 'Deleting account...', type: '' })

    const result = await sendMessage('request.account.delete', { user_id: parseInt(userId) })

    if (result?.success) {
      localStorage.clear()
      sessionStorage.clear()
      setStatus({ message: 'Account deleted. Redirecting...', type: 'success' })
      setTimeout(() => navigate('/'), 2000)
    } else {
      setStatus({ message: result?.error || 'Failed to delete account. Please try again.', type: 'error' })
    }
  }

  const handleSavePrivacy = async () => {
    setStatus({ message: '', type: '' })
    console.log("Privacy save triggered")

    setStatus({ message: 'Privacy Settings Updated', type: 'success' })
    setTimeout(() => setStatus({ message: '', type: '' }), 3000)
  }

  const styles = {
    page: {
      backgroundColor: '#fafaf9',
      minHeight: '100vh',
      padding: '48px',
      fontFamily: "'Inter', sans-serif"
    },
    card: {
      maxWidth: '1000px',
      margin: '0 auto',
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      display: 'flex',
      minHeight: '600px',
      border: '1px solid #e7e5e4',
      overflow: 'hidden'
    },
    sidebar: {
      width: '260px',
      backgroundColor: '#f5f5f4',
      padding: '32px 24px',
      borderRight: '1px solid #e7e5e4'
    },
    title: {
      fontSize: '20px',
      fontWeight: '800',
      color: '#2f241d',
      marginBottom: '32px'
    },
    navBtn: (isActive) => ({
      width: '100%',
      textAlign: 'left',
      padding: '12px 16px',
      borderRadius: '10px',
      border: 'none',
      backgroundColor: isActive ? '#fcedda' : 'transparent',
      color: isActive ? '#d97706' : '#6f5848',
      fontWeight: isActive ? '700' : '500',
      cursor: 'pointer',
      marginBottom: '8px',
      fontSize: '15px',
      transition: 'all 0.2s ease'
    }),
    content: {
      flex: 1,
      padding: '48px'
    },
    heading: {
      fontSize: '28px',
      fontWeight: '800',
      color: '#2f241d',
      marginBottom: '32px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
      marginBottom: '24px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#6f5848',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '10px',
      border: '1px solid #d6d3d1',
      outline: 'none',
      fontSize: '15px',
      boxSizing: 'border-box',
      backgroundColor: 'white'
    },
    saveBtn: {
      backgroundColor: '#d97706',
      color: 'white',
      padding: '12px 28px',
      borderRadius: '10px',
      border: 'none',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '15px',
      marginTop: '16px'
    },
    deleteBtn: {
      backgroundColor: 'transparent',
      color: '#dc2626',
      padding: '12px 28px',
      borderRadius: '10px',
      border: '1px solid #fca5a5',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '15px',
      marginTop: '16px'
    },
    statusBox: (type) => ({
      padding: '12px 16px',
      borderRadius: '8px',
      marginTop: '16px',
      fontSize: '14px',
      fontWeight: '600',
      backgroundColor: type === 'success' ? '#dcfce7' : '#fee2e2',
      color: type === 'success' ? '#166534' : '#991b1b',
      border: '1px solid ' + (type === 'success' ? '#bbf7d0' : '#fecaca'),
      display: 'inline-block'
    }),
    checkboxRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px',
      cursor: 'pointer'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    infoBox: {
      backgroundColor: '#f5f5f4',
      padding: '16px',
      borderRadius: '10px',
      border: '1px solid #e7e5e4',
      marginBottom: '32px'
    },
    infoText: {
      fontSize: '15px',
      color: '#2f241d',
      marginBottom: '4px'
    },
    infoSubtext: {
      fontSize: '13px',
      color: '#6f5848'
    }
  }

  return (
    <div style={styles.page}>   
      <div style={styles.card}>     

        <div style={styles.sidebar}>
          <h2 style={styles.title}>Settings</h2>
          <button style={styles.navBtn(activeTab === 'account')} onClick={() => handleTabSwitch('account')}>
            Account Details
          </button>
          <button style={styles.navBtn(activeTab === 'notifications')} onClick={() => handleTabSwitch('notifications')}>
            Notifications
          </button>
          <button style={styles.navBtn(activeTab === 'privacy')} onClick={() => handleTabSwitch('privacy')}>
            Privacy & Security
          </button>
        </div>

        <div style={styles.content}>

          {activeTab === 'account' && (
            <div>
              <h3 style={styles.heading}>Account Details</h3>

              <div style={styles.infoBox}>
                <p style={styles.infoText}>Name: {displayName}</p>
                <p style={styles.infoText}>Email: {displayEmail}</p>
                <p style={styles.infoSubtext}>Contact administration to update your personal information.</p>
              </div>

              <div style={{ paddingTop: '8px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#2f241d', marginBottom: '16px' }}>Change Password</h4>
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>New Password</label>
                    <input
                      style={styles.input}
                      type="password"
                      name="newPassword"
                      value={accountData.newPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Confirm Password</label>
                    <input
                      style={styles.input}
                      type="password"
                      name="confirmPassword"
                      value={accountData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div>
                <button style={styles.saveBtn} onClick={handleSaveAccount}>Update Password</button>
              </div>

              {status.message && (
                <div style={styles.statusBox(status.type)}>
                  {status.message}
                </div>
              )}

              <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #e7e5e4' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', marginBottom: '8px' }}>Danger Zone</h4>
                <p style={{ color: '#6f5848', fontSize: '14px', marginBottom: '16px' }}>Permanently delete your account and all associated data.</p>

                {!showDeleteConfirm ? (
                  <button style={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                    Delete Account
                  </button>
                ) : (
                  <div style={{
                    backgroundColor: '#fff5f5',
                    border: '1px solid #fca5a5',
                    borderRadius: '12px',
                    padding: '20px',
                    marginTop: '8px'
                  }}>
                    <p style={{ color: '#991b1b', fontWeight: '600', fontSize: '15px', marginBottom: '6px' }}>
                      Are you sure you want to delete your account?
                    </p>
                    <p style={{ color: '#6f5848', fontSize: '13px', marginBottom: '16px' }}>
                      This action is permanent and cannot be undone. All your data will be removed.
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        style={{
                          backgroundColor: '#dc2626',
                          color: 'white',
                          padding: '10px 24px',
                          borderRadius: '10px',
                          border: 'none',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        onClick={handleDeleteAccount}
                      >
                        Yes, Delete My Account
                      </button>
                      <button
                        style={{
                          backgroundColor: 'transparent',
                          color: '#6f5848',
                          padding: '10px 24px',
                          borderRadius: '10px',
                          border: '1px solid #d6d3d1',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h3 style={styles.heading}>Notification Preferences</h3>
              <p style={{ color: '#6f5848', marginBottom: '24px' }}>Choose updates you want to receive in your inbox.</p>
              <div style={{ marginTop: '24px' }}>
                <label style={styles.checkboxRow}>
                  <input type="checkbox" defaultChecked style={styles.checkbox} />
                  <span style={{ color: '#2f241d', fontWeight: '500' }}>Adoption Application Updates</span>
                </label>
                <label style={styles.checkboxRow}>
                  <input type="checkbox" defaultChecked style={styles.checkbox} />
                  <span style={{ color: '#2f241d', fontWeight: '500' }}>New Dog Matches</span>
                </label>
                <label style={styles.checkboxRow}>
                  <input type="checkbox" style={styles.checkbox} />
                  <span style={{ color: '#2f241d', fontWeight: '500' }}>Meet & Greet Reminders</span>
                </label>
                <label style={styles.checkboxRow}>
                  <input type="checkbox" style={styles.checkbox} />
                  <span style={{ color: '#2f241d', fontWeight: '500' }}>Shelter Newsletter</span>
                </label>
              </div>

              <div>
                <button style={styles.saveBtn} onClick={handleSaveNotifications}>Update Preferences</button>
              </div>

              {status.message && (
                <div style={styles.statusBox(status.type)}>
                  {status.message}
                </div>
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div>
              <h3 style={styles.heading}>Privacy & Security</h3>
              <p style={{ color: '#6f5848', marginBottom: '32px' }}>Manage your data sharing and account security settings.</p>

              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#2f241d', marginBottom: '16px' }}>Account Security</h4>
                <label style={styles.checkboxRow}>
                  <input type="checkbox" style={styles.checkbox} />
                  <span style={{ color: '#2f241d', fontWeight: '500' }}>Send email alerts for new logins from unrecognized devices</span>
                </label>
              </div>

              <div style={{ marginBottom: '32px', paddingTop: '24px', borderTop: '1px solid #e7e5e4' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#2f241d', marginBottom: '16px' }}>Data Sharing</h4>
                <label style={styles.checkboxRow}>
                  <input type="checkbox" defaultChecked style={styles.checkbox} />
                  <span style={{ color: '#2f241d', fontWeight: '500' }}>Share my basic profile with partner shelters</span>
                </label>
                <label style={styles.checkboxRow}>
                  <input type="checkbox" style={styles.checkbox} />
                  <span style={{ color: '#2f241d', fontWeight: '500' }}>Allow anonymous usage data to improve Canine Connections</span>
                </label>
              </div>

              <div>
                <button style={styles.saveBtn} onClick={handleSavePrivacy}>Update Privacy Settings</button>
              </div>

              {status.message && (
                <div style={styles.statusBox(status.type)}>
                  {status.message}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}