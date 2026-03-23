import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [strength, setStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);

    let s = 0;
    if (val.length >= 8) s += 1;
    if (/[A-Z]/.test(val)) s += 1;
    if (/[0-9]/.test(val)) s += 1;
    if (/[^A-Za-z0-9]/.test(val)) s += 1;

    setStrength(s);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName || !lastName || !phone || !address || !email || !password || !confirm) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const result = await sendMessage("request.auth.register", {
        firstName,
        lastName,
        phone,
        address,
        email,
        password,
        confirm,
      });

      if (result.success) {
        setLoading(false);
        localStorage.setItem("userFirstName", firstName);
        localStorage.setItem("userLastName", lastName);
        localStorage.setItem("userFullName", `${firstName} ${lastName}`);
        navigate("/register-success");
        return;
      }

      setLoading(false);
      setError(result.error || "Registration failed.");
    } catch (err) {
      setLoading(false);
      setError("Registration failed. Backend offline.");
    }
  };

  const getStrengthColor = () => {
    if (strength === 0) return "#dcc8b7"; 
    if (strength === 1) return "#ef4444"; 
    if (strength === 2) return "#f59e0b"; 
    if (strength === 3) return "#fbbf24"; 
    return "#22c55e"; 
  };

  const getStrengthText = () => {
    if (password.length === 0) return "";
    if (strength === 0) return "Too Short";
    if (strength === 1) return "Weak";
    if (strength === 2) return "Fair";
    if (strength === 3) return "Good";
    return "Strong";
  };

  return (
    <form onSubmit={onSubmit} style={styles.form}>
      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>First Name</label>
          <input
            style={styles.input}
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Last Name</label>
          <input
            style={styles.input}
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label style={styles.label}>Phone Number</label>
        <input
          style={styles.input}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div>
        <label style={styles.label}>Home Address</label>
        <input
          style={styles.input}
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

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

      <div style={styles.row}>
        <div style={{ flex: 1, position: "relative" }}>
          <label style={styles.label}>Password</label>
          <div style={{ position: "relative" }}>
            <input
              style={styles.input}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={handlePasswordChange}
              autoComplete="new-password"
            />
            <span 
              onClick={() => setShowPassword(!showPassword)}
              style={styles.toggleText}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>
          <div style={styles.strengthContainer}>
            <div 
              style={{
                ...styles.strengthBar,
                width: `${(strength / 4) * 100}%`,
                backgroundColor: getStrengthColor()
              }} 
            />
          </div>
          {password.length > 0 && (
            <p style={{ 
              fontSize: "12px", 
              color: getStrengthColor(), 
              marginTop: "-8px", 
              marginBottom: "10px",
              fontWeight: "bold" 
            }}>
              {getStrengthText()}
            </p>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Confirm</label>
          <input
            style={styles.input}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>

      <button style={styles.button} type="submit" disabled={loading}>
        {loading ? "Creating Account..." : "Create Account"}
      </button>
    </form>
  );
}

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  row: {
    display: "flex",
    gap: "10px",
  },
  label: {
    display: "block",
    marginBottom: "4px",
    fontWeight: "600",
    color: "#4a382d",
    fontSize: "13px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #dcc8b7",
    background: "#fff",
    color: "#2f241d",
    fontSize: "14px",
    boxSizing: "border-box",
    marginBottom: "8px",
  },
  toggleText: {
    position: "absolute",
    right: "12px",
    top: "10px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#d97706",
    cursor: "pointer",
    userSelect: "none",
  },
  strengthContainer: {
    width: "100%",
    height: "6px",
    backgroundColor: "#efdfd1",
    borderRadius: "10px",
    marginBottom: "12px",
    overflow: "hidden",
  },
  strengthBar: {
    height: "100%",
    transition: "width 0.3s ease, background-color 0.3s ease",
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
    marginTop: "10px",
    boxShadow: "0 10px 24px rgba(217, 119, 6, 0.22)",
  },
  error: {
    background: "#fff1f2",
    color: "#b42318",
    border: "1px solid #fecdd3",
    borderRadius: "10px",
    padding: "8px 12px",
    marginBottom: "10px",
    fontSize: "13px",
  },
};