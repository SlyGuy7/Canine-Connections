import React from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ShelterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="dashboard-content">
      <button className="btn btn-secondary" onClick={() => navigate("/shelters")}>
        ← Back to Shelters
      </button>
      <h1>Shelter Details for ID: {id}</h1>
      <p>This page is under construction.</p>
    </div>
  );
}