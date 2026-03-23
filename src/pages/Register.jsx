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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
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