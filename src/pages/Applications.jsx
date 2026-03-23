import React, { useEffect, useState } from "react";
import "../index.css";
import { sendMessage } from "../services/messaging";

const fallbackApplications = [
  {
    id: 1,
    dog: "Buddy",
    breed: "Labrador Mix",
    shelter: "Happy Tails Rescue",
    status: "Pending",
    date: "March 18",
  },
  {
    id: 2,
    dog: "Luna",
    breed: "Husky Mix",
    shelter: "Safe Haven Dogs",
    status: "In Review",
    date: "March 16",
  },
  {
    id: 3,
    dog: "Max",
    breed: "Golden Retriever",
    shelter: "Paws & Homes",
    status: "Approved",
    date: "March 10",
  },
];

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const userEmail = localStorage.getItem("userEmail");

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    try {
      const result = await sendMessage("request.applications.get", {
        email: userEmail,
      });

      console.log("applications result:", result);

      if (result.success && result.applications && result.applications.length > 0) {
        setApplications(result.applications);
      } else {
        setApplications(fallbackApplications);
      }
    } catch (err) {
      console.log("Failed to load applications", err);
      setApplications(fallbackApplications);
    }
  }

  return (
    <div className="page-container">
      <h1>My Applications</h1>
      <p className="page-subtitle">
        Track your adoption requests and their status.
      </p>

      <div className="applications-list">
        {applications.map((app) => (
          <div key={app.id} className="application-card">
            <div className="application-left">
              <h3>{app.dog}</h3>
              <p>{app.breed}</p>
              <p className="application-shelter">{app.shelter}</p>
            </div>

            <div className="application-right">
              <span className={`status-badge ${getStatusClass(app.status)}`}>
                {app.status}
              </span>
              <p className="application-date">{app.date}</p>
              <button className="primary-btn">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusClass(status) {
  if (status === "Pending") return "pending";
  if (status === "In Review") return "review";
  if (status === "Approved") return "approved";
  return "";
}