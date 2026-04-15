import React, { useState } from "react";
import { sendMessage } from "../services/messaging";

export default function ForgotPassword({ switchToLogin }) {
  const [formMode, setFormMode] = useState("request"); // 'request' or 'update'
  const [formData, setFormData] = useState({
    email: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      setStatus({ type: "success", message: "Check your email for reset instructions." });
    } catch (err) {
      setStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setStatus({ type: "error", message: "New passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const result = await sendMessage("request.auth.resetPassword", formData);
      if (result && result.success) {
        setStatus({ type: "success", message: "Password updated successfully!" });
      } else {
        setStatus({ type: "error", message: result.message || "Update failed." });
      }
    } catch (err) {
      // Intentional mock error to test the visual state
      setStatus({ type: "error", message: "Simulation Error: Connection refused." });
    } finally {
      setLoading(false);
    }
  };

  // Inline styling for precise layout control
  const containerStyle = { display: "flex", flexDirection: "column", gap: "20px", maxWidth: "400px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" };
  const formStyle = { display: "flex", flexDirection: "column", gap: "15px" };
  const inputGroupStyle = { display: "flex", flexDirection: "column", textAlign: "left", gap: "5px" };
  const labelStyle = { fontWeight: "bold", fontSize: "14px" };
  const inputStyle = { padding: "12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "16px" };
  const buttonStyle = { padding: "12px", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: "bold", border: "none" };
  const errorStyle = { color: "#dc3545", fontWeight: "bold", textAlign: "center", padding: "10px", backgroundColor: "#f8d7da", borderRadius: "8px" };
  const successStyle = { color: "#28a745", fontWeight: "bold", textAlign: "center", padding: "10px", backgroundColor: "#d4edda", borderRadius: "8px" };
  const toggleStyle = { background: "none", border: "none", color: "#007bff", cursor: "pointer", textDecoration: "underline", marginTop: "10px" };

  return (
    <div style={containerStyle}>
      <h2>{formMode === "request" ? "Reset Password" : "Update Password"}</h2>

      {status && (
        <div style={status.type === "success" ? successStyle : errorStyle}>
          {status.message}
        </div>
      )}

      {formMode === "request" ? (
        <form onSubmit={handleEmailSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Email Address</label>
            <input
              style={inputStyle}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" style={{ ...buttonStyle, backgroundColor: "#007bff", color: "white" }} disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          <button type="button" onClick={() => setFormMode("update")} style={toggleStyle}>
            I know my old password
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordUpdate} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Old Password</label>
            <input
              style={inputStyle}
              name="oldPassword"
              type="password"
              value={formData.oldPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>New Password</label>
            <input
              style={inputStyle}
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              style={inputStyle}
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" style={{ ...buttonStyle, backgroundColor: "#28a745", color: "white" }} disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
          <button type="button" onClick={() => setFormMode("request")} style={toggleStyle}>
            I forgot my old password
          </button>
        </form>
      )}
      
      <button type="button" onClick={switchToLogin} style={toggleStyle}>
        Return to Login
      </button>
    </div>
  );
}