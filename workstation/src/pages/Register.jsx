import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import { useToast } from "../context/ToastContext";

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", phone: "", address: "",
    email: "", password: "", confirm: ""
  });
  const [strength, setStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { addToast } = useToast();

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "password") calculateStrength(value);
  };

  const calculateStrength = (val) => {
    let s = 0;
    if (val.length >= 8) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    setStrength(s);
  };

  const validateForm = () => {
    const { firstName, lastName, phone, address, email, password, confirm } = formData;
    if (!firstName || !lastName || !phone || !address || !email || !password || !confirm) {
      addToast("Fill in all required fields.", "error");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast("Enter a valid email.", "error");
      return false;
    }
    if (password !== confirm) {
      addToast("Passwords do not match.", "error");
      return false;
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await sendMessage("request.auth.register", formData);
      if (result.success) {
        localStorage.setItem("userFullName", `${formData.firstName} ${formData.lastName}`);
        navigate("/register-success");
      } else {
        addToast(result.error || "Registration failed.", "error");
      }
    } catch (err) {
      addToast("Registration failed. Backend offline.", "error");
    } finally {
      setLoading(false);
    }
  };

  const strengthMeta = [
    { color: "#dcc8b7", text: "Too Short" },
    { color: "#ef4444", text: "Weak" },
    { color: "#f59e0b", text: "Fair" },
    { color: "#fbbf24", text: "Good" },
    { color: "#22c55e", text: "Strong" }
  ][strength];

  return (
    <form onSubmit={onSubmit} className="form-group" style={{ gap: '4px' }}>
      <div className="form-row">
        <div className="flex-1">
          <label className="form-label">First Name</label>
          <input className="form-input" type="text" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="form-label">Last Name</label>
          <input className="form-input" type="text" value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Phone Number</label>
        <input className="form-input" type="tel" placeholder="(555) 555-5555" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
      </div>

      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
      </div>

      <div className="form-row">
        <div className="flex-1">
          <label className="form-label">Password</label>
          <div className="input-container">
            <input className="form-input" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => updateField("password", e.target.value)} />
            <span className="input-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</span>
          </div>
          <div className="strength-wrapper">
            <div className="strength-bar" style={{ width: `${(strength / 4) * 100}%`, backgroundColor: strengthMeta.color }} />
          </div>
          {formData.password && <p className="strength-text" style={{ color: strengthMeta.color }}>{strengthMeta.text}</p>}
        </div>
        <div className="flex-1">
          <label className="form-label">Confirm</label>
          <input className="form-input" type="password" value={formData.confirm} onChange={(e) => updateField("confirm", e.target.value)} />
        </div>
      </div>

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '12px' }}>
        {loading ? "Creating Account..." : "Create Account"}
      </button>
    </form>
  );
}