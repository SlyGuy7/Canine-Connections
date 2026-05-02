import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";

export default function ResetPassword() {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const token             = searchParams.get("token") || "";

  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus]               = useState(null);
  const [loading, setLoading]             = useState(false);
  const [done, setDone]                   = useState(false);

  if (!token) {
    return (
      <div style={wrapStyle}>
        <p style={{ color: "#b42318", fontWeight: "600" }}>Invalid reset link. Please request a new one.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setStatus({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }
    setLoading(true);
    try {
      const result = await sendMessage("request.auth.setNewPassword", { token, newPassword });
      if (result?.success) {
        setDone(true);
      } else {
        setStatus({ type: "error", message: result?.error || "Reset failed. The link may have expired." });
      }
    } catch {
      setStatus({ type: "error", message: "Connection error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={wrapStyle}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: "800", color: "#2f241d" }}>Password updated!</h2>
        <p style={{ margin: "0 0 24px 0", color: "#78716c", fontSize: "15px" }}>You can now log in with your new password.</p>
        <button
          onClick={() => navigate("/landing")}
          style={{ padding: "13px 32px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer" }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <h2 style={{ margin: "0 0 6px 0", fontSize: "22px", fontWeight: "800", color: "#2f241d" }}>Choose a new password</h2>
      <p style={{ margin: "0 0 24px 0", color: "#78716c", fontSize: "14px" }}>This link expires 1 hour after it was sent.</p>

      {status && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "14px", fontWeight: "600", background: "#fff1f2", color: "#b42318", border: "1px solid #fecdd3" }}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "#d97706", color: "white", fontWeight: "700", fontSize: "16px", cursor: "pointer", marginTop: "4px" }}
        >
          {loading ? "Updating…" : "Set New Password"}
        </button>
      </form>
    </div>
  );
}

const wrapStyle = {
  minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", padding: "40px 20px", fontFamily: "'Inter', sans-serif",
  background: "#fffaf5",
};
const labelStyle = { display: "block", marginBottom: "6px", fontWeight: "600", color: "#4a382d", fontSize: "13px" };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid #dcc8b7", fontSize: "15px", boxSizing: "border-box", color: "#2f241d" };
