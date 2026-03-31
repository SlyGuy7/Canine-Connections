import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";

export default function Settings() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    setFirstName(localStorage.getItem("userFirstName") || "");
    setLastName(localStorage.getItem("userLastName") || "");
    setEmail(localStorage.getItem("userEmail") || "");
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem("userFirstName", firstName);
    localStorage.setItem("userLastName", lastName);
    localStorage.setItem("userFullName", `${firstName} ${lastName}`);
    localStorage.setItem("userEmail", email);
    addToast("Profile updated successfully", "success");
  };

  const handleClearSavedDogs = () => {
    localStorage.removeItem("savedDogs");
    addToast("Saved dogs list cleared", "success");
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="page-container">
      <header className="content-header">
        <h1>Account Settings</h1>
        <p className="page-subtitle">Manage your profile and application preferences.</p>
      </header>

      <div className="settings-grid">
        <section className="settings-card">
          <h2 className="card-title">Profile Information</h2>
          <form onSubmit={handleSaveProfile} className="form-group">
            <div className="form-row">
              <div className="flex-1">
                <label className="form-label">First Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="form-label">Last Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }}>
              Save Changes
            </button>
          </form>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="settings-card">
            <h2 className="card-title">Data Management</h2>
            <p className="page-subtitle" style={{ marginBottom: '20px' }}>
              Clear your saved dogs list to start a fresh search.
            </p>
            <button onClick={handleClearSavedDogs} className="btn btn-outline" style={{ width: '100%' }}>
              Clear Saved Dogs
            </button>
          </div>

          <div className="settings-card">
            <h2 className="card-title">Session</h2>
            <p className="page-subtitle" style={{ marginBottom: '20px' }}>
              Log out of your current device securely.
            </p>
            <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%' }}>
              Log Out
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}