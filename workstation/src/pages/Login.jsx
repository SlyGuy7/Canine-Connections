import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { Eye, EyeOff } from "lucide-react";
const LOCKOUT_KEY = "canine_lockout_until";
function formatCountdown(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
export default function Login({ switchToRegister, switchToForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(() => {
    const until = parseInt(localStorage.getItem(LOCKOUT_KEY) || "0", 10);
    const remaining = until - Math.floor(Date.now() / 1000);
    return remaining > 0 ? remaining : 0;
  });
  const navigate = useNavigate();
  const isVerifyError = error.toLowerCase().includes("verify your email");
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining(prev => {
        if (prev <= 1) { localStorage.removeItem(LOCKOUT_KEY); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining > 0]);
  async function onSubmit(e) {
    e.preventDefault();
    if (lockoutRemaining > 0) return;
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      let clientIp = "unknown";
      try { clientIp = await fetch("/client-ip").then(r => r.text()); } catch {}
      const result = await sendMessage("request.auth.login", {
        email,
        password,
        clientIp,
      });
      if (result.success) {
        const user = result.user || {};
        const fName = user.first_name || user.firstName || "";
        const lName = user.last_name  || user.lastName  || "";
        localStorage.setItem("userFirstName", fName);
        localStorage.setItem("userLastName", lName);
        const fullName = `${fName} ${lName}`.trim();
        if (fullName) localStorage.setItem("userFullName", fullName);
        else localStorage.removeItem("userFullName");
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userPassword", password);
        localStorage.setItem("userId", user.user_id || "");
        localStorage.setItem("userRole", user.role || "adopter");
        if (user.phone)   localStorage.setItem("userPhone", user.phone);
        else              localStorage.removeItem("userPhone");
        if (user.address) localStorage.setItem("userAddress", user.address);
        else              localStorage.removeItem("userAddress");
        setLoading(false);
        navigate("/dashboard");
        return;
      }
      setLoading(false);
      if (result.locked_until) {
        const remaining = result.locked_until - Math.floor(Date.now() / 1000);
        if (remaining > 0) {
          localStorage.setItem(LOCKOUT_KEY, result.locked_until.toString());
          setLockoutRemaining(remaining);
        }
      } else {
        setError(result.error || "Login failed. Invalid credentials.");
      }
    } catch (err) {
      setLoading(false);
      setError("Login failed. Backend or database may be offline.");
    }
  }
  const handleForgotPassword = (e) => {
    e.preventDefault();
    switchToForgot();
  };
  const handleResend = async (e) => {
    e.preventDefault();
    setResending(true);
    await sendMessage("request.auth.resendVerification", { email, app_url: window.location.origin });
    setResending(false);
    setResendSent(true);
  };
  return (
    <form onSubmit={onSubmit} style={styles.form}>
      {lockoutRemaining > 0 && (
        <div style={styles.error}>
          Locked out — {formatCountdown(lockoutRemaining)} remaining
        </div>
      )}
      {!lockoutRemaining && error && (
        <div style={styles.error}>
          {error}
          {isVerifyError && (
            <div style={{ marginTop: "8px" }}>
              {resendSent ? (
                <span style={{ color: "#166534", fontWeight: "600" }}>Verification email sent — check your inbox.</span>
              ) : (
                <a href="#" onClick={handleResend} style={{ color: "#b45309", fontWeight: "700", textDecoration: "underline", fontSize: "13px" }}>
                  {resending ? "Sending…" : "Resend verification email"}
                </a>
              )}
            </div>
          )}
        </div>
      )}
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
        <div style={{ position: "relative" }}>
          <input
            style={{ ...styles.input, paddingRight: "44px" }}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-60%)", background: "none", border: "none", cursor: "pointer", color: "#9a8070", padding: "4px", display: "flex", alignItems: "center" }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button style={{...styles.button, ...(lockoutRemaining > 0 ? {opacity: 0.5, cursor: "not-allowed"} : {})}} type="submit" disabled={loading || lockoutRemaining > 0}>
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