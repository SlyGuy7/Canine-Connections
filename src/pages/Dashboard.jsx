import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Guest User");

  useEffect(() => {
    // Attempt to pull the name stored during registration or login
    const storedName = localStorage.getItem("userFullName");
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userFullName");
    navigate("/landing");
  };

  const handleStay = (e) => {
    e.preventDefault();
  };

  return (
    <div className="dashboard-wrapper">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="paw-icon">🐾</span>
          <h2>Canine Connections</h2>
        </div>
        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item active">Overview</a>
          <a href="#" onClick={handleStay} className="nav-item">My Dogs</a>
          <a href="#" onClick={handleStay} className="nav-item">Messages</a>
          <a href="#" onClick={handleStay} className="nav-item">Applications</a>
          <a href="#" onClick={handleStay} className="nav-item">Settings</a>
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </aside>

      <main className="dashboard-content">
        <header className="content-header">
          <h1>Welcome Back, {userName.split(" ")[0]}!</h1>
          <div className="user-profile">
            <span className="user-name">{userName}</span>
            <div className="user-avatar">
              {userName.split(" ").map(n => n[0]).join("").toUpperCase()}
            </div>
          </div>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <h3>Active Applications</h3>
            <p className="stat-number">0</p>
          </div>
          <div className="stat-card">
            <h3>Saved Dogs</h3>
            <p className="stat-number">0</p>
          </div>
          <div className="stat-card">
            <h3>Unread Messages</h3>
            <p className="stat-number">0</p>
          </div>
        </section>

        <section className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <p>Account successfully created with your full profile details.</p>
              <span>Just now</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}