import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";

const fallbackApplications = [
  { id: 1, dog: "Buddy", breed: "Labrador Mix", shelter: "Happy Tails Rescue", status: "Pending", date: "March 18" },
  { id: 2, dog: "Luna", breed: "Husky Mix", shelter: "Safe Haven Dogs", status: "In Review", date: "March 16" },
  { id: 3, dog: "Max", breed: "Golden Retriever", shelter: "Paws & Homes", status: "Approved", date: "March 10" },
];

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail");

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    try {
      const result = await sendMessage("request.applications.get", { email: userEmail });
      
      if (result.success && result.applications && result.applications.length > 0) {
        setApplications(result.applications);
      } else {
        setApplications(fallbackApplications);
      }
    } catch (err) {
      console.log("Failed to load applications", err);
      setApplications(fallbackApplications);
    } finally {
      setLoading(false);
    }
  }

  const getProgressWidth = (status) => {
    switch (status) {
      case "Pending": return "33%";
      case "In Review": return "66%";
      case "Approved": return "100%";
      default: return "10%";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Pending": return "pending";
      case "In Review": return "review";
      case "Approved": return "approved";
      default: return "";
    }
  };

  const getProgressColor = (status) => {
    switch (status) {
      case "Pending": return "#f59e0b";
      case "In Review": return "#3b82f6";
      case "Approved": return "#10b981";
      default: return "#cbd5e1";
    }
  };

  return (
    <div className="page-container">
      <header className="content-header">
        <div>
          <h1>My Applications</h1>
          <p className="page-subtitle">Track your adoption requests and their status.</p>
        </div>
      </header>

      {loading ? (
        <p className="page-subtitle">Loading your applications...</p>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <h2>No Active Applications</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
            You have not applied to adopt any dogs yet.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/browse-dogs")}>
            Find a Dog
          </button>
        </div>
      ) : (
        <div className="app-list">
          {applications.map((app) => (
            <div key={app.id} className="panel">
              
              <div className="content-header" style={{ marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '28px', margin: '0 0 8px 0' }}>{app.dog}</h3>
                  <p className="activity-subtext">
                    {app.breed} • <span style={{ color: 'var(--brand)', fontWeight: '700' }}>{app.shelter}</span>
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={`status-badge ${getStatusClass(app.status)}`}>
                    {app.status}
                  </span>
                  <p className="activity-subtext" style={{ marginTop: '8px' }}>
                    Applied: {app.date}
                  </p>
                </div>
              </div>

              <div className="progress-track">
                <div 
                  className="progress-bar"
                  style={{ 
                    width: getProgressWidth(app.status), 
                    background: getProgressColor(app.status),
                  }} 
                />
              </div>

              <div className="app-card-footer">
                <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>
                  {app.status === "Pending" && "Awaiting shelter review."}
                  {app.status === "In Review" && "Shelter is reviewing your details."}
                  {app.status === "Approved" && "Congratulations! Next steps emailed."}
                </span>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => navigate(`/messages?shelter=${encodeURIComponent(app.shelter)}`)}
                >
                  Message Shelter
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}