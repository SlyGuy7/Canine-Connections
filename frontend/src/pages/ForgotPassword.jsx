// Forgot password form — sends the user's email to request.auth.forgotPassword along with
// the current app origin so the backend can build a valid reset link. The status state
// drives whether to show the form or a success/error banner. The optional switchToLogin
// prop is provided when this component renders inside AuthModal, adding a "Back to Login" link.
import React, { useState } from "react";
import { sendMessage } from "../services/messaging";

export default function ForgotPassword({ switchToLogin }) {
  const [email, setEmail]   = useState("");
  // status is null while idle, or { type: "success"|"error", message } after a submission attempt.
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const result = await sendMessage("request.auth.forgotPassword", { email, app_url: window.location.origin });
      if (result?.success) {
        setStatus({ type: "success", message: "Check your email — a reset link has been sent." });
      } else {
        setStatus({ type: "error", message: result?.error || "Could not send reset email. Please try again." });
      }
    } catch {
      setStatus({ type: "error", message: "Connection error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: "sans-serif" }}>
      <div>
        <h2 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Forgot Password</h2>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      {status && (
        <div style={{
          padding: "12px 16px", borderRadius: "10px", fontSize: "14px", fontWeight: "600",
          background: status.type === "success" ? "#d4edda" : "var(--danger-soft)",
          color:      status.type === "success" ? "#155724" : "#b42318",
          border:     `1px solid ${status.type === "success" ? "#c3e6cb" : "#fecdd3"}`,
        }}>
          {status.message}
        </div>
      )}

      {status?.type !== "success" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "var(--text-primary)", fontSize: "13px" }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid #dcc8b7", fontSize: "15px", boxSizing: "border-box", color: "var(--text-primary)" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "16px", cursor: "pointer", boxShadow: "0 10px 24px rgba(217,119,6,0.22)" }}
          >
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      )}

      {switchToLogin && (
        <button
          onClick={switchToLogin}
          style={{ background: "none", border: "none", color: "#d97706", cursor: "pointer", fontSize: "14px", fontWeight: "600", padding: 0, textAlign: "left" }}
        >
          ← Back to Login
        </button>
      )}
    </div>
  );
}
