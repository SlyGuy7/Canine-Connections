import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";

const STATUS_CONFIG = {
  approved:  { bg: "#dcfce7", color: "#166534", icon: "✓", label: "Approved",  message: "Congratulations! Next steps have been emailed to you." },
  rejected:  { bg: "#fee2e2", color: "#991b1b", icon: "✕", label: "Rejected",  message: "Unfortunately this application was not approved." },
  "in review": { bg: "#dbeafe", color: "#1e40af", icon: "⏳", label: "In Review", message: "The shelter is currently reviewing your application." },
  pending:   { bg: "#fef9c3", color: "#854d0e", icon: "🕐", label: "Pending",   message: "Your application is awaiting shelter review." },
};

function getStatus(raw) {
  return STATUS_CONFIG[(raw || "pending").toLowerCase()] || STATUS_CONFIG.pending;
}

const STEPS = ["Submitted", "In Review", "Decision"];

function progressStep(status) {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "rejected") return 2;
  if (s === "in review") return 1;
  return 0;
}

function formatDate(dateStr) {
  if (!dateStr) return "Unknown date";
  const iso = dateStr.replace(" ", "T");
  const d = new Date(iso.includes("T") ? iso + "Z" : iso + "T12:00:00Z");
  return isNaN(d) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

function AppSkeleton() {
  return (
    <div style={{ background: "white", borderRadius: "20px", border: "1px solid #efdfd1", padding: "28px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {[["40%", "18px"], ["60%", "13px"], ["100%", "6px"], ["30%", "13px"]].map(([w, h], i) => (
        <div key={i} style={{ height: h, width: w, borderRadius: "8px", background: "linear-gradient(90deg, #f3e8de 25%, #faf0e8 50%, #f3e8de 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      ))}
    </div>
  );
}

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (!userId) { setLoading(false); return; }
    try {
      const result = await sendMessage("request.application.list", { user_id: userId });
      if (result?.success && Array.isArray(result.applications)) {
        const mine = result.applications.filter(a => String(a.user_id) === String(userId));
        setApplications(mine);
        localStorage.setItem("myApplications", JSON.stringify(mine));
      }
    } catch {
      addToast("Could not load applications.", "error");
    } finally {
      setLoading(false);
    }
  }

  const statusCounts = applications.reduce((acc, a) => {
    const key = (a.status || "pending").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 0 60px 0" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: "800", color: "#2f241d" }}>My Applications</h1>
          <p style={{ margin: 0, color: "#78716c", fontSize: "15px" }}>
            {loading ? "Loading your applications…" : `${applications.length} application${applications.length !== 1 ? "s" : ""} submitted`}
          </p>
        </div>
        <button
          onClick={() => navigate("/browse-dogs")}
          style={{ padding: "12px 22px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(217,119,6,0.25)", whiteSpace: "nowrap" }}
        >
          + New Application
        </button>
      </div>

      {/* Status summary pills */}
      {!loading && applications.length > 0 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          {Object.entries(statusCounts).map(([status, count]) => {
            const cfg = getStatus(status);
            return (
              <div key={status} style={{ padding: "8px 16px", borderRadius: "20px", background: cfg.bg, color: cfg.color, fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{cfg.icon}</span>
                <span>{count} {cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {Array.from({ length: 3 }).map((_, i) => <AppSkeleton key={i} />)}
        </div>
      ) : applications.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px 40px", background: "white", borderRadius: "24px", border: "1px solid #efdfd1" }}>
          <div style={{ fontSize: "72px", marginBottom: "20px" }}>📄</div>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "800", color: "#2f241d" }}>No applications yet</h2>
          <p style={{ margin: "0 0 32px 0", color: "#78716c", fontSize: "16px", maxWidth: "360px", display: "inline-block" }}>
            Find a dog you love, hit Apply, and track everything right here.
          </p>
          <br />
          <button
            onClick={() => navigate("/browse-dogs")}
            style={{ padding: "14px 36px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 16px rgba(217,119,6,0.3)" }}
          >
            Find a Dog
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {applications.map(app => {
            const cfg = getStatus(app.status);
            const step = progressStep(app.status);
            return (
              <div
                key={app.application_id}
                style={{ background: "white", borderRadius: "20px", border: "1px solid #efdfd1", padding: "28px", transition: "box-shadow 0.2s ease" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
              >
                {/* Card header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "700", color: "#2f241d" }}>
                      Application #{applications.indexOf(app) + 1}
                    </h2>
                    <p style={{ margin: 0, fontSize: "13px", color: "#a8a29e" }}>
                      Dog #{app.dog_id} &nbsp;·&nbsp; Submitted {formatDate(app.created_at || app.submitted_at)}
                    </p>
                  </div>
                  <span style={{ padding: "6px 14px", borderRadius: "20px", background: cfg.bg, color: cfg.color, fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                    <span>{cfg.icon}</span>{cfg.label}
                  </span>
                </div>

                {/* Paw print progress trail */}
                <div style={{ marginBottom: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                    {STEPS.map((s, i) => {
                      const done = i <= step;
                      const isLast = i === STEPS.length - 1;
                      const rejected = app.status?.toLowerCase() === "rejected" && i === step;
                      return (
                        <React.Fragment key={s}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: rejected ? "#fee2e2" : done ? "#fde6cf" : "#f5ede4", border: `2px solid ${rejected ? "#ef4444" : done ? "#d97706" : "#e5d5c5"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", transition: "all 0.3s" }}>
                              {rejected ? "✕" : done ? "🐾" : "○"}
                            </div>
                            <span style={{ fontSize: "10px", fontWeight: done ? "700" : "500", color: done ? "#d97706" : "#c4a98e", whiteSpace: "nowrap" }}>{s}</span>
                          </div>
                          {!isLast && (
                            <div style={{ flex: 1, height: "2px", background: i < step ? "#d97706" : "#f3e8de", margin: "0 4px", marginBottom: "20px", transition: "background 0.3s" }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Status message */}
                <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#6f5848", padding: "12px 16px", background: cfg.bg + "80", borderRadius: "10px" }}>
                  {cfg.message}
                </p>

                {/* Actions */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => navigate(`/dogs/${app.dog_id}`)}
                    style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2d9d0", background: "white", color: "#2f241d", fontWeight: "600", fontSize: "14px", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fdf6ef"}
                    onMouseLeave={e => e.currentTarget.style.background = "white"}
                  >
                    View Dog
                  </button>
                  <button
                    onClick={() => setViewApp(app)}
                    style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#b45309"}
                    onMouseLeave={e => e.currentTarget.style.background = "#d97706"}
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details modal */}
      {viewApp && (
        <div
          onClick={() => setViewApp(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(47,36,29,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)" }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "24px", padding: "40px", maxWidth: "480px", width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#2f241d" }}>Application Details</h2>
              <button onClick={() => setViewApp(null)} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "#f3e8de", color: "#6f5848", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {(() => {
              const cfg = getStatus(viewApp.status);
              return (
                <div style={{ background: "#fffaf5", border: "1px solid #efdfd1", borderRadius: "16px", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    ["Application ID", `#${viewApp.application_id}`],
                    ["Dog ID", `#${viewApp.dog_id}`],
                    ["Submitted", formatDate(viewApp.created_at || viewApp.submitted_at)],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span style={{ color: "#78716c" }}>{label}</span>
                      <span style={{ fontWeight: "600", color: "#2f241d" }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", paddingTop: "4px", borderTop: "1px solid #efdfd1", marginTop: "4px" }}>
                    <span style={{ color: "#78716c" }}>Status</span>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", background: cfg.bg, color: cfg.color, fontWeight: "700", fontSize: "12px" }}>{cfg.label}</span>
                  </div>
                </div>
              );
            })()}
            <p style={{ margin: "16px 0 24px", fontSize: "14px", color: "#78716c", lineHeight: "1.6" }}>{getStatus(viewApp.status).message}</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setViewApp(null); navigate(`/dogs/${viewApp.dog_id}`); }}
                style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #e2d9d0", background: "white", color: "#2f241d", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
              >
                View Dog
              </button>
              <button
                onClick={() => setViewApp(null)}
                style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
