import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendMessage } from "../services/messaging";
import "../index.css";

const fallbackDog = {
  id: 1,
  name: "Buddy",
  breed: "Labrador Mix",
  description:
    "Buddy is a friendly and playful dog who loves people, long walks, and tennis balls.",
  image: "",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [stats, setStats] = useState({
    saved: 0,
    applications: 0,
    messages: 0,
  });

  const [user, setUser] = useState("Friend");
  const [featuredDog, setFeaturedDog] = useState(fallbackDog);
  const [loadingDog, setLoadingDog] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [location]);

  async function loadDashboardData() {
    loadStats();
    loadUser();
    await loadFeaturedDog();
  }

  function loadStats() {
    const saved = JSON.parse(localStorage.getItem("savedDogs") || "[]");
    const applications = JSON.parse(localStorage.getItem("myApplications") || "[]");

    setStats({
      saved: saved.length,
      applications: applications.length,
      messages: 0,
    });
  }

  function loadUser() {
    const firstName = localStorage.getItem("userFirstName");
    const fullName = localStorage.getItem("userFullName");
    const email = localStorage.getItem("userEmail");

    if (firstName) {
      setUser(firstName);
      return;
    }

    if (fullName) {
      setUser(fullName);
      return;
    }

    if (email) {
      setUser(email.split("@")[0]);
      return;
    }

    setUser("Friend");
  }

  async function loadFeaturedDog() {
    setLoadingDog(true);

    try {
      const result = await sendMessage("request.dogs.get", {});

      if (result?.success && Array.isArray(result.dogs) && result.dogs.length > 0) {
        const randomIndex = Math.floor(Math.random() * result.dogs.length);
        const dog = result.dogs[randomIndex];

        setFeaturedDog({
          id: dog?.id || fallbackDog.id,
          name: dog?.name || fallbackDog.name,
          breed: dog?.breed || fallbackDog.breed,
          description: dog?.description || fallbackDog.description,
          image: dog?.image || "",
        });
      } else {
        setFeaturedDog(fallbackDog);
      }
    } catch (error) {
      console.log("Failed to load featured dog:", error);
      setFeaturedDog(fallbackDog);
    } finally {
      setLoadingDog(false);
    }
  }

  const nextSteps = useMemo(() => {
    return [
      {
        label: "Complete your profile",
        done: !!localStorage.getItem("userEmail"),
      },
      {
        label: "Save a dog you like",
        done: stats.saved > 0,
      },
      {
        label: "Submit your first application",
        done: stats.applications > 0,
      },
    ];
  }, [stats]);

  function goToFeaturedDog() {
    if (featuredDog?.id) {
      navigate(`/dogs/${featuredDog.id}`);
    } else {
      navigate("/browse-dogs");
    }
  }

  function handleCardKeyDown(event, path) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(path);
    }
  }

  return (
    <div className="page-container">
      <div className="dashboard-search-card">
        <div className="content-header">
          <div>
            <h1>Welcome back, {user} 🐾</h1>
            <p className="dashboard-subtitle">
              Your adoption journey is looking bright today.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate("/browse-dogs")}
          >
            Find a Dog
          </button>
        </div>
      </div>

      <section className="stats-grid">
        <DashboardCard
          icon="🦴"
          value={stats.saved}
          label="Saved Dogs"
          onClick={() => navigate("/my-dogs")}
          onKeyDown={(event) => handleCardKeyDown(event, "/my-dogs")}
        />

        <DashboardCard
          icon="📋"
          value={stats.applications}
          label="Applications"
          onClick={() => navigate("/applications")}
          onKeyDown={(event) => handleCardKeyDown(event, "/applications")}
        />

        <DashboardCard
          icon="📬"
          value={stats.messages}
          label="Messages"
          onClick={() => navigate("/messages")}
          onKeyDown={(event) => handleCardKeyDown(event, "/messages")}
        />
      </section>

      <section className="dashboard-main-grid">
        <div className="dashboard-panel highlight-panel">
          <div className="panel-header">
            <h2>
              {loadingDog
                ? "Featured Companion"
                : `Featured Companion, ${featuredDog.name}`}
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "240px" }}>
              <p className="activity-subtext" style={{ marginBottom: "18px" }}>
                {loadingDog
                  ? "Loading featured companion details..."
                  : `Meet ${featuredDog.name}. This ${featuredDog.breed} is looking for a loving home. ${featuredDog.description}`}
              </p>

              <button className="btn btn-primary" onClick={goToFeaturedDog}>
                View Profile
              </button>
            </div>

            <div
              style={{
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: "#fcedda",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {featuredDog.image ? (
                <img
                  src={featuredDog.image}
                  alt={featuredDog.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "56px" }}>🐕</span>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header">
            <h2>Next Steps</h2>
          </div>

          <div className="activity-list">
            {nextSteps.map((step) => (
              <div key={step.label} className="activity-item">
                <div>
                  <p className="activity-title">{step.label}</p>
                  <p className="activity-subtext">
                    {step.done ? "Completed" : "Still waiting"}
                  </p>
                </div>

                <span className={`status-badge ${step.done ? "approved" : "pending"}`}>
                  {step.done ? "Done" : "To Do"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function DashboardCard({ icon, value, label, onClick, onKeyDown }) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex="0"
    >
      <div style={{ fontSize: "40px", marginBottom: "10px" }}>{icon}</div>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}