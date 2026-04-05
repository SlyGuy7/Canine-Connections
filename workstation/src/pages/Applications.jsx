import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [withdrawApp, setWithdrawApp] = useState(null);
  const [viewApp, setViewApp] = useState(null); // Added state for the review modal
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    const storedApps = JSON.parse(localStorage.getItem("myApplications") || "[]");
    const sortedApps = [...storedApps].sort((a, b) => b.id - a.id);
    setApplications(sortedApps);
  }, []);

  const getStatusDisplay = (status) => {
    switch (status) {
      case "Approved":
        return { pillBg: "#dcfce7", pillColor: "#166534", message: "Congratulations! Next steps emailed." };
      case "In Review":
        return { pillBg: "#f3f4f6", pillColor: "#374151", message: "Shelter is reviewing your details." };
      case "Pending":
      default:
        return { pillBg: "#fef08a", pillColor: "#854d0e", message: "Awaiting shelter review." };
    }
  }

  const handleConfirmWithdraw = () => {
    if (!withdrawApp) return;

    const updatedApps = applications.filter((app) => app.id !== withdrawApp.id);
    
    setApplications(updatedApps);
    localStorage.setItem("myApplications", JSON.stringify(updatedApps));
    
    setWithdrawApp(null);
    addToast("Application successfully withdrawn", "success");
  };

  return (
    <div className="page-container" style={{ backgroundColor: '#fffaf5', minHeight: '100vh', padding: '40px 20px', position: 'relative' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '36px', color: '#2f241d', marginBottom: '8px' }}>My Applications</h1>
        <p style={{ fontSize: '16px', color: '#6f5848', marginBottom: '40px' }}>
          Track your adoption requests and their status.
        </p>

        {applications.length === 0 ? (
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '24px', 
            padding: '60px 20px', 
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            border: '2px dashed #e5d5c5'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🐾</div>
            <h2 style={{ fontSize: '24px', color: '#2f241d', marginBottom: '12px' }}>No Saved Applications</h2>
            <p style={{ color: '#6f5848', fontSize: '16px', maxWidth: '400px', margin: '0 auto 30px', lineHeight: '1.6' }}>
              You haven't applied for any companions yet. When you find a dog you love, your application will appear right here.
            </p>
            <button 
              onClick={() => navigate('/browse-dogs')}
              style={{ 
                padding: '16px 32px', 
                backgroundColor: '#d97706', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                fontSize: '16px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)'
              }}
            >
              Find a Dog
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {applications.map((app) => {
              const { pillBg, pillColor, message } = getStatusDisplay(app.status);

              return (
                <div key={app.id} style={{ borderBottom: '1px solid #efdfd1', paddingBottom: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '28px', color: '#2f241d', margin: 0 }}>{app.dog}</h2>
                    <span style={{ backgroundColor: pillBg, color: pillColor, padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}>
                      {app.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', color: '#6f5848', fontSize: '15px' }}>
                    <span>{app.breed} • <strong>{app.shelter}</strong></span>
                    <span>Applied: {app.date}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#2f241d', fontSize: '15px' }}>
                      {message}
                    </span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => setViewApp(app)} // Triggers the review modal
                        style={{ 
                          padding: '10px 16px', 
                          backgroundColor: 'white', 
                          border: '1px solid #dcc8b7', 
                          borderRadius: '10px', 
                          fontWeight: 'bold', 
                          color: '#2f241d', 
                          cursor: 'pointer' 
                        }}
                      >
                        Review App
                      </button>
                      <button 
                        onClick={() => setWithdrawApp(app)}
                        style={{ 
                          padding: '10px 16px', 
                          backgroundColor: '#fff1f2', 
                          border: '1px solid #fecdd3', 
                          borderRadius: '10px', 
                          fontWeight: 'bold', 
                          color: '#e11d48', 
                          cursor: 'pointer' 
                        }}
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- REVIEW APP MODAL --- */}
      {viewApp && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(47, 36, 29, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '24px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h2 style={{ marginBottom: '20px', color: '#2f241d', fontSize: '24px' }}>Application Summary</h2>

            <div style={{ background: '#fffaf5', padding: '24px', borderRadius: '16px', marginBottom: '32px', fontSize: '15px', lineHeight: '1.8', border: '1px solid #efdfd1' }}>
              <p><strong>Applicant:</strong> {viewApp.applicantName}</p>
              <p><strong>Companion:</strong> {viewApp.dog} ({viewApp.breed})</p>
              <p><strong>Shelter:</strong> {viewApp.shelter}</p>
              <p><strong>Date Applied:</strong> {viewApp.date}</p>
              <p><strong>Current Status:</strong> <span style={{ color: '#d97706', fontWeight: 'bold' }}>{viewApp.status}</span></p>
            </div>

            <button 
              onClick={() => setViewApp(null)} 
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: '#d97706', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- WITHDRAW CONFIRMATION MODAL --- */}
      {withdrawApp && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(47, 36, 29, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '24px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ marginBottom: '12px', color: '#2f241d', fontSize: '24px' }}>Withdraw Application?</h2>
            <p style={{ color: '#6f5848', marginBottom: '32px', fontSize: '16px', lineHeight: '1.6' }}>
              Are you sure you want to withdraw your application for <strong>{withdrawApp.dog}</strong>? This action cannot be undone, and you will need to fill out a new form if you change your mind.
            </p>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={() => setWithdrawApp(null)} 
                style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #dcc8b7', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', color: '#6f5848' }}
              >
                Keep Application
              </button>
              <button 
                onClick={handleConfirmWithdraw} 
                style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', background: '#e11d48', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
              >
                Yes, Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}