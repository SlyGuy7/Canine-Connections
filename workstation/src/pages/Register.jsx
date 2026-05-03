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
  
  // New state for Dexter's Law IDs
  const [idOne, setIdOne] = useState(null);
  const [idTwo, setIdTwo] = useState(null);
  
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

  const handleFileChange = (e, setFileState, otherFileState) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Please upload a valid image (JPG, PNG, WebP) or PDF.");
      e.target.value = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Maximum size is 5MB.");
      e.target.value = null;
      return;
    }

    // New: Prevent uploading the same file twice
    if (
      otherFileState && 
      file.name === otherFileState.name && 
      file.size === otherFileState.size && 
      file.lastModified === otherFileState.lastModified
    ) {
      setError("You cannot use the exact same file for both forms of ID.");
      e.target.value = null;
      return;
    }

    setFileState(file);
    setError(""); 
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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

    if (!idOne || !idTwo) {
      setError("Dexter's Law requires two forms of ID to register.");
      return;
    }

    setLoading(true);

    try {
      const [idOneB64, idTwoB64] = await Promise.all([toBase64(idOne), toBase64(idTwo)]);

      const result = await sendMessage("request.auth.register", {
        firstName,
        lastName,
        phone,
        address,
        email,
        password,
        confirm,
        app_url: window.location.origin,
        id_one_b64: idOneB64,
        id_one_name: idOne.name,
        id_two_b64: idTwoB64,
        id_two_name: idTwo.name,
      });

      if (result.success) {
        setLoading(false);
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

      {/* Dexter's Law Identity Verification Section */}
      <div style={styles.identityContainer}>
        <h3 style={styles.identityTitle}>Dexter's Law Compliance</h3>
        <p style={styles.identityText}>
          To protect our animals, two forms of photo ID are required.
        </p>
        
      <div style={{ marginBottom: "12px" }}>
          <label style={styles.label}>Primary ID (Driver's License / State ID) *</label>
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf" 
            // Pass idTwo as the third argument here
            onChange={(e) => handleFileChange(e, setIdOne, idTwo)} 
            style={styles.fileInput} 
          />
          {idOne && <p style={styles.fileSuccess}>✓ {idOne.name} attached</p>}
        </div>

        <div>
          <label style={styles.label}>Secondary ID (Passport / Work ID / Bill) *</label>
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf" 
            // Pass idOne as the third argument here
            onChange={(e) => handleFileChange(e, setIdTwo, idOne)} 
            style={styles.fileInput} 
          />
          {idTwo && <p style={styles.fileSuccess}>✓ {idTwo.name} attached</p>}
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
  identityContainer: {
    marginTop: "12px",
    marginBottom: "12px",
    padding: "16px",
    background: "#fffaf5",
    borderRadius: "12px",
    border: "1px solid #efdfd1",
  },
  identityTitle: {
    fontSize: "16px",
    color: "#d97706",
    marginBottom: "8px",
    marginTop: 0,
  },
  identityText: {
    fontSize: "13px",
    color: "#6f5848",
    marginBottom: "16px",
    marginTop: 0,
  },
  fileInput: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    border: "2px dashed #dcc8b7",
    background: "#fafaf9",
    color: "#6f5848",
    fontSize: "13px",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  fileSuccess: {
    color: "#166534",
    fontSize: "12px",
    marginTop: "6px",
    fontWeight: "bold",
    marginBottom: 0,
  }
};