import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { sendMessage } from "../services/messaging";

export default function Settings() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    setFirstName(localStorage.getItem("userFirstName") || "");
    setLastName(localStorage.getItem("userLastName") || "");
    setEmail(localStorage.getItem("userEmail") || "");
    setPhone(localStorage.getItem("userPhone") || "");
    setAddress(localStorage.getItem("userAddress") || "");
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const result = await sendMessage("request.profile.update", {
        user_id: localStorage.getItem("userId"),
        email:   email,
        first_name: firstName,
        last_name:  lastName,
        phone:      phone,
        address:    address,
      });
      if (result && result.success) {
        localStorage.setItem("userFirstName", firstName);
        localStorage.setItem("userLastName", lastName);
        localStorage.setItem("userFullName", `${firstName} ${lastName}`);
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userPhone", phone);
        localStorage.setItem("userAddress", address);
        addToast("Profile updated successfully", "success");
      } else {
        addToast(result?.error || "Failed to update profile", "error");
      }
    } catch (err) {
      addToast("Something went wrong. Please try again.", "error");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast("New passwords do not match", "error");
      return;
    }
    setPasswordLoading(true);
    try {
      const result = await sendMessage("request.auth.resetPassword", {
        email:       email,
        oldPassword: oldPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      });
      if (result && result.success) {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        addToast("Password changed successfully", "success");
      } else {
        addToast(result?.error || "Failed to change password", "error");
      }
    } catch (err) {
      addToast("Something went wrong. Please try again.", "error");
    } finally {
      setPasswordLoading(false);
    }
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
        <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          <div className="settings-card">
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
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Address</label>
                <input
                  className="form-input"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }} disabled={profileLoading}>
                {profileLoading ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>

          <div className="settings-card">
            <h2 className="card-title">Change Password</h2>
            <form onSubmit={handleChangePassword} className="form-group">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Confirm New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }} disabled={passwordLoading}>
                {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

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