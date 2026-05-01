import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
export default function Login({ switchToRegister, switchToForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const result = await sendMessage("request.auth.login", {
        email,
        password,
      });
      if (result.success) {
        const user = result.user || {};
        const fName = user.first_name || user.firstName || "";
        const lName = user.last_name  || user.lastName  || "";
        if (fName) localStorage.setItem("userFirstName", fName);
        if (lName) localStorage.setItem("userLastName", lName);
        if (fName || lName) {
          localStorage.setItem("userFullName", `${fName} ${lName}`.trim());
        }
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userId", user.user_id || "");
        localStorage.setItem("userRole", user.role || "adopter");
        if (user.phone)   localStorage.setItem("userPhone", user.phone);
        if (user.address) localStorage.setItem("userAddress", user.address);
        setLoading(false);
        navigate("/dashboard");
        return;
      }
      setLoading(false);
      setError(result.error || "Login failed. Invalid credentials.");
    } catch (err) {
      setLoading(false);
      setError("Login failed. Backend or database may be offline.");
      console.log("Login error", err);
    }
  }
  const handleForgotPassword = (e) => {
    e.preventDefault();
    switchToForgot();
  };
  return (
    <form onSubmit={onSubmit} style={styles.form}>
      {error && <p style={styles.error}>{error}</p>}
      <div>
        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div>
        <div style={styles.passwordHeader}>
          <label style={styles.label}>Password</label>
          <a href="#" onClick={handleForgotPassword} style={styles.forgotLink}>
            Forgot Password?
          </a>
        </div>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <button style={styles.button} type="submit" disabled={loading}>
        {loading ? "Logging In..." : "Login"}
      </button>
    </form>
  );
}
const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  passwordHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "600",
    color: "#4a382d",
  },
  forgotLink: {
    fontSize: "13px",
    color: "#d97706",
    textDecoration: "none",
    fontWeight: "600",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #dcc8b7",
    background: "#fff",
    color: "#2f241d",
    fontSize: "15px",
    boxSizing: "border-box",
    marginBottom: "12px",
  },
  button: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "none",
    background: "#d97706",
    color: "#fff",
    fontWeight: "700",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "6px",
    boxShadow: "0 10px 24px rgba(217, 119, 6, 0.22)",
  },
  error: {
    background: "#fff1f2",
    color: "#b42318",
    border: "1px solid #fecdd3",
    borderRadius: "10px",
    padding: "10px 12px",
    margin: "0 0 10px 0",
    fontSize: "14px",
  },
};