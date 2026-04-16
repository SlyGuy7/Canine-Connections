import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function Shelters() {
  const navigate = useNavigate();
  const [shelters, setShelters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShelters();
  }, []);

  function loadShelters() {
    // Mock data for shelters until your backend is ready
    const mockShelters = [
    { id: 1, name: "Happy Paws Rescue", location: "Newark, NJ", phone: "(973) 123-4567" },
    { id: 2, name: "Safe Haven Shelter", location: "Jersey City, NJ", phone: "(201) 987-6543" },
    { id: 3, name: "Second Chance Hounds", location: "Elizabeth, NJ", phone: "(908) 456-7890" },
    { id: 4, name: "Forever Friends Network", location: "Montclair, NJ", phone: "(973) 222-3333" },
    { id: 5, name: "Paws & Hearts Rescue", location: "Morristown, NJ", phone: "(973) 444-5555" },
    { id: 6, name: "Sunny Days Sanctuary", location: "Hoboken, NJ", phone: "(201) 666-7777" }
  ];
    
    setShelters(mockShelters);
    setLoading(false);
  }

  const filteredShelters = shelters.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="page-container">
        <header className="content-header" style={{ marginBottom: "30px" }}>
          <h1>Partner Shelters</h1>
          <p className="dashboard-subtitle">Connect with local rescues and shelters in our network.</p>
        </header>

        <section className="filter-container" style={{ marginBottom: "40px" }}>
          <input
            className="form-input"
            style={{ padding: "15px", borderRadius: "12px", border: "1px solid #dcc8b7", fontSize: "16px", width: "100%", maxWidth: "500px" }}
            placeholder="Search by shelter name or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </section>

        {loading ? (
          <div style={{ color: "#6f5848", fontSize: "18px" }}>Loading shelters...</div>
        ) : (
          <div className="dog-grid">
            {filteredShelters.map((shelter) => (
              <div 
                key={shelter.id} 
                className="dog-card" 
                style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #efdfd1" }}
              >
                <div style={{ height: "160px", background: "#e8f3f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "64px" }}>🏡</span>
                </div>
                
                <div className="dog-card-content" style={{ padding: "20px" }}>
                  <h3 style={{ margin: "0 0 15px 0", color: "#2f241d" }}>{shelter.name}</h3>
                  <p style={{ margin: "8px 0", color: "#6f5848", fontSize: "15px" }}>
                    <strong>📍 Location:</strong> {shelter.location}
                  </p>
                  <p style={{ margin: "8px 0", color: "#6f5848", fontSize: "15px" }}>
                    <strong>📞 Phone:</strong> {shelter.phone}
                  </p>
                  <p style={{ margin: "8px 0", color: "#6f5848", fontSize: "15px" }}>
                    <strong>🐶 Available:</strong> {shelter.dogsAvailable} dogs
                  </p>

                  <div style={{ marginTop: "25px" }}>
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%" }}
                      onClick={() => navigate("/browse-dogs")}
                    >
                      View Available Dogs
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}