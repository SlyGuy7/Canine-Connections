import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";
import Sidebar from "../components/Sidebar";

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawApp, setWithdrawApp] = useState(null);
  const [viewApp, setViewApp] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadApplications();
  }, []);

  async function loadApplications() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const result = await sendMessage("request.application.list", { user_id: userId });
      if (result?.success && Array.isArray(result.applications)) {
        const userApps = result.applications.filter(
          (a) => String(a.user_id) === String(userId)
        );
        setApplications(userApps);
      }
    } catch (err) {
      addToast("Could not load applications.", "error");
    } finally {
      setLoading(false);
    }
  }

  const getStatusDisplay = (status) => {
    switch ((status || "").toLowerCase()) {
      case "approved":
        return { pillBg: "#dcfce7", pillColor: "#166534", message: "Congratulations! Next steps have been emailed." };
      case "rejected":
        return { pillBg: "#fee2e2", pillColor: "#991b1b", message: "Unfortunately this application was not approved." };
      case "in review":
        return { pillBg: "#f3f4f6", pillColor: "#374151", message: "The shelter is reviewing your application." };
      case "pending":
      default:
        return { pillBg: "#fef08a", pillColor: "#854d0e", message: "Awaiting shelter review." };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Unknown";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar />
        <div className="page-container">
          <header className="content-header"><h1>My Applications</h1></header>
          <p style={{ color: "#6f5848" }}>Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <div>
            <h1 style={{ fontSize: "36px", color: "#2f241d", margin: 0 }}>My Applications</h1>
            <p style={{ fontSize: "16px", color: "#6f5848", marginTop: "8px" }}>Track your adoption requests and their status.</p>
          </div>
          <button onClick={() => navigate("/browse-dogs")} className="btn btn-primary">
            + New Application
          </button>
        </div>

        {applications.length === 0 ? (
          <div style={{ background: "white", borderRadius: "24px", padding: "60px 20px", textAlign: "center", border: "2px dashed #e5d5c5" }}>
            <div style={{ fontSize: "60px", marginBottom: "20px" }}>🐾</div>
            <h2 style={{ fontSize: "24px", color: "#2f241d", marginBottom: "12px" }}>No Applications Yet</h2>
            <p style={{ color: "#6f5848", fontSize: "16px", maxWidth: "400px", margin: "0 auto 30px", lineHeight: "1.6" }}>
              When you apply for a dog, your application will appear here.
            </p>
            <button onClick={() => navigate("/browse-dogs")} className="btn btn-primary">
              Find a Dog
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {applications.map((app) => {
              const { pillBg, pillColor, message } = getStatusDisplay(app.status);
              return (
                <div key={app.application_id} style={{ background: "white", borderRadius: "16px", padding: "28px", border: "1px solid #efdfd1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <h2 style={{ fontSize: "24px", color: "#2f241d", margin: 0 }}>
                      Application #{app.application_id}
                    </h2>
                    <span style={{ backgroundColor: pillBg, color: pillColor, padding: "6px 14px", borderRadius: "16px", fontSize: "12px", fontWeight: "bold", textTransform: "capitalize" }}>
                      {app.status || "Pending"}
                    </span>
                  </div>
                  <p style={{ color: "#6f5848", fontSize: "15px", marginBottom: "20px" }}>
                    Dog ID: {app.dog_id} &nbsp;•&nbsp; Applied: {formatDate(app.created_at || app.submitted_at)}
                  </p>
                  <p style={{ fontWeight: "bold", color: "#2f241d", fontSize: "15px", marginBottom: "20px" }}>{message}</p>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => navigate(`/dogs/${app.dog_id}`)}
                      className="btn"
                      style={{ background: "white", border: "1px solid #dcc8b7", color: "#2f241d" }}
                    >
                      View Dog
                    </button>
                    <button
                      onClick={() => setViewApp(app)}
                      className="btn"
                      style={{ background: "white", border: "1px solid #dcc8b7", color: "#2f241d" }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewApp && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(47,36,29,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
            <div style={{ background: "white", padding: "40px", borderRadius: "24px", maxWidth: "500px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
              <h2 style={{ marginBottom: "20px", color: "#2f241d" }}>Application Details</h2>
              <div style={{ background: "#fffaf5", padding: "24px", borderRadius: "16px", marginBottom: "24px", fontSize: "15px", lineHeight: "1.8", border: "1px solid #efdfd1" }}>
                <p><strong>Application ID:</strong> {viewApp.application_id}</p>
                <p><strong>Dog ID:</strong> {viewApp.dog_id}</p>
                <p><strong>Status:</strong> <span style={{ color: "#d97706", fontWeight: "bold", textTransform: "capitalize" }}>{viewApp.status || "Pending"}</span></p>
                <p><strong>Submitted:</strong> {formatDate(viewApp.created_at || viewApp.submitted_at)}</p>
              </div>
              <button onClick={() => setViewApp(null)} className="btn btn-primary" style={{ width: "100%" }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}