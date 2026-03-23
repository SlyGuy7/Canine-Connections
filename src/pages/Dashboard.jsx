import React, { useState, useEffect } from "react";
import { useNavigate, NavLink, Link } from "react-router-dom";
import "../index.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("User");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    const f = localStorage.getItem("userFirstName");
    const l = localStorage.getItem("userLastName");

    if (f) setFirstName(f);
    if (l) setLastName(l);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("userFirstName");
    localStorage.removeItem("userLastName");
    localStorage.removeItem("userEmail");
    navigate("/landing");
  };

  return (
    <div className="dashboard-wrapper">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="paw-icon">🐾</span>
          <h2>Canine Connections</h2>
        </div>

    <nav className="sidebar-nav">
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        Overview
      </NavLink>

      <NavLink to="/browse-dogs" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        Browse Dogs
      </NavLink>

      <NavLink to="/my-dogs" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        My Dogs
      </NavLink>

      <NavLink to="/messages" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        Messages
      </NavLink>

      <NavLink to="/applications" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        Applications
      </NavLink>

      <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        Settings
      </NavLink>
    </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </aside>

      <main className="dashboard-content">
        <header className="content-header">
          <div>
            <h1>Welcome Back, {firstName}!</h1>
            <p className="dashboard-subtitle">
              Here is a quick look at your adoption activity.
            </p>
          </div>

          <div className="user-profile">
            <span className="user-name">{firstName} {lastName}</span>
            <div className="user-avatar">
              {((firstName[0] || "") + (lastName[0] || "")).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="dashboard-search-card">
          <div>
            <h2>Find your next best friend</h2>
            <p>Search adoptable dogs by breed, age, size, or location.</p>
          </div>
          <div className="dashboard-search-row">
            <input
              type="text"
              placeholder="Search dogs, breeds, shelters..."
              className="dashboard-search-input"
            />
            <button className="dashboard-search-btn">Search</button>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <h3>Applications</h3>
            <p className="stat-number">2</p>
            <span className="stat-label">1 in review</span>
          </div>

          <div className="stat-card">
            <h3>Saved Dogs</h3>
            <p className="stat-number">5</p>
            <span className="stat-label">3 new matches</span>
          </div>

          <div className="stat-card">
            <h3>Unread Messages</h3>
            <p className="stat-number">4</p>
            <span className="stat-label">Shelters replied</span>
          </div>

          <div className="stat-card">
            <h3>Visits Scheduled</h3>
            <p className="stat-number">1</p>
            <span className="stat-label">This week</span>
          </div>
        </section>

        <section className="dashboard-main-grid">
          <div className="dashboard-panel">
            <div className="panel-header">
              <h2>Recent Applications</h2>
              <Link to="/applications" className="panel-link">View all</Link>
            </div>

            <div className="activity-list">
              <div className="activity-item">
                <div>
                  <p className="activity-title">Buddy, Labrador Mix</p>
                  <p className="activity-subtext">Application submitted to Happy Tails Rescue</p>
                </div>
                <span className="status-badge pending">Pending</span>
              </div>

              <div className="activity-item">
                <div>
                  <p className="activity-title">Luna, Husky Mix</p>
                  <p className="activity-subtext">Review in progress at Safe Haven Dogs</p>
                </div>
                <span className="status-badge review">In Review</span>
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-header">
              <h2>Saved Dogs</h2>
              <Link to="/my-dogs" className="panel-link">View all</Link>
            </div>

            <div className="saved-dogs-list">
              <div className="saved-dog-card">
                <h3>Max</h3>
                <p>Golden Retriever, 2 years old</p>
                <button className="small-btn">View Profile</button>
              </div>

              <div className="saved-dog-card">
                <h3>Daisy</h3>
                <p>Beagle, 1 year old</p>
                <button className="small-btn">View Profile</button>
              </div>

              <div className="saved-dog-card">
                <h3>Rocky</h3>
                <p>German Shepherd, 3 years old</p>
                <button className="small-btn">View Profile</button>
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-header">
              <h2>Messages</h2>
              <Link to="/messages" className="panel-link">Open inbox</Link>
            </div>

            <div className="message-preview">
              <p className="activity-title">Happy Tails Rescue</p>
              <p className="activity-subtext">
                We received your application for Buddy and would love to schedule a meet and greet.
              </p>
            </div>

            <div className="message-preview">
              <p className="activity-title">Safe Haven Dogs</p>
              <p className="activity-subtext">
                Thanks for your interest in Luna. Your application is currently under review.
              </p>
            </div>
          </div>

          <div className="dashboard-panel highlight-panel">
            <div className="panel-header">
              <h2>Upcoming Event</h2>
            </div>

            <p className="event-title">Weekend Adoption Fair</p>
            <p className="activity-subtext">Saturday, 11:00 AM, Newark Community Center</p>
            <button className="dashboard-search-btn">Learn More</button>
          </div>
        </section>
      </main>
    </div>
  );
}