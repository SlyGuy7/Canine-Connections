import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();

  async function onSubmit(e) {
    e.preventDefault();

    if (!email || !password) {
      addToast("Please fill in all fields", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addToast("Please enter a valid email address.", "error");
      return;
    }

    setLoading(true);

    try {
      const result = await sendMessage("request.auth.login", {
        email,
        password,
      });

      if (result.success) {
        const fName = result.user?.firstName || result.first_name;
        const lName = result.user?.lastName || result.last_name;

        if (fName) localStorage.setItem("userFirstName", fName);
        if (lName) localStorage.setItem("userLastName", lName);
        
        if (fName || lName) {
          localStorage.setItem(
            "userFullName",
            `${fName || ""} ${lName || ""}`.trim()
          );
        }

        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userEmail", email);

        addToast("Welcome back!", "success");
        navigate("/dashboard");
        
      } else {
        addToast(result.error || "Login failed. Invalid credentials.", "error");
      }
    } catch (err) {
      addToast("Login failed. Backend or database may be offline.", "error");
      console.error("Login error", err);
    } finally {
      setLoading(false);
    }
  }

  const handleForgotPassword = (e) => {
    e.preventDefault();
    addToast("Password reset will be implemented in the next phase.", "error");
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input
          className="form-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="name@example.com"
          required
        />
      </div>

      <div className="form-group">
        <div className="form-header-row">
          <label className="form-label">Password</label>
          <a href="#" onClick={handleForgotPassword} className="link-text">
            Forgot password?
          </a>
        </div>
        <input
          className="form-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <button 
        className="btn btn-primary" 
        type="submit" 
        disabled={loading}
        style={{ marginTop: '8px' }}
      >
        {loading ? "Logging In..." : "Login"}
      </button>
    </form>
  );
}