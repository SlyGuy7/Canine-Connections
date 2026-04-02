import React, { useState, useEffect } from "react";
import { sendMessage } from "../services/messaging";

export default function Shelters() {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShelters();
  }, []);

  async function loadShelters() {
    const fallbackShelters = [
      { id: 1, name: "Newark Paws Rescue", location: "Newark, NJ", dogs: 12, contact: "contact@newarkpaws.org" },
      { id: 2, name: "Garden State Society", location: "Jersey City, NJ", dogs: 8, contact: "info@gss.org" },
      { id: 3, name: "Liberty Humane Network", location: "Hoboken, NJ", dogs: 15, contact: "adopt@libertyhumane.org" }
    ];

    try {
      const result = await sendMessage("request.shelters.get", {});
      if (result.success && result.shelters?.length > 0) {
        setShelters(result.shelters);
      } else {
        setShelters(fallbackShelters);
      }
    } catch (err) {
      setShelters(fallbackShelters);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-content">
      <header className="content-header">
        <h1>Verified Shelter Partners</h1>
        <p className="page-subtitle">We only work with licensed organizations to ensure safe adoptions.</p>
      </header>

      {loading ? (
        <p className="page-subtitle">Loading partners...</p>
      ) : (
        <div className="dog-grid">
          {shelters.map((shelter) => (
            <div key={shelter.id} className="dog-card">
              <div style={{ height: '140px', background: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '48px' }}>🏠</span>
              </div>
              <div className="dog-card-content">
                <h3>{shelter.name}</h3>
                <p className="page-subtitle">📍 {shelter.location}</p>
                <p className="page-subtitle">🐕 {shelter.dogs} Dogs Available</p>
                
                <div className="dog-card-footer">
                  <a href={`mailto:${shelter.contact}`} className="btn btn-outline" style={{ flex: 1, textDecoration: 'none' }}>
                    Contact
                  </a>
                  <button className="btn btn-primary" style={{ flex: 1 }}>
                    View Listings
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}